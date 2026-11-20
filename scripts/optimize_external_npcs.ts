import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  metalRough,
  prune,
  quantize,
  resample,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

export interface NpcOptimizeJob {
  fileName: string;
  url: string;
  targetMaxTris: number;
  textureMaxSize?: number;
  stripRootXZ?: boolean;
  /** Keep only standard locomotion/idle clips when a model ships 15+ game combat/death clips */
  keepClipNames?: string[];
}

export const EXTERNAL_NPC_JOBS: NpcOptimizeJob[] = [
  {
    fileName: 'standing_idle_1.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/standing_idle_1.glb',
    targetMaxTris: 9000,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npc1.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc1.glb',
    targetMaxTris: 7000,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npc2.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc2.glb',
    targetMaxTris: 7000,
    textureMaxSize: 512,
    stripRootXZ: true,
    keepClipNames: ['Alert', 'Sitting_Answering_Questions', 'Talk_with_Hands_Open', 'Walking', 'Running'],
  },
  {
    fileName: 'npc3.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc3.glb',
    targetMaxTris: 6500,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    // Child NPC 1 (school students + outside pedestrians)
    fileName: 'npc4.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc4.glb',
    targetMaxTris: 6000,
    textureMaxSize: 256,
    stripRootXZ: true,
  },
  {
    fileName: 'npc5.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc5.glb',
    targetMaxTris: 7500,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npcc6.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npcc6.glb',
    targetMaxTris: 7000,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npc7.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc7.glb',
    targetMaxTris: 6000,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npc8.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc8.glb',
    targetMaxTris: 6000,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npc9.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc9.glb',
    targetMaxTris: 7000,
    textureMaxSize: 256,
    stripRootXZ: true,
  },
  {
    // Child NPC 2 (school students + outside pedestrians)
    fileName: 'npc10.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc10.glb',
    targetMaxTris: 6500,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npc11.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc11.glb',
    targetMaxTris: 6500,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npc12.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc12.glb',
    targetMaxTris: 7000,
    textureMaxSize: 512,
    stripRootXZ: true,
  },
  {
    fileName: 'npc13.glb',
    url: 'https://github.com/phuctranduy2/my-3d-models/raw/refs/heads/main/npc13.glb',
    targetMaxTris: 5500,
    textureMaxSize: 256,
    stripRootXZ: true,
    keepClipNames: ['Idle', 'Walking', 'Running', 'Sitting_Idle'],
  },
];

function resolveRawUrl(url: string): string {
  const ghMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:raw|blob)\/(?:refs\/(?:heads|tags)\/)?([^/]+)\/(.+)$/
  );
  if (ghMatch) {
    const [, owner, repo, branch, filePath] = ghMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  }
  return url;
}

function downloadBuffer(url: string): Promise<Buffer> {
  const resolved = resolveRawUrl(url);
  return new Promise((resolve, reject) => {
    https
      .get(resolved, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${resolved}`));
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

function countDocTris(doc: ReturnType<NodeIO['readBinary']> extends Promise<infer T> ? T : never): number {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (idx) {
        tris += Math.round(idx.getCount() / 3);
      } else {
        const pos = prim.getAttribute('POSITION');
        if (pos) tris += Math.round(pos.getCount() / 3);
      }
    }
  }
  return tris;
}

async function run() {
  await MeshoptSimplifier.ready;
  const outDir = path.resolve(process.cwd(), 'public/models/npcs');
  fs.mkdirSync(outDir, { recursive: true });
  const forceRemote = process.argv.includes('--remote');

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

  for (const job of EXTERNAL_NPC_JOBS) {
    const outPath = path.join(outDir, job.fileName);
    const rawBuf =
      !forceRemote && fs.existsSync(outPath)
        ? fs.readFileSync(outPath)
        : await downloadBuffer(job.url);
    const rawMb = rawBuf.length / (1024 * 1024);

    const doc = await io.readBinary(new Uint8Array(rawBuf));
    const beforeTris = countDocTris(doc);

    // 1. Convert deprecated KHR_materials_pbrSpecularGlossiness -> standard pbrMetallicRoughness
    await doc.transform(metalRough());

    // 2. Filter out combat/death clips if requested
    if (job.keepClipNames) {
      const allow = new Set(job.keepClipNames.map((n) => n.toLowerCase()));
      for (const anim of doc.getRoot().listAnimations()) {
        if (!allow.has(anim.getName().toLowerCase())) {
          anim.dispose();
        }
      }
    }

    // 3. Strip horizontal XZ root motion from hips/root channels so NPCs walk cleanly in-place
    if (job.stripRootXZ) {
      for (const anim of doc.getRoot().listAnimations()) {
        for (const ch of anim.listChannels()) {
          if (ch.getTargetPath() !== 'translation') continue;
          const tNode = ch.getTargetNode();
          const tName = (tNode?.getName() || '').toLowerCase();
          if (!tName.includes('hip') && !tName.includes('root')) continue;
          const sampler = ch.getSampler();
          const outAcc = sampler?.getOutput();
          if (!outAcc) continue;
          const count = outAcc.getCount();
          if (count < 2) continue;
          const first = [0, 0, 0];
          outAcc.getElement(0, first);
          const cur = [0, 0, 0];
          for (let i = 0; i < count; i++) {
            outAcc.getElement(i, cur);
            cur[0] = first[0];
            cur[2] = first[2];
            outAcc.setElement(i, cur);
          }
        }
      }
    }

    // 4. Weld + simplify dense meshes to crowd-safe triangle count while preserving skinning/UVs
    if (beforeTris > job.targetMaxTris) {
      const ratio = Math.max(0.08, Math.min(0.92, job.targetMaxTris / beforeTris));
      await doc.transform(
        weld(),
        simplify({
          simplifier: MeshoptSimplifier,
          ratio,
          error: 0.018,
          lockBorder: false,
        })
      );
    }

    // 5. Compress textures to compact WebP, resample redundant animation keyframes, quantize buffers
    const texDim = job.textureMaxSize ?? 512;
    await doc.transform(
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        resize: [texDim, texDim],
        quality: 76,
      }),
      resample({ tolerance: 0.004 }),
      quantize(),
      dedup(),
      prune()
    );

    const outBytes = await io.writeBinary(doc);
    fs.writeFileSync(outPath, outBytes);
    const afterTris = countDocTris(doc);
    const afterMb = outBytes.byteLength / (1024 * 1024);
    console.log(
      `${job.fileName.padEnd(20)} | ${rawMb.toFixed(2)} MB -> ${afterMb.toFixed(2)} MB | tris: ${beforeTris} -> ${afterTris}`
    );
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
