import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, resample } from '@gltf-transform/functions';

export const QUATERNIUS_MODELS = [
  'Casual_Male.glb',
  'Casual_Female.glb',
  'Casual2_Male.glb',
  'Casual2_Female.glb',
  'Casual3_Male.glb',
  'Casual_Bald.glb',
  'Suit_Male.glb',
  'Suit_Female.glb',
  'OldClassy_Male.glb',
  'OldClassy_Female.glb',
  'Doctor_Male_Young.glb',
  'Doctor_Female_Young.glb',
  'Worker_Male.glb',
  'Worker_Female.glb',
] as const;

const BASE_RAW_URL = 'https://raw.githubusercontent.com/Yametech12/ghostname-3d-assets/main/models/';

// Keep only locomotion/idle/sit clips needed by city, shop, school, and hospital NPCs
const KEEP_CLIPS = new Set(['idle', 'walk', 'sitdown']);

function hexToLinearRgba(hex: number): [number, number, number, number] {
  const srgb = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = srgb(((hex >> 16) & 0xff) / 255);
  const g = srgb(((hex >> 8) & 0xff) / 255);
  const b = srgb((hex & 0xff) / 255);
  return [r, g, b, 1.0];
}

// Yametech12/ghostname-3d-assets darkened original Quaternius colors (Skin=#030303, Face=#fffff0, etc.).
// Restore bright, clean Quaternius civilian/profession material colors directly in the bundled GLBs.
const MODEL_DEFAULT_COLORS: Record<string, Record<string, { hex: number; roughness: number }>> = {
  _common: {
    Skin: { hex: 0xf2c5a0, roughness: 0.72 },
    Face: { hex: 0x1c1917, roughness: 0.65 },
    Belt: { hex: 0x2d1f16, roughness: 0.56 },
    Hair: { hex: 0x261810, roughness: 0.86 },
  },
  'Casual_Male.glb': {
    Shirt: { hex: 0x2563eb, roughness: 0.82 },
    Pants: { hex: 0x1e293b, roughness: 0.86 },
    Hair: { hex: 0x241710, roughness: 0.86 },
  },
  'Casual_Female.glb': {
    Shirt: { hex: 0xe11d48, roughness: 0.82 },
    Pants: { hex: 0x334155, roughness: 0.86 },
    Hair: { hex: 0x2e1a12, roughness: 0.85 },
  },
  'Casual2_Male.glb': {
    Shirt: { hex: 0x0d9488, roughness: 0.82 },
    Pants: { hex: 0x27272a, roughness: 0.86 },
    Hair: { hex: 0x452b15, roughness: 0.86 },
  },
  'Casual2_Female.glb': {
    Shirt: { hex: 0x7c3aed, roughness: 0.82 },
    Pants: { hex: 0x1e293b, roughness: 0.86 },
    Hair: { hex: 0x3d1c14, roughness: 0.85 },
  },
  'Casual3_Male.glb': {
    Shirt: { hex: 0xea580c, roughness: 0.82 },
    Pants: { hex: 0x1e3a5f, roughness: 0.86 },
    Hair: { hex: 0x1c1917, roughness: 0.86 },
  },
  'Casual_Bald.glb': {
    Shirt: { hex: 0x0284c7, roughness: 0.82 },
    Pants: { hex: 0x334155, roughness: 0.86 },
  },
  'Suit_Male.glb': {
    Black: { hex: 0x1e293b, roughness: 0.78 },
    Shirt: { hex: 0xf8fafc, roughness: 0.80 },
    Details: { hex: 0xb91c1c, roughness: 0.68 },
    Hair: { hex: 0x291a10, roughness: 0.84 },
  },
  'Suit_Female.glb': {
    Black: { hex: 0x1e293b, roughness: 0.78 },
    Shirt: { hex: 0xf8fafc, roughness: 0.80 },
    Details: { hex: 0xbe123c, roughness: 0.68 },
    Hair: { hex: 0x1c140f, roughness: 0.84 },
  },
  'OldClassy_Male.glb': {
    Shirt: { hex: 0xd6d3d1, roughness: 0.82 },
    Pants: { hex: 0x334155, roughness: 0.85 },
    Detail: { hex: 0x7c2d12, roughness: 0.75 },
    Hat: { hex: 0x1c1917, roughness: 0.72 },
    Hair: { hex: 0xcbd5e1, roughness: 0.86 },
  },
  'OldClassy_Female.glb': {
    Shirt: { hex: 0xe7e5e4, roughness: 0.82 },
    Pants: { hex: 0x475569, roughness: 0.85 },
    Detail: { hex: 0x881337, roughness: 0.75 },
    Hat: { hex: 0x292524, roughness: 0.72 },
    Hair: { hex: 0xdbe2ea, roughness: 0.86 },
  },
  'Doctor_Male_Young.glb': {
    Main: { hex: 0xf8fafc, roughness: 0.80 },
    Black: { hex: 0x0f766e, roughness: 0.84 },
    Brown: { hex: 0x3f2e21, roughness: 0.58 },
    Hair: { hex: 0x291a10, roughness: 0.85 },
  },
  'Doctor_Female_Young.glb': {
    Main: { hex: 0xf8fafc, roughness: 0.80 },
    Black: { hex: 0x0d9488, roughness: 0.84 },
    Brown: { hex: 0x3f2e21, roughness: 0.58 },
    Hair: { hex: 0x3d2214, roughness: 0.85 },
  },
  'Worker_Male.glb': {
    Shirt: { hex: 0x2563eb, roughness: 0.82 },
    Vest: { hex: 0xf97316, roughness: 0.78 },
    Pants: { hex: 0x1e293b, roughness: 0.86 },
    Hat: { hex: 0xfacc15, roughness: 0.45 },
  },
  'Worker_Female.glb': {
    Shirt: { hex: 0x2563eb, roughness: 0.82 },
    Vest: { hex: 0xf97316, roughness: 0.78 },
    Pants: { hex: 0x1e293b, roughness: 0.86 },
    Hat: { hex: 0xfacc15, roughness: 0.45 },
    Hair: { hex: 0x2e1a12, roughness: 0.85 },
  },
};

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function countDocTris(doc: Awaited<ReturnType<NodeIO['readBinary']>>): number {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (idx) tris += Math.round(idx.getCount() / 3);
      else {
        const pos = prim.getAttribute('POSITION');
        if (pos) tris += Math.round(pos.getCount() / 3);
      }
    }
  }
  return tris;
}

async function run() {
  const outDir = path.resolve(process.cwd(), 'public/models/quaternius');
  fs.mkdirSync(outDir, { recursive: true });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

  const forceRemote = process.argv.includes('--remote');

  for (const fileName of QUATERNIUS_MODELS) {
    const outPath = path.join(outDir, fileName);
    const rawBuf =
      !forceRemote && fs.existsSync(outPath)
        ? fs.readFileSync(outPath)
        : await downloadBuffer(`${BASE_RAW_URL}${fileName}`);
    const rawKb = rawBuf.length / 1024;

    const doc = await io.readBinary(new Uint8Array(rawBuf));
    const tris = countDocTris(doc);

    // 1. Restore bright, clean Quaternius material colors & PBR roughness
    const modelColors = MODEL_DEFAULT_COLORS[fileName] ?? {};
    const commonColors = MODEL_DEFAULT_COLORS._common;
    for (const mat of doc.getRoot().listMaterials()) {
      const mName = mat.getName();
      const spec = modelColors[mName] ?? commonColors[mName];
      if (spec) {
        mat.setBaseColorFactor(hexToLinearRgba(spec.hex));
        mat.setRoughnessFactor(spec.roughness);
        mat.setMetallicFactor(0.02);
      }
    }

    // 2. Strip combat/death/unused clips to shrink file size ~75% while keeping smooth locomotion & sitting
    for (const anim of doc.getRoot().listAnimations()) {
      if (!KEEP_CLIPS.has(anim.getName().toLowerCase())) {
        anim.dispose();
      }
    }

    // 3. Ensure Walk has zero horizontal XZ root drift
    for (const anim of doc.getRoot().listAnimations()) {
      const aName = anim.getName().toLowerCase();
      if (!aName.includes('walk')) continue;
      for (const ch of anim.listChannels()) {
        if (ch.getTargetPath() !== 'translation') continue;
        const tName = (ch.getTargetNode()?.getName() || '').toLowerCase();
        if (!tName.includes('hip') && !tName.includes('root') && !tName.includes('pelvis')) continue;
        const outAcc = ch.getSampler()?.getOutput();
        if (!outAcc || outAcc.getCount() < 2) continue;
        const first = [0, 0, 0];
        outAcc.getElement(0, first);
        const cur = [0, 0, 0];
        for (let i = 0; i < outAcc.getCount(); i++) {
          outAcc.getElement(i, cur);
          cur[0] = first[0];
          cur[2] = first[2];
          outAcc.setElement(i, cur);
        }
      }
    }

    await doc.transform(
      prune(),
      resample({ tolerance: 0.006 }),
      quantize(),
      dedup(),
      prune()
    );

    const outBytes = await io.writeBinary(doc);
    fs.writeFileSync(outPath, outBytes);
    const afterKb = outBytes.byteLength / 1024;
    const keptClips = doc.getRoot().listAnimations().map((a) => a.getName());
    console.log(
      `${fileName.padEnd(24)} | ${rawKb.toFixed(0)} KB -> ${afterKb.toFixed(0)} KB | tris=${tris} | clips=[${keptClips.join(',')}]`
    );
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
