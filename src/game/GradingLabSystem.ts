import * as THREE from 'three';
import {
  DailyMarketTrend,
  GradedSlab,
  ONEPIECE_CARDS_DB,
  POKEMON_CARDS_DB,
  PokemonCard,
  SlabAuctionLot,
  SlabGuardColor,
} from './pokemonShopLogic';
import { createShowcaseCardTexture } from './ShopSceneTextures';

export interface GradingLabCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floor: 1 | 2 | 'both';
}

export const GRADING_LAB_EXTRA_COLLIDERS: GradingLabCollider[] = [
  // Center lobby velvet stanchions (leaves 3.3m wide center lane X=19.35..22.65 straight into Auction Hall)
  { minX: 18.95, maxX: 19.35, minZ: 12.1, maxZ: 13.4, floor: 1 },
  { minX: 22.65, maxX: 23.05, minZ: 12.1, maxZ: 13.4, floor: 1 },
  // Front-West Reception Desk (leaves center & east aisle X=18.7..27.0 completely open)
  { minX: 15.0, maxX: 18.6, minZ: 10.2, maxZ: 11.2, floor: 1 },
  // Front-East VIP Client Waiting Sofa, Coffee Table & Corner Planter
  { minX: 23.75, maxX: 28.25, minZ: 13.95, maxZ: 15.05, floor: 1 },
  // Front-West Lobby Planter
  { minX: 14.7, maxX: 15.5, minZ: 14.1, maxZ: 14.9, floor: 1 },
  // Auction Hall West & East Dynamic Hall of Grails Wall Showcases (Z: 1.0..7.4)
  { minX: 13.2, maxX: 14.3, minZ: 1.0, maxZ: 7.4, floor: 1 },
  { minX: 27.7, maxX: 28.8, minZ: 1.0, maxZ: 7.4, floor: 1 },
  // VIP Whale Bidder Seating Wings inside Auction Hall (leaves center aisle X=18.3..23.7 open)
  { minX: 15.5, maxX: 18.3, minZ: -4.4, maxZ: -0.2, floor: 1 },
  { minX: 23.7, maxX: 26.5, minZ: -4.4, maxZ: -0.2, floor: 1 },
  // Raised Auction Stage & Stage Backdrop Divider (leaves 2.1m West & East Corridors X=13.5..15.6 & X=26.4..28.5 open to Rear Grading Lab!)
  { minX: 15.6, maxX: 26.4, minZ: -18.2, maxZ: -8.0, floor: 1 },
  // Private Back Grading Lab: 4 Cleanroom Specialist Desks Row (Z: -24.7..-23.6)
  { minX: 14.5, maxX: 25.4, minZ: -24.7, maxZ: -23.6, floor: 1 },
  // Private Back Grading Lab: NE Ultrasonic Encapsulator & Pop Report Terminal (World X=26.7, Z=-26.7)
  { minX: 25.8, maxX: 27.6, minZ: -27.2, maxZ: -26.1, floor: 1 },
];

export interface GradingSpecialistHandle {
  group: THREE.Group;
  head: THREE.Object3D;
  rightArm: THREE.Object3D;
  padMat: THREE.MeshStandardMaterial;
  laserSweep: THREE.Mesh;
  laserSweepBaseZ: number;
  welderLedMat: THREE.MeshStandardMaterial;
}

export interface GradingVisitorHandle {
  group: THREE.Group;
  head: THREE.Object3D;
  baseY: number;
  phase: number;
}

export interface GradingAuctionBidderHandle {
  group: THREE.Group;
  head: THREE.Object3D;
  rightArm: THREE.Object3D;
  baseY: number;
  phase: number;
}

export interface GradingLabStructureResult {
  r1Group: THREE.Group;
  exteriorPropsGroup: THREE.Group;
  gradingDoorLeft: THREE.Mesh;
  gradingDoorRight: THREE.Mesh;
  gradingLockBarrierGroup: THREE.Group;
  receptionistNpcGroup: THREE.Group;
  receptionistHead: THREE.Object3D;
  receptionistArm: THREE.Object3D;
  specialistNpcGroups: GradingSpecialistHandle[];
  visitorNpcs: GradingVisitorHandle[];
  encapsulationDrum: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  pointLight: THREE.PointLight;
  extraLights: THREE.PointLight[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
  auctioneerNpcGroup: THREE.Group;
  auctioneerHead: THREE.Object3D;
  auctioneerRightArm: THREE.Object3D;
  auctionHostNpcGroup: THREE.Group;
  auctionHostHead: THREE.Object3D;
  auctionHostRightArm: THREE.Object3D;
  auctionBidderNpcs: GradingAuctionBidderHandle[];
  auctionTurntables: THREE.Group[];
  updateAuctionBoard: (
    lot: SlabAuctionLot | null,
    trend?: DailyMarketTrend,
    scheduleStatus?: {
      isOpen: boolean;
      isPrimeTime: boolean;
      auctioneerHired: boolean;
      auctionHostHired?: boolean;
    }
  ) => void;
  updateShowroomGrailTextures: (
    entries: Array<{ card: PokemonCard; slab: GradedSlab }>
  ) => void;
}

export interface CreateGradingLabOptions {
  hiredReceptionist: boolean;
  hiredSpecialistsCount: number;
  createSignTex: (
    mainText: string,
    subText: string,
    bgColor: string,
    textColor: string,
    subColor: string,
    accentBorder?: string
  ) => THREE.CanvasTexture;
  createCharacterFaceTexture: (mood: 'happy' | 'neutral' | 'excited', skinHex: string) => THREE.Texture;
  createCharacterHeadMesh: (
    skinMat: THREE.MeshStandardMaterial,
    faceTex: THREE.Texture,
    w: number,
    h: number,
    d: number
  ) => THREE.Mesh;
}

function makeCanvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat?: [number, number]
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

function createGradingLabFacadeSignTex(): THREE.CanvasTexture {
  return makeCanvasTex(2048, 512, (ctx, w, h) => {
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#060912');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#060912');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 3;
    for (let x = -h; x < w + h; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    // Left PSA Crest Badge
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(68, 92, 232, 328);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.strokeRect(68, 92, 232, 328);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(88, 114, 192, 140);
    ctx.fillStyle = '#dc2626';
    ctx.font = '900 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PSA', 184, 184);
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 30px sans-serif';
    ctx.fillText('GEM MT 10', 184, 312);
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('8-DIGIT CERT', 184, 368);

    // Right BGS Black Label + CGC Gold Crest Badge
    ctx.fillStyle = '#09090b';
    ctx.fillRect(w - 300, 92, 232, 328);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.strokeRect(w - 300, 92, 232, 328);
    const goldGrad = ctx.createLinearGradient(w - 280, 114, w - 88, 254);
    goldGrad.addColorStop(0, '#fde047');
    goldGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = goldGrad;
    ctx.fillRect(w - 280, 114, 192, 140);
    ctx.fillStyle = '#09090b';
    ctx.font = '900 62px sans-serif';
    ctx.fillText('BGS', w - 184, 184);
    ctx.fillStyle = '#fde047';
    ctx.font = '900 26px sans-serif';
    ctx.fillText('BLACK LABEL 10', w - 184, 312);
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('CGC PRISTINE', w - 184, 368);

    // Center Hero Title (strictly bounded between X=325 and X=1723 so it never overlaps PSA/BGS crests)
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 66px sans-serif';
    ctx.fillText('PSA · CGC · BGS GRADING & AUCTION', w / 2, 186, 1340);

    const lineGrad = ctx.createLinearGradient(360, 0, w - 360, 0);
    lineGrad.addColorStop(0, 'rgba(239,68,68,0.85)');
    lineGrad.addColorStop(0.5, 'rgba(251,191,36,0.95)');
    lineGrad.addColorStop(1, 'rgba(56,189,248,0.85)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(370, 266, w - 740, 5);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('10x UV SCAN  •  BLACK LABEL 10  •  VIP AUCTION HOUSE', w / 2, 326, 1320);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 25px sans-serif';
    ctx.fillText('CRACK & RE-GRADE  •  SLAB GUARD  •  HALL OF GRAILS SHOWROOM', w / 2, 392, 1320);
  });
}

function createCleanroomFloorTex(): THREE.CanvasTexture {
  return makeCanvasTex(
    1024,
    1024,
    (ctx, w, h) => {
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(0, 0, w, h);

      const tileSize = 256;
      for (let y = 0; y < h; y += tileSize) {
        for (let x = 0; x < w; x += tileSize) {
          const alt = ((x / tileSize + y / tileSize) & 1) === 0;
          ctx.fillStyle = alt ? '#364152' : '#2f3a4a';
          ctx.fillRect(x + 3, y + 3, tileSize - 6, tileSize - 6);

          ctx.fillStyle = 'rgba(203, 213, 225, 0.08)';
          ctx.fillRect(x + 34, y + 48, 8, 8);
          ctx.fillRect(x + 148, y + 122, 6, 6);
          ctx.fillRect(x + 92, y + 206, 7, 7);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
          ctx.fillRect(x + 188, y + 66, 8, 8);
        }
      }
    },
    [4, 8]
  );
}

function createAuctionMarbleFloorTex(): THREE.CanvasTexture {
  return makeCanvasTex(
    1024,
    1024,
    (ctx, w, h) => {
      ctx.fillStyle = '#0c111d';
      ctx.fillRect(0, 0, w, h);

      const tileSize = 256;
      for (let y = 0; y < h; y += tileSize) {
        for (let x = 0; x < w; x += tileSize) {
          const alt = ((x / tileSize + y / tileSize) & 1) === 0;
          ctx.fillStyle = alt ? '#111827' : '#0b101b';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.16)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
        }
      }

      // Subtle marble gold veins
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.08)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 180 + 40);
        ctx.bezierCurveTo(320, i * 180 - 20, 680, i * 180 + 90, w, i * 180 + 10);
        ctx.stroke();
      }
    },
    [3, 5]
  );
}

function createSlateCladdingTex(): THREE.CanvasTexture {
  return makeCanvasTex(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      for (let y = 0; y < h; y += 128) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(8, 8, 240, 112);
      ctx.fillRect(264, 136, 240, 112);
    },
    [4, 4]
  );
}

function createWindowBannerTex(kind: 'LEFT' | 'RIGHT'): THREE.CanvasTexture {
  return makeCanvasTex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = kind === 'LEFT' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(9, 12, 20, 0.92)';
    ctx.fillRect(0, 0, w, h);
    const accent = kind === 'LEFT' ? '#ef4444' : '#fbbf24';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = accent;
    ctx.font = '900 60px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(kind === 'LEFT' ? 'PSA 10 & BGS BLACK 10' : 'CGC PRISTINE & ĐẤU GIÁ VIP', 42, 96);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(
      kind === 'LEFT'
        ? 'PSA x2.80  •  BGS BLACK LABEL x5.20  •  QUAD 10'
        : 'ĐI THẲNG VÀO SÀN ĐẤU GIÁ  •  PHÒNG LAB CUỐI NHÀ',
      42,
      178
    );
  });
}

function createLabBackWallPanelTex(): THREE.CanvasTexture {
  return makeCanvasTex(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 30px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('OPTICAL PROTOCOL // PSA • CGC • BGS BLACK LABEL', 38, 58);

    const rows = [
      { label: '01. CENTERING (TÂM THẺ)', spec: 'PSA 55/45  |  CGC & BGS BLACK 50/50 QUAD 10', color: '#38bdf8' },
      { label: '02. CORNERS (BỐN GÓC)', spec: 'UV 10x SHARPNESS  •  CRACK & RE-GRADE CROSSOVER', color: '#fbbf24' },
      { label: '03. EDGES (VIỀN CẠNH)', spec: 'LASER PROFILE  •  SLAB GUARD BUMPER PROTECTION', color: '#34d399' },
      { label: '04. SURFACE (BỀ MẶT FOIL)', spec: 'MICROFIBER UV PREP  •  VIP WHALE AUCTION FLOOR →', color: '#f472b6' },
    ];
    rows.forEach((r, idx) => {
      const y = 112 + idx * 94;
      ctx.fillStyle = '#111827';
      ctx.fillRect(38, y, w - 76, 76);
      ctx.fillStyle = r.color;
      ctx.fillRect(38, y, 8, 76);
      ctx.font = '900 24px sans-serif';
      ctx.fillText(r.label, 64, y + 30);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 19px monospace';
      ctx.fillText(r.spec, 64, y + 58);
    });
  });
}

function createVaultDoorTex(): THREE.CanvasTexture {
  return makeCanvasTex(512, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.5, '#334155');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(56, 48, w - 112, 92);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 42px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT 01', w / 2, 96);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('BLACK LABEL & GRAIL ARCHIVE', w / 2, 126);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(w / 2, 310, 96, 0, Math.PI * 2);
    ctx.stroke();

    for (let a = 0; a < 6; a++) {
      const ang = (a * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(w / 2, 310);
      ctx.lineTo(w / 2 + Math.cos(ang) * 92, 310 + Math.sin(ang) * 92);
      ctx.stroke();
    }
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(w / 2, 310, 26, 0, Math.PI * 2);
    ctx.fill();
  });
}

function createDeskMonitorTex(idx: number): THREE.CanvasTexture {
  return makeCanvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`STATION #0${idx + 1} // BGS-PSA-CGC LOUPE`, 20, 38);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 56, 175, 178);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 56, 175, 178);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.beginPath();
    ctx.moveTo(107, 66);
    ctx.lineTo(107, 224);
    ctx.moveTo(30, 145);
    ctx.lineTo(185, 145);
    ctx.stroke();

    const metrics = [
      `CTR: ${idx % 2 === 0 ? '10.0 (50/50)' : '9.5 (52/48)'}`,
      `CRN: ${idx === 1 ? '10.0' : '9.5'}`,
      `EDG: 10.0`,
      `SRF: ${idx % 2 === 0 ? '10.0' : '9.5'}`,
    ];
    metrics.forEach((m, mi) => {
      ctx.fillStyle = mi === 0 ? '#fde047' : '#e2e8f0';
      ctx.font = 'bold 21px monospace';
      ctx.fillText(m, 214, 92 + mi * 40);
    });
  });
}

function createTerminalHudTex(): THREE.CanvasTexture {
  return makeCanvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ULTRASONIC ENCAPSULATOR', w / 2, 46);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 19px monospace';
    ctx.fillText('PSA • CGC • BGS BLACK LABEL • [PRESS E]', w / 2, 90);

    ctx.fillStyle = '#111827';
    ctx.fillRect(26, 116, w - 52, 112);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PSA 10 x2.8 | CGC PRISTINE x3.4 | BGS BLACK x5.2', w / 2, 156);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('PHÒNG CHẤM ĐIỂM RIÊNG • KHO SLAB & CROSSOVER', w / 2, 200);
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawAuctionJumbotronCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lot: SlabAuctionLot | null,
  trend?: DailyMarketTrend,
  scheduleStatus?: {
    isOpen: boolean;
    isPrimeTime: boolean;
    auctioneerHired: boolean;
    auctionHostHired?: boolean;
  }
) {
  const isClosed = scheduleStatus ? !scheduleStatus.isOpen : false;
  const isPrime = scheduleStatus?.isPrimeTime ?? false;
  const auctioneerHired = scheduleStatus?.auctioneerHired ?? false;
  const hostHired = Boolean(scheduleStatus?.auctionHostHired);

  // Rich Obsidian Stage Backdrop Gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  if (lot) {
    bg.addColorStop(0, '#130812');
    bg.addColorStop(0.55, '#0a0f1d');
    bg.addColorStop(1, '#060811');
  } else if (isClosed) {
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(1, '#05070c');
  } else {
    bg.addColorStop(0, '#070b14');
    bg.addColorStop(0.5, '#0b1222');
    bg.addColorStop(1, '#050811');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle top spotlight radial wash
  const glow = ctx.createRadialGradient(w * 0.5, 0, 20, w * 0.5, h * 0.18, w * 0.62);
  glow.addColorStop(0, lot ? 'rgba(244, 63, 94, 0.16)' : isPrime ? 'rgba(251, 191, 36, 0.16)' : 'rgba(212, 175, 55, 0.12)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural LED micro-grid texture (very faint)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let gx = 48; gx < w; gx += 48) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 48; gy < h; gy += 48) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // Refined 1px Hairline Border & Corner Gold L-Brackets
  ctx.strokeStyle = lot ? 'rgba(251, 191, 36, 0.42)' : isClosed ? 'rgba(148, 163, 184, 0.28)' : 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  const bracketColor = lot ? '#fbbf24' : isClosed ? '#64748b' : '#d4af37';
  const bl = 38;
  ctx.strokeStyle = bracketColor;
  ctx.lineWidth = 5;
  // Top-left, Top-right, Bottom-left, Bottom-right
  [
    [20, 20, 1, 1],
    [w - 20, 20, -1, 1],
    [20, h - 20, 1, -1],
    [w - 20, h - 20, -1, -1],
  ].forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx * bl, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * bl);
    ctx.stroke();
  });

  // Top Header Strip (y: 44..136)
  drawRoundedRectPath(ctx, 56, 44, w - 112, 90, 14);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Left Gold Crest Pill
  drawRoundedRectPath(ctx, 76, 61, 140, 56, 10);
  ctx.fillStyle = lot ? '#9f1239' : isClosed ? '#334155' : 'rgba(212, 175, 55, 0.16)';
  ctx.fill();
  ctx.strokeStyle = lot ? '#fb7185' : isClosed ? '#64748b' : '#d4af37';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = lot ? '#ffe4e6' : isClosed ? '#cbd5e1' : '#fde68a';
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lot ? 'LIVE LOT' : isClosed ? 'CLOSED' : 'VIP HALL', 146, 89);

  // Header Brand Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 36px sans-serif';
  ctx.fillText(
    lot
      ? lot.isConsignment
        ? `KÝ GỬI NPC (${lot.consignorName || 'COLLECTOR'}) · HOA HỒNG ${Math.round((lot.commissionRate ?? 0.18) * 100)}%`
        : 'THẺ CỦA CỬA HÀNG (USER) · SÀN ĐẤU GIÁ GRAIL'
      : 'GRAND VIP AUCTION SHOWROOM · SÀN ĐẤU GIÁ GRAIL',
    240,
    89,
    w - 860
  );

  // Right Header Status / Trend Badge
  const badgeText = isPrime
    ? 'GIỜ VÀNG VIP · +15% TRẦN BID'
    : trend
    ? `${trend.badge} MARKET`
    : '09:00 – 22:00 DAILY';
  drawRoundedRectPath(ctx, w - 580, 61, 500, 56, 10);
  ctx.fillStyle = isPrime ? 'rgba(180, 83, 9, 0.35)' : 'rgba(6, 78, 59, 0.45)';
  ctx.fill();
  ctx.strokeStyle = isPrime ? '#fbbf24' : '#34d399';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = isPrime ? '#fde68a' : '#6ee7b7';
  ctx.font = '800 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, w - 330, 89, 470);

  ctx.textAlign = 'left';

  // ================= IDLE / STANDBY MODE =================
  if (!lot) {
    // Left Hero Copy (x: 68..1260)
    const headline = isClosed
      ? 'SÀN ĐẤU GIÁ TẠM NGHỈ CA ĐÊM'
      : !auctioneerHired && hostHired
      ? 'MC VIP SẴN SÀNG · CHỜ CHỦ TỌA'
      : !auctioneerHired
      ? 'SHOWROOM ĐẤU GIÁ ĐÃ MỞ CỬA'
      : hostHired
      ? 'CHỦ TỌA & MC VIP SẴN SÀNG KHAI SÀN'
      : 'SÀN ĐẤU GIÁ SIÊU THẺ ĐANG HOẠT ĐỘNG';

    ctx.fillStyle = isClosed ? '#cbd5e1' : '#ffffff';
    ctx.font = '900 54px sans-serif';
    ctx.fillText(headline, 68, 224, 1210);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 28px sans-serif';
    ctx.fillText(
      isClosed
        ? 'Giờ mở sàn hằng ngày 09:00 – 22:00 · Giờ Vàng Whale 18:00 – 22:00 (+15% trần giá)'
        : !auctioneerHired
        ? 'Bấm [E] tại Bục Vàng để thuê Chủ Tọa, đưa Slab lên sàn & mở Lô Ký Gửi VIP ăn 18% hoa hồng.'
        : 'Bấm [E] trước Bục Vàng để chọn Slab trong kho hoặc mở Lô Ký Gửi VIP ngay!',
      68,
      292,
      1210
    );

    // Right Staff Readiness Panel (x: 1320..w-68)
    const staffPanelX = 1330;
    const staffPanelW = w - staffPanelX - 68;
    const staffRows = [
      {
        label: 'CHỦ TỌA BỤC VÀNG',
        status: auctioneerHired ? (isClosed ? 'TAN CA' : 'TRỰC BỤC · +10%') : 'CHƯA THUÊ',
        active: auctioneerHired && !isClosed,
      },
      {
        label: 'MC KÉO KHÁCH VIP',
        status: hostHired ? (isClosed ? 'TAN CA' : 'SÂN KHẤU · +12%') : 'CHƯA THUÊ',
        active: hostHired && !isClosed,
      },
    ];

    staffRows.forEach((row, idx) => {
      const ry = 176 + idx * 82;
      drawRoundedRectPath(ctx, staffPanelX, ry, staffPanelW, 68, 12);
      ctx.fillStyle = row.active ? 'rgba(6, 78, 59, 0.35)' : 'rgba(15, 23, 42, 0.85)';
      ctx.fill();
      ctx.strokeStyle = row.active ? 'rgba(52, 211, 153, 0.55)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 20px sans-serif';
      ctx.fillText(row.label, staffPanelX + 22, ry + 34, 290);

      ctx.textAlign = 'right';
      ctx.fillStyle = row.active ? '#34d399' : '#94a3b8';
      ctx.font = '900 22px sans-serif';
      ctx.fillText(row.status, staffPanelX + staffPanelW - 22, ry + 34, 270);
      ctx.textAlign = 'left';
    });

    // Market Trend Spotlight Card (y: 374..568)
    if (trend) {
      drawRoundedRectPath(ctx, 68, 376, w - 136, 178, 16);
      ctx.fillStyle = 'rgba(13, 19, 34, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Left gold accent bar
      drawRoundedRectPath(ctx, 68, 376, 10, 178, 5);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '800 22px sans-serif';
      ctx.fillText('XU HƯỚNG THỊ TRƯỜNG HÔM NAY', 106, 418);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px sans-serif';
      ctx.fillText(trend.title.toUpperCase(), 106, 468, w - 220);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 26px sans-serif';
      ctx.fillText(trend.description, 106, 518, w - 220);
    }

    // Bottom 3-Column KPI Strip (y: 590..726)
    const kpis = [
      { k: 'GIỜ MỞ CỬA SÀN', v: '09:00 – 22:00', color: '#e2e8f0' },
      { k: 'GIỜ VÀNG ĐẠI GIA VIP', v: '18:00 – 22:00 (+15%)', color: '#fbbf24' },
      { k: 'HOA HỒNG KÝ GỬI', v: '18% MỖI PHIÊN', color: '#34d399' },
    ];
    const cardGap = 24;
    const cardW = (w - 136 - cardGap * 2) / 3;
    kpis.forEach((kpi, idx) => {
      const kx = 68 + idx * (cardW + cardGap);
      drawRoundedRectPath(ctx, kx, 588, cardW, 134, 14);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 20px sans-serif';
      ctx.fillText(kpi.k, kx + 28, 628);

      ctx.fillStyle = kpi.color;
      ctx.font = '900 34px sans-serif';
      ctx.fillText(kpi.v, kx + 28, 678, cardW - 56);
    });
    return;
  }

  // ================= LIVE AUCTION MODE =================
  const slab = lot.entry.slab;
  const secLeft = Math.max(0, Math.ceil(lot.remainingMs / 1000));
  const isBlackLabel = slab.company === 'BGS' && slab.gradeLabel.includes('BLACK LABEL');
  const reserveMet = lot.bidCount > 0 && lot.currentBid >= lot.reservePrice;
  const progressPct = Math.min(1, Math.max(0.04, lot.currentBid / Math.max(1, lot.maxCeilingBid)));

  // Card Title & Cert Header
  ctx.fillStyle = isBlackLabel ? '#fde68a' : '#ffffff';
  ctx.font = '900 60px sans-serif';
  ctx.fillText(lot.entry.card.name.toUpperCase(), 68, 214, w - 136);

  ctx.fillStyle = isBlackLabel ? '#fbbf24' : '#38bdf8';
  ctx.font = '800 32px sans-serif';
  ctx.fillText(
    `${slab.company} ${slab.gradeLabel}  ·  CERT #${slab.certNumber}${slab.isCertFancy ? '  ★ FANCY CERT' : ''}`,
    68,
    274,
    w - 136
  );

  // Left: Current Bid Panel
  drawRoundedRectPath(ctx, 68, 326, 1140, 256, 18);
  ctx.fillStyle = 'rgba(9, 20, 34, 0.92)';
  ctx.fill();
  ctx.strokeStyle = reserveMet ? 'rgba(52, 211, 153, 0.65)' : 'rgba(251, 191, 36, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = reserveMet ? '#6ee7b7' : '#fcd34d';
  ctx.font = '800 26px sans-serif';
  ctx.fillText(
    lot.bidCount > 0 ? 'GIÁ TRẢ CAO NHẤT HIỆN TẠI (CURRENT BID)' : 'GIÁ MỞ BÁT (STARTING BID)',
    108,
    376
  );

  ctx.fillStyle = '#4ade80';
  ctx.font = '900 108px sans-serif';
  ctx.fillText(`$${lot.currentBid.toLocaleString()}`, 108, 466, 1060);

  // Bid Progress Track
  drawRoundedRectPath(ctx, 108, 534, 1060, 18, 9);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();
  drawRoundedRectPath(ctx, 108, 534, Math.max(24, Math.round(1060 * progressPct)), 18, 9);
  const barGrad = ctx.createLinearGradient(108, 0, 1168, 0);
  barGrad.addColorStop(0, '#fbbf24');
  barGrad.addColorStop(1, '#34d399');
  ctx.fillStyle = barGrad;
  ctx.fill();

  // Right: Countdown & Bids Panel
  const rightX = 1240;
  const rightW = w - rightX - 68;
  drawRoundedRectPath(ctx, rightX, 326, rightW, 256, 18);
  ctx.fillStyle = 'rgba(17, 24, 39, 0.92)';
  ctx.fill();
  ctx.strokeStyle = secLeft <= 8 && lot.status === 'live' ? 'rgba(244, 63, 94, 0.8)' : 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#fcd34d';
  ctx.font = '800 24px sans-serif';
  ctx.fillText('THỜI GIAN CÒN LẠI', rightX + 36, 376);

  ctx.fillStyle = secLeft <= 8 && lot.status === 'live' ? '#fb7185' : '#ffffff';
  ctx.font = '900 92px sans-serif';
  ctx.fillText(lot.status === 'ended' ? 'ENDED' : `${secLeft}s`, rightX + 36, 464);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 26px sans-serif';
  ctx.fillText(
    `${lot.bidCount} LƯỢT TRẢ  ·  SÀN $${lot.reservePrice.toLocaleString()}`,
    rightX + 36,
    540,
    rightW - 72
  );

  // Leading Bidder Footer Strip
  drawRoundedRectPath(ctx, 68, 616, w - 136, 108, 14);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.strokeStyle = lot.highestBidderName ? 'rgba(251, 191, 36, 0.45)' : 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = lot.highestBidderIsPlayer
    ? '#38bdf8'
    : lot.highestBidderName
    ? '#fde68a'
    : '#94a3b8';
  ctx.font = '900 32px sans-serif';
  ctx.fillText(
    lot.highestBidderIsPlayer
      ? `BẠN (CHỦ SÀN) ĐANG DẪN ĐẦU · GIÁ TRẢ $${lot.currentBid.toLocaleString()}`
      : lot.highestBidderName
      ? `NGƯỜI DẪN ĐẦU: ${lot.highestBidderName} (${lot.highestBidderLocation || 'VIP'})`
      : 'ĐANG CHỜ ĐẠI GIA VIP HOẶC CHỦ SÀN ĐẶT LỆNH MỞ BÁT...',
    108,
    670,
    w - 220
  );
}

export function createGradingLabStructure(opts: CreateGradingLabOptions): GradingLabStructureResult {
  const {
    hiredReceptionist,
    hiredSpecialistsCount,
    createSignTex,
    createCharacterFaceTexture,
    createCharacterHeadMesh,
  } = opts;

  // Expanded Building R1 covers World X = 13.0..29.0, World Z = -28.0..+15.6 (depth 43.6m)
  // r1Group origin at World (21.0, 0, -6.2) => lz = WorldZ + 6.2 (-21.8..+21.8)
  // Layout Front -> Back:
  //   1. Front Lobby & Reception Desk (Z: +9.5..+15.6, lz: +15.7..+21.8) - wide center aisle open!
  //   2. Grand VIP Auction Showroom (Z: -18.0..+9.5, lz: -11.8..+15.7) - immediate walk-in access!
  //   3. Private Optical Grading Lab Room at rear (Z: -28.0..-18.0, lz: -21.8..-11.8) via 2.1m side corridors!
  const r1Group = new THREE.Group();
  r1Group.position.set(21.0, 0, -6.2);

  const slateTex = createSlateCladdingTex();
  const cleanFloorTex = createCleanroomFloorTex();
  const auctionMarbleTex = createAuctionMarbleFloorTex();

  const labExteriorMat = new THREE.MeshStandardMaterial({
    map: slateTex,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.16,
  });
  const labInteriorWallMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.86, metalness: 0.02 });
  const auctionDarkWallMat = new THREE.MeshStandardMaterial({ color: 0x243247, roughness: 0.72, metalness: 0.12 });
  const labFloorMat = new THREE.MeshStandardMaterial({
    map: cleanFloorTex,
    color: 0xffffff,
    roughness: 0.58,
    metalness: 0.08,
  });
  const auctionFloorMat = new THREE.MeshStandardMaterial({
    map: auctionMarbleTex,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.16,
  });
  const labCeilingMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, metalness: 0.04 });
  const labTrimGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.32, metalness: 0.68 });
  const labGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbfe7ff,
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.28,
  });
  const labFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.58 });
  const royalCrimsonMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.88, metalness: 0.04 });

  // Ground floor slab & ceiling + upper architectural parapet (43.6m deep: lz = -21.8..+21.8)
  const r1Floor = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.06, 43.4), labFloorMat);
  r1Floor.position.set(0, 0.03, 0);
  r1Group.add(r1Floor);

  // Grand VIP Auction Hall Dark Gold Marble Floor (World Z = -18.0..+9.5 => lz = -11.8..+15.7)
  const auctionMarbleFloor = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.02, 27.5), auctionFloorMat);
  auctionMarbleFloor.position.set(0, 0.065, 1.95);
  r1Group.add(auctionMarbleFloor);

  const r1Ceiling = new THREE.Mesh(new THREE.BoxGeometry(15.96, 0.22, 43.56), labCeilingMat);
  r1Ceiling.position.set(0, 5.38, 0);
  r1Group.add(r1Ceiling);

  const r1Parapet = new THREE.Mesh(new THREE.BoxGeometry(16.0, 2.98, 43.6), labExteriorMat);
  r1Parapet.position.set(0, 7.01, 0);
  r1Group.add(r1Parapet);

  // Welcome Carpet Runner at Entrance (World Z = 14.55 -> lz = +20.75)
  const welcomeMat = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.018, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x0f2744, roughness: 0.92 })
  );
  welcomeMat.position.set(0, 0.068, 20.75);
  r1Group.add(welcomeMat);
  const welcomeBorder = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.012, 1.42), labTrimGoldMat);
  welcomeBorder.position.set(0, 0.064, 20.75);
  r1Group.add(welcomeBorder);

  // Full-length West, East, and North Outer Walls (43.6m deep) — non-overlapping Z segments prevent Z-fighting
  const r1WestExt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.48, 43.6), labExteriorMat);
  r1WestExt.position.set(-7.9, 2.74, 0);
  r1Group.add(r1WestExt);
  const r1WestIntLobby = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.28, 6.0), labInteriorWallMat);
  r1WestIntLobby.position.set(-7.72, 2.64, 18.7);
  r1Group.add(r1WestIntLobby);
  const r1WestIntAuction = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.28, 27.46), auctionDarkWallMat);
  r1WestIntAuction.position.set(-7.72, 2.64, 1.94);
  r1Group.add(r1WestIntAuction);
  const r1WestIntLab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.28, 9.68), labInteriorWallMat);
  r1WestIntLab.position.set(-7.72, 2.64, -16.66);
  r1Group.add(r1WestIntLab);

  const r1EastExt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.48, 43.6), labExteriorMat);
  r1EastExt.position.set(7.9, 2.74, 0);
  r1Group.add(r1EastExt);
  const r1EastIntLobby = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.28, 6.0), labInteriorWallMat);
  r1EastIntLobby.position.set(7.72, 2.64, 18.7);
  r1Group.add(r1EastIntLobby);
  const r1EastIntAuction = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.28, 27.46), auctionDarkWallMat);
  r1EastIntAuction.position.set(7.72, 2.64, 1.94);
  r1Group.add(r1EastIntAuction);
  const r1EastIntLab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.28, 9.68), labInteriorWallMat);
  r1EastIntLab.position.set(7.72, 2.64, -16.66);
  r1Group.add(r1EastIntLab);

  const r1NorthExt = new THREE.Mesh(new THREE.BoxGeometry(16.0, 5.48, 0.2), labExteriorMat);
  r1NorthExt.position.set(0, 2.74, -21.7);
  r1Group.add(r1NorthExt);
  const r1NorthInt = new THREE.Mesh(new THREE.BoxGeometry(15.24, 5.28, 0.16), labInteriorWallMat);
  r1NorthInt.position.set(0, 2.64, -21.52);
  r1Group.add(r1NorthInt);

  // Front Facade Framing at lz = +21.7 (World Z = +15.5)
  const r1FrontHeader = new THREE.Mesh(new THREE.BoxGeometry(16.0, 2.0, 0.25), labExteriorMat);
  r1FrontHeader.position.set(0, 4.5, 21.7);
  r1Group.add(r1FrontHeader);

  [-4.85, 4.85].forEach((fx, wIdx) => {
    const kneeWall = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.68, 0.25), labExteriorMat);
    kneeWall.position.set(fx, 0.34, 21.7);
    r1Group.add(kneeWall);

    const windowPane = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.82, 0.08), labGlassMat);
    windowPane.position.set(fx, 2.09, 21.7);
    r1Group.add(windowPane);

    const bannerTex = createWindowBannerTex(wIdx === 0 ? 'LEFT' : 'RIGHT');
    const winDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 0.72),
      new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, opacity: 0.94, side: THREE.DoubleSide })
    );
    winDecal.position.set(fx, 1.06, 21.76);
    r1Group.add(winDecal);
  });

  [-7.85, -1.78, 1.78, 7.85].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.3), labFrameMat);
    pillar.position.set(px, 1.8, 21.7);
    r1Group.add(pillar);
  });

  // Entrance Architectural Awning Canopy + Security Dome Camera (offset forward to avoid Z-fighting with pillars/lintel)
  const canopyBase = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.16, 1.0), labFrameMat);
  canopyBase.position.set(0, 3.58, 22.36);
  r1Group.add(canopyBase);
  const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(4.34, 0.05, 1.04), labTrimGoldMat);
  canopyTrim.position.set(0, 3.69, 22.36);
  r1Group.add(canopyTrim);

  const canopySignTex = createSignTex(
    'GRADING LAB & VIP AUCTION',
    'PSA • CGC • BGS BLACK LABEL 10',
    '#070b14',
    '#fbbf24',
    '#38bdf8'
  );
  const canopyFace = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 0.14),
    new THREE.MeshBasicMaterial({ map: canopySignTex })
  );
  canopyFace.position.set(0, 3.58, 22.875);
  r1Group.add(canopyFace);

  const domeHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12), labFrameMat);
  domeHousing.position.set(-1.55, 3.43, 22.2);
  r1Group.add(domeHousing);
  const domeLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.8 })
  );
  domeLens.position.set(-1.55, 3.38, 22.2);
  r1Group.add(domeLens);

  // Sliding Automatic Double Glass Doors
  const gradingDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(1.62, 3.35, 0.08), labGlassMat);
  gradingDoorLeft.position.set(-0.82, 1.68, 21.72);
  gradingDoorLeft.userData.noMerge = true;
  r1Group.add(gradingDoorLeft);

  const gradingDoorRight = new THREE.Mesh(new THREE.BoxGeometry(1.62, 3.35, 0.08), labGlassMat);
  gradingDoorRight.position.set(0.82, 1.68, 21.72);
  gradingDoorRight.userData.noMerge = true;
  r1Group.add(gradingDoorRight);

  // Door lintel fits strictly inside the two pillars (x: -1.61..+1.61) to eliminate edge Z-fighting
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.12, 0.28), labTrimGoldMat);
  doorLintel.position.set(0, 3.42, 21.70);
  r1Group.add(doorLintel);

  // Level 25 Lock Overlay across entrance
  const gradingLockBarrierGroup = new THREE.Group();
  gradingLockBarrierGroup.position.set(0, 1.65, 21.82);
  gradingLockBarrierGroup.userData.noMerge = true;
  const lockTex = createSignTex(
    '🔒 MỞ KHÓA TẠI CẤP 25',
    'PSA • CGC • BGS LAB & SÀN ĐẤU GIÁ VIP ($80+/THẺ)',
    '#090d16',
    '#fbbf24',
    '#38bdf8',
    '#fbbf24'
  );
  const lockBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.05),
    new THREE.MeshBasicMaterial({ map: lockTex, side: THREE.DoubleSide })
  );
  gradingLockBarrierGroup.add(lockBanner);
  r1Group.add(gradingLockBarrierGroup);

  // Glowing Cyan & Gold Exterior Accent Trims
  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.78,
  });
  const neonGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.68,
  });
  const neonMats = [neonCyanMat, neonGoldMat];

  const r1NeonCyan = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.1, 0.1), neonCyanMat);
  r1NeonCyan.position.set(0, 8.2, 21.85);
  r1Group.add(r1NeonCyan);

  const r1NeonGold = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.08, 0.1), neonGoldMat);
  r1NeonGold.position.set(0, 3.7, 21.85);
  r1Group.add(r1NeonGold);

  const r1SignTex = createGradingLabFacadeSignTex();
  const r1SignMat = new THREE.MeshStandardMaterial({
    map: r1SignTex,
    roughness: 0.78,
    metalness: 0.08,
    emissive: 0xffffff,
    emissiveMap: r1SignTex,
    emissiveIntensity: 0.34,
  });
  const r1Sign = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 3.25), r1SignMat);
  r1Sign.position.set(0, 5.75, 21.88);
  r1Group.add(r1Sign);

  // Ceiling Linear LED Panels across Lobby, Grand Auction Hall & Rear Private Grading Lab
  const gradingPanelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [
    [-3.6, 5.25, 18.4],
    [3.6, 5.25, 18.4],
    [-4.2, 5.25, 10.5],
    [4.2, 5.25, 10.5],
    [-4.2, 5.25, 2.5],
    [4.2, 5.25, 2.5],
    [-4.2, 5.25, -5.5],
    [4.2, 5.25, -5.5],
    [-4.2, 5.25, -13.5],
    [4.2, 5.25, -13.5],
    [-3.6, 5.25, -18.5],
    [3.6, 5.25, -18.5],
  ].forEach(([px, py, pz]) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.8), gradingPanelMat);
    panel.position.set(px, py, pz);
    r1Group.add(panel);
  });

  // Warm Gold Wall Sconce LED Bars along Auction Hall West & East Walls for rich evening ambience
  const warmSconceMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  [-7.58, 7.58].forEach((wx) => {
    [-4.5, 1.5, 7.5].forEach((wz) => {
      const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.14), warmSconceMat);
      sconce.position.set(wx, 3.1, wz);
      r1Group.add(sconce);
    });
  });

  [-2.6, 2.6].forEach((cx) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 2.8), labFrameMat);
    bar.position.set(cx, 4.55, 18.2);
    r1Group.add(bar);
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 2.7), gradingPanelMat);
    diffuser.position.set(cx, 4.51, 18.2);
    r1Group.add(diffuser);
    [-1.1, 1.1].forEach((cz) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.76, 6), labFrameMat);
      rod.position.set(cx, 4.95, 18.2 + cz);
      r1Group.add(rod);
    });
  });

  // Front Lobby Light + Auction Hall Lights + Rear Private Lab Light (scaled Day -> Night via commercialInteriorLights)
  const pointLight = new THREE.PointLight(0xf8fafc, 5.5, 30.0, 1.0);
  pointLight.position.set(21.0, 4.7, 11.5);

  const midHallLight = new THREE.PointLight(0xfff3d6, 6.5, 34.0, 1.0);
  midHallLight.position.set(21.0, 4.7, 2.0);

  const stageSpotlight = new THREE.PointLight(0xffe8bd, 7.5, 34.0, 1.0);
  stageSpotlight.position.set(21.0, 4.8, -9.5);

  const privateLabLight = new THREE.PointLight(0xf0f9ff, 7.0, 30.0, 1.0);
  privateLabLight.position.set(21.0, 4.7, -23.2);

  const extraLights = [midHallLight, stageSpotlight, privateLabLight];
  const interiorPointLights = [
    { light: pointLight, dayInt: 5.5, nightInt: 40.0 },
    { light: midHallLight, dayInt: 6.5, nightInt: 48.0 },
    { light: stageSpotlight, dayInt: 7.5, nightInt: 54.0 },
    { light: privateLabLight, dayInt: 7.0, nightInt: 48.0 },
  ];

  // Velvet Rope Stanchions flanking Entrance Path (World Z = 12.15..13.25)
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 });
  [-1.85, 1.85].forEach((sx) => {
    [18.35, 19.45].forEach((sz) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 14), labTrimGoldMat);
      base.position.set(sx, 0.08, sz);
      r1Group.add(base);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.88, 10), labTrimGoldMat);
      post.position.set(sx, 0.52, sz);
      r1Group.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), labTrimGoldMat);
      cap.position.set(sx, 0.98, sz);
      r1Group.add(cap);
    });
    const ropeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.08, 8), ropeMat);
    ropeBar.rotation.x = Math.PI / 2;
    ropeBar.position.set(sx, 0.84, 18.9);
    r1Group.add(ropeBar);
  });

  // ==========================================
  // FRONT-WEST RECEPTION COUNTER ("Quầy Tiếp Nhận Thẻ Raw") at World X=16.8, Z=+10.7 => lx=-4.2, lz=+16.9
  // Placed cleanly on West Side so Center Aisle (X=18.7..27.0) goes unobstructed straight to Auction!
  // ==========================================
  const recOffsetX = -4.2;
  const recBaseZ = 16.9;
  const recCounterBody = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.05, 0.84),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 })
  );
  recCounterBody.position.set(recOffsetX, 0.525, recBaseZ);
  r1Group.add(recCounterBody);

  const recCounterTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.56, 0.08, 0.96),
    new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.65, metalness: 0.06 })
  );
  recCounterTop.position.set(recOffsetX, 1.09, recBaseZ);
  r1Group.add(recCounterTop);

  const recGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(3.58, 0.06, 0.98), labTrimGoldMat);
  recGoldTrim.position.set(recOffsetX, 0.98, recBaseZ);
  r1Group.add(recGoldTrim);

  const counterFrontTex = createSignTex(
    'PSA • CGC • BGS INBOUND DESK',
    'GỬI THẺ • SOI 10x • SÀN ĐẤU GIÁ THẲNG PHÍA TRƯỚC →',
    '#090d16',
    '#fbbf24',
    '#38bdf8',
    '#fbbf24'
  );
  const counterPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 0.54),
    new THREE.MeshBasicMaterial({ map: counterFrontTex })
  );
  counterPlaque.position.set(recOffsetX, 0.52, recBaseZ + 0.43);
  r1Group.add(counterPlaque);

  const intakeScreenTex = createSignTex(
    'PSA · CGC · BGS CHECK-IN',
    'STANDARD $80 • EXPRESS $135 • VIP $220',
    '#0f172a',
    '#38bdf8',
    '#fbbf24',
    '#38bdf8'
  );
  const intakeMonitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 })
  );
  intakeMonitor.position.set(recOffsetX - 0.92, 1.42, recBaseZ - 0.08);
  intakeMonitor.rotation.y = 0.18;
  r1Group.add(intakeMonitor);

  const intakeMonitorScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.37),
    new THREE.MeshBasicMaterial({ map: intakeScreenTex })
  );
  intakeMonitorScreen.position.set(recOffsetX - 0.92, 1.42, recBaseZ - 0.05);
  intakeMonitorScreen.rotation.y = 0.18;
  r1Group.add(intakeMonitorScreen);

  const certMonitorTex = createSignTex(
    'BLACK LABEL & CERT VERIFY',
    '10x UV LOUPE + SLAB GUARD READY',
    '#090d16',
    '#34d399',
    '#e2e8f0',
    '#34d399'
  );
  const certMonitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.42, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 })
  );
  certMonitor.position.set(recOffsetX + 0.92, 1.4, recBaseZ - 0.08);
  certMonitor.rotation.y = -0.18;
  r1Group.add(certMonitor);
  const certScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.35),
    new THREE.MeshBasicMaterial({ map: certMonitorTex })
  );
  certScreen.position.set(recOffsetX + 0.92, 1.4, recBaseZ - 0.05);
  certScreen.rotation.y = -0.18;
  r1Group.add(certScreen);

  const intakeTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.05, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
  );
  intakeTray.position.set(recOffsetX, 1.15, recBaseZ + 0.12);
  r1Group.add(intakeTray);
  const trayFelt = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.02, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.9 })
  );
  trayFelt.position.set(recOffsetX, 1.175, recBaseZ + 0.12);
  r1Group.add(trayFelt);

  const scannerStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.24, 8), labFrameMat);
  scannerStand.position.set(recOffsetX + 0.42, 1.24, recBaseZ + 0.12);
  r1Group.add(scannerStand);
  const scannerHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45 })
  );
  scannerHead.position.set(recOffsetX + 0.42, 1.36, recBaseZ + 0.14);
  scannerHead.rotation.x = 0.4;
  r1Group.add(scannerHead);

  // ==========================================
  // HIGH-RES MUSEUM & COUNTER SLAB POOL
  // ==========================================
  const seenMuseumIds = new Set<string>();
  const dedupeById = (arr: PokemonCard[]) =>
    arr.filter((c) => {
      if (!c.imageUrl || (c.marketPrice || 0) < 20 || seenMuseumIds.has(c.id)) return false;
      seenMuseumIds.add(c.id);
      return true;
    });
  const topPokemonPool = dedupeById(
    [...POKEMON_CARDS_DB].sort((a, b) => (b.marketPrice || 0) - (a.marketPrice || 0))
  );
  const topOnePiecePool = dedupeById(
    [...ONEPIECE_CARDS_DB].sort((a, b) => (b.marketPrice || 0) - (a.marketPrice || 0))
  );

  const museumSlabPool: PokemonCard[] = [];
  const maxPoolLen = Math.max(topPokemonPool.length, topOnePiecePool.length);
  for (let i = 0; i < maxPoolLen && museumSlabPool.length < 48; i++) {
    if (i < topPokemonPool.length) museumSlabPool.push(topPokemonPool[i]);
    if (i < topOnePiecePool.length) museumSlabPool.push(topOnePiecePool[i]);
  }
  if (museumSlabPool.length === 0) {
    museumSlabPool.push(...POKEMON_CARDS_DB.slice(0, 12));
  }

  const museumCabinetBodyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.65,
    metalness: 0.2,
  });
  const museumShelfGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbfe7ff,
    roughness: 0.14,
    metalness: 0.1,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const museumGlassEnclosureMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.1,
    metalness: 0.12,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const museumVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x172554,
    roughness: 0.92,
    metalness: 0.02,
  });
  const museumSlabFrontGeo = new THREE.PlaneGeometry(0.24, 0.352);
  const museumSlabBackMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.8,
    metalness: 0.1,
  });
  const museumStandBaseGeo = new THREE.BoxGeometry(0.18, 0.015, 0.11);
  const museumStandPostGeo = new THREE.BoxGeometry(0.025, 0.18, 0.025);
  const museumStandLipGeo = new THREE.BoxGeometry(0.2, 0.02, 0.03);

  const createViewOnlySlab10Stand = (
    cardIdx: number,
    rotY: number = 0,
    mode: 'auto' | 'cgc_pristine' | 'bgs_black' = 'auto'
  ) => {
    const card = museumSlabPool[cardIdx % museumSlabPool.length];
    let slab: {
      company: 'PSA' | 'CGC' | 'BGS';
      grade: number;
      gradeLabel: string;
      certNumber: string;
      year: number;
      slabGuardColor?: SlabGuardColor;
    };

    if (mode === 'bgs_black' || (mode === 'auto' && cardIdx % 5 === 2)) {
      slab = {
        company: 'BGS',
        grade: 10,
        gradeLabel: 'BLACK LABEL 10',
        certNumber: `0016${String(4200 + cardIdx * 13).padStart(6, '0')}`,
        year: 2026,
        slabGuardColor: 'gold',
      };
    } else if (mode === 'cgc_pristine' || cardIdx % 2 === 1) {
      slab = {
        company: 'CGC',
        grade: 10,
        gradeLabel: mode === 'cgc_pristine' || cardIdx % 4 === 1 ? 'PRISTINE 10' : 'GEM MINT 10',
        certNumber: `140029${String(4100 + cardIdx).padStart(4, '0')}`,
        year: 2026,
      };
    } else {
      slab = {
        company: 'PSA',
        grade: 10,
        gradeLabel: 'GEM MT 10',
        certNumber: `8840${String(1900 + cardIdx * 17).padStart(4, '0')}`,
        year: 2026,
      };
    }

    const g = new THREE.Group();
    g.rotation.y = rotY;

    const base = new THREE.Mesh(museumStandBaseGeo, labTrimGoldMat);
    base.position.set(0, 0.008, 0);
    g.add(base);

    const post = new THREE.Mesh(museumStandPostGeo, labTrimGoldMat);
    post.position.set(0, 0.095, -0.02);
    g.add(post);

    const lip = new THREE.Mesh(museumStandLipGeo, labTrimGoldMat);
    lip.position.set(0, 0.06, 0.01);
    g.add(lip);

    const holder = new THREE.Group();
    holder.position.set(0, 0.22, 0.015);
    holder.rotation.x = -0.14;

    const cardTex = createShowcaseCardTexture(card, slab);
    const frontMesh = new THREE.Mesh(
      museumSlabFrontGeo,
      new THREE.MeshStandardMaterial({
        map: cardTex,
        roughness: 0.72,
        metalness: 0.04,
        side: THREE.FrontSide,
      })
    );
    frontMesh.position.z = 0.004;
    holder.add(frontMesh);

    const backMesh = new THREE.Mesh(museumSlabFrontGeo, museumSlabBackMat);
    backMesh.position.z = -0.001;
    backMesh.rotation.y = Math.PI;
    holder.add(backMesh);

    g.add(holder);
    return g;
  };

  // Authentic Textured PSA 10, BGS Black Label 10 & CGC Pristine 10 Slabs on Reception Counter
  [-1.25, 1.25].forEach((dx, sIdx) => {
    const mode = sIdx === 0 ? 'bgs_black' : 'cgc_pristine';
    const counterSlab = createViewOnlySlab10Stand(sIdx, 0, mode);
    counterSlab.position.set(recOffsetX + dx, 1.13, recBaseZ + 0.12);
    r1Group.add(counterSlab);
  });

  // ==========================================
  // FRONT-EAST VIP CLIENT WAITING LOUNGE & LOBBY PLANTERS
  // ==========================================
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 });
  const loungeSofa = new THREE.Group();
  loungeSofa.position.set(3.85, 0, 20.65);
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.38, 0.76), leatherMat);
  sofaBase.position.set(0, 0.22, 0);
  loungeSofa.add(sofaBase);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.46, 0.16), leatherMat);
  sofaBack.position.set(0, 0.56, 0.3);
  loungeSofa.add(sofaBack);
  [-0.82, 0.82].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.76), leatherMat);
    arm.position.set(ax, 0.3, 0);
    loungeSofa.add(arm);
  });
  const sofaTrim = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.78), labTrimGoldMat);
  sofaTrim.position.set(0, 0.05, 0);
  loungeSofa.add(sofaTrim);
  r1Group.add(loungeSofa);

  const sideTbl = new THREE.Group();
  sideTbl.position.set(5.55, 0, 20.65);
  const tblLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.18, 0.44, 12), labTrimGoldMat);
  tblLeg.position.set(0, 0.24, 0);
  sideTbl.add(tblLeg);
  const tblTopGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 18), museumShelfGlassMat);
  tblTopGlass.position.set(0, 0.47, 0);
  sideTbl.add(tblTopGlass);
  const guideBook = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.025, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 })
  );
  guideBook.position.set(0.04, 0.5, 0.02);
  guideBook.rotation.y = 0.25;
  sideTbl.add(guideBook);
  r1Group.add(sideTbl);

  const buildLobbyPlanter = (lx: number, lz: number) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(lx, 0, lz);
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.46, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    pot.position.set(0, 0.25, 0);
    pGroup.add(pot);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.58, 5), leafMat);
      leaf.position.set(Math.cos(ang) * 0.14, 0.64, Math.sin(ang) * 0.14);
      leaf.rotation.z = -Math.cos(ang) * 0.42;
      leaf.rotation.x = Math.sin(ang) * 0.42;
      pGroup.add(leaf);
    }
    r1Group.add(pGroup);
  };
  buildLobbyPlanter(6.75, 20.75);
  buildLobbyPlanter(-5.9, 20.7);

  // ==========================================
  // SEALED GLASS PSA 10, CGC 10 & BGS BLACK LABEL MUSEUM DISPLAYS (LOBBY)
  // ==========================================
  const wallCabinetGroup = new THREE.Group();
  wallCabinetGroup.position.set(-7.24, 0, 18.6);
  wallCabinetGroup.rotation.y = Math.PI / 2;

  const cabBase = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.62, 0.66), museumCabinetBodyMat);
  cabBase.position.set(0, 0.31, 0);
  wallCabinetGroup.add(cabBase);

  const cabBaseTrim = new THREE.Mesh(new THREE.BoxGeometry(5.44, 0.04, 0.68), labTrimGoldMat);
  cabBaseTrim.position.set(0, 0.63, 0);
  wallCabinetGroup.add(cabBaseTrim);

  const cabBack = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.18, 0.06), museumCabinetBodyMat);
  cabBack.position.set(0, 1.72, -0.3);
  wallCabinetGroup.add(cabBack);

  const cabVelvetBack = new THREE.Mesh(new THREE.PlaneGeometry(5.26, 2.04), museumVelvetMat);
  cabVelvetBack.position.set(0, 1.68, -0.265);
  wallCabinetGroup.add(cabVelvetBack);

  const cabTopCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.44, 0.28, 0.7), museumCabinetBodyMat);
  cabTopCanopy.position.set(0, 2.86, 0);
  wallCabinetGroup.add(cabTopCanopy);

  const cabTopTrim = new THREE.Mesh(new THREE.BoxGeometry(5.46, 0.04, 0.72), labTrimGoldMat);
  cabTopTrim.position.set(0, 2.71, 0);
  wallCabinetGroup.add(cabTopTrim);

  const museumPlaqueTex = createSignTex(
    'HALL OF GRAILS  •  30 SEALED 10s',
    'PSA GEM MT 10 • CGC PRISTINE • BGS BLACK LABEL',
    '#070b14',
    '#fbbf24',
    '#38bdf8'
  );
  const cabTopPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 0.22),
    new THREE.MeshBasicMaterial({ map: museumPlaqueTex })
  );
  cabTopPlaque.position.set(0, 2.86, 0.36);
  wallCabinetGroup.add(cabTopPlaque);

  [-2.68, 0, 2.68].forEach((cx) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.12, 0.68), labTrimGoldMat);
    post.position.set(cx, 1.68, 0);
    wallCabinetGroup.add(post);
  });

  const cabShelfHeights = [0.68, 1.32, 1.96];
  let slabCounter = 0;
  cabShelfHeights.forEach((sy, sIdx) => {
    if (sIdx > 0) {
      const glassShelf = new THREE.Mesh(new THREE.BoxGeometry(5.26, 0.025, 0.56), museumShelfGlassMat);
      glassShelf.position.set(0, sy - 0.015, -0.02);
      wallCabinetGroup.add(glassShelf);
    }
    for (let col = 0; col < 10; col++) {
      const xPos = col < 5 ? -2.28 + col * 0.49 : 0.32 + (col - 5) * 0.49;
      const stand = createViewOnlySlab10Stand(slabCounter++, 0);
      stand.position.set(xPos, sy, -0.02);
      wallCabinetGroup.add(stand);
    }
  });

  [-1.34, 1.34].forEach((dx) => {
    const frontGlassDoor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.04, 0.025), museumGlassEnclosureMat);
    frontGlassDoor.position.set(dx, 1.68, 0.32);
    wallCabinetGroup.add(frontGlassDoor);
  });
  [-2.68, 2.68].forEach((sxPos) => {
    const sideGlassPanel = new THREE.Mesh(new THREE.BoxGeometry(0.025, 2.04, 0.62), museumGlassEnclosureMat);
    sideGlassPanel.position.set(sxPos, 1.68, 0);
    wallCabinetGroup.add(sideGlassPanel);
  });
  const cabLockClasp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.05), labTrimGoldMat);
  cabLockClasp.position.set(0, 1.56, 0.34);
  wallCabinetGroup.add(cabLockClasp);
  r1Group.add(wallCabinetGroup);

  // DISPLAY 2: East Lobby Sealed Glass Museum Vitrine Table
  const museumTableGroup = new THREE.Group();
  museumTableGroup.position.set(6.98, 0, 18.55);
  museumTableGroup.rotation.y = -Math.PI / 2;

  const tblBase = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.84, 1.24), museumCabinetBodyMat);
  tblBase.position.set(0, 0.42, 0);
  museumTableGroup.add(tblBase);

  const tblTrim = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.05, 1.3), labTrimGoldMat);
  tblTrim.position.set(0, 0.85, 0);
  museumTableGroup.add(tblTrim);

  const tblVelvetDeck = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.03, 1.12), museumVelvetMat);
  tblVelvetDeck.position.set(0, 0.88, 0);
  museumTableGroup.add(tblVelvetDeck);

  const tblBackRiser = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.42), museumVelvetMat);
  tblBackRiser.position.set(0, 0.94, -0.26);
  museumTableGroup.add(tblBackRiser);

  for (let row = 0; row < 2; row++) {
    const zSlot = row === 0 ? -0.26 : 0.28;
    const ySlot = row === 0 ? 1.0 : 0.895;
    for (let col = 0; col < 6; col++) {
      const xSlot = -1.0 + col * 0.4;
      const stand = createViewOnlySlab10Stand(slabCounter++, 0);
      stand.position.set(xSlot, ySlot, zSlot);
      museumTableGroup.add(stand);
    }
  }

  const hoodH = 0.72;
  const hoodY = 0.88 + hoodH / 2;
  const hoodFrontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.68, hoodH, 0.025), museumGlassEnclosureMat);
  hoodFrontGlass.position.set(0, hoodY, 0.6);
  museumTableGroup.add(hoodFrontGlass);

  const hoodBackGlass = new THREE.Mesh(new THREE.BoxGeometry(2.68, hoodH, 0.025), museumGlassEnclosureMat);
  hoodBackGlass.position.set(0, hoodY, -0.6);
  museumTableGroup.add(hoodBackGlass);

  [-1.33, 1.33].forEach((gx) => {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.025, hoodH, 1.22), museumGlassEnclosureMat);
    sideGlass.position.set(gx, hoodY, 0);
    museumTableGroup.add(sideGlass);
  });

  const hoodTopGlass = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.025, 1.24), museumGlassEnclosureMat);
  hoodTopGlass.position.set(0, 0.88 + hoodH, 0);
  museumTableGroup.add(hoodTopGlass);

  [-1.33, 1.33].forEach((px) => {
    [-0.6, 0.6].forEach((pz) => {
      const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, hoodH + 0.03, 0.04), labTrimGoldMat);
      cornerPost.position.set(px, hoodY, pz);
      museumTableGroup.add(cornerPost);
    });
  });
  [-0.6, 0.6].forEach((pz) => {
    const topBarX = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.035, 0.04), labTrimGoldMat);
    topBarX.position.set(0, 0.88 + hoodH + 0.01, pz);
    museumTableGroup.add(topBarX);
  });
  [-1.33, 1.33].forEach((px) => {
    const topBarZ = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 1.24), labTrimGoldMat);
    topBarZ.position.set(px, 0.88 + hoodH + 0.01, 0);
    museumTableGroup.add(topBarZ);
  });
  r1Group.add(museumTableGroup);

  // ==========================================
  // OVERHEAD WELCOME SIGN ARCH TO AUCTION SHOWROOM (No floor barrier — wide open walkthrough!)
  // ==========================================
  const overheadBeam = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.16, 0.22), labTrimGoldMat);
  overheadBeam.position.set(0, 3.85, 15.5);
  r1Group.add(overheadBeam);

  const labAccessSignTex = createSignTex(
    'SÀN ĐẤU GIÁ VIP  •  BƯỚC THẲNG',
    'PHÒNG CHẤM ĐIỂM LAB Ở CUỐI NHÀ',
    '#070b14',
    '#fbbf24',
    '#38bdf8',
    '#fbbf24'
  );
  const partitionSign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 0.78),
    new THREE.MeshBasicMaterial({ map: labAccessSignTex })
  );
  partitionSign.position.set(0, 4.35, 15.52);
  r1Group.add(partitionSign);

  // ==========================================
  // HUMANOID STAFF & VISITOR BUILDER
  // ==========================================
  const buildGradingNpc = (npcOpts: {
    shirtColor: number;
    pantsColor: number;
    hairColor: number;
    skinColor: number;
    skinHex: string;
    badgeColor: number;
    seated?: boolean;
    hasGlasses?: boolean;
    hasPaddle?: boolean;
    hasGavel?: boolean;
    hasMic?: boolean;
  }) => {
    const npc = new THREE.Group();
    const sMat = new THREE.MeshStandardMaterial({ color: npcOpts.skinColor, roughness: 0.65 });
    const hMat = new THREE.MeshStandardMaterial({ color: npcOpts.hairColor, roughness: 0.8 });
    const topMat = new THREE.MeshStandardMaterial({ color: npcOpts.shirtColor, roughness: 0.55 });
    const legMat = new THREE.MeshStandardMaterial({ color: npcOpts.pantsColor, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 });
    const badgeMat = new THREE.MeshStandardMaterial({ color: npcOpts.badgeColor, roughness: 0.3, metalness: 0.5 });

    const hips = new THREE.Group();
    hips.position.set(0, npcOpts.seated ? 0.52 : 0.84, 0);
    npc.add(hips);

    if (npcOpts.seated) {
      const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.44), labFrameMat);
      chairSeat.position.set(0, 0.44, -0.05);
      npc.add(chairSeat);
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.06), labFrameMat);
      chairBack.position.set(0, 0.72, -0.25);
      npc.add(chairBack);
      const chairPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.44, 8), labFrameMat);
      chairPost.position.set(0, 0.22, -0.05);
      npc.add(chairPost);

      [-0.1, 0.1].forEach((lx) => {
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.38), legMat);
        thigh.position.set(lx, 0, 0.16);
        hips.add(thigh);
        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), legMat);
        shin.position.set(lx, -0.24, 0.3);
        hips.add(shin);
      });
    } else {
      [-0.1, 0.1].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.74, 0.14), legMat);
        leg.position.set(lx, -0.37, 0);
        hips.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.22), shoeMat);
        shoe.position.set(lx, -0.78, 0.04);
        hips.add(shoe);
      });
    }

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.24), topMat);
    chest.position.set(0, 0.28, 0);
    hips.add(chest);

    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.02), badgeMat);
    badge.position.set(0.11, 0.34, 0.13);
    hips.add(badge);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.68, 0);
    hips.add(headGroup);

    const faceTex = createCharacterFaceTexture('happy', npcOpts.skinHex);
    const headMesh = createCharacterHeadMesh(sMat, faceTex, 0.22, 0.24, 0.21);
    headGroup.add(headMesh);

    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.235), hMat);
    hairTop.position.set(0, 0.12, -0.004);
    headGroup.add(hairTop);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.045), hMat);
    hairBack.position.set(0, 0.025, -0.104);
    headGroup.add(hairBack);

    [-0.112, 0.112].forEach((sx) => {
      const sideHair = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.08, 0.11), hMat);
      sideHair.position.set(sx, 0.06, -0.03);
      headGroup.add(sideHair);
    });

    if (npcOpts.hasGlasses) {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.055, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.7 })
      );
      visor.position.set(0, 0.02, 0.115);
      headGroup.add(visor);
    }

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.26, 0.46, 0);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.11), topMat);
    lArmMesh.position.set(0, -0.18, 0.05);
    leftArm.add(lArmMesh);
    if (npcOpts.seated) leftArm.rotation.x = -0.85;
    hips.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.26, 0.46, 0);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.11), topMat);
    rArmMesh.position.set(0, -0.18, 0.05);
    rightArm.add(rArmMesh);
    if (npcOpts.hasPaddle) {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 6), labFrameMat);
      handle.position.set(0, -0.4, 0.12);
      handle.rotation.x = Math.PI / 2;
      rightArm.add(handle);
      const paddleDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.018, 12), labTrimGoldMat);
      paddleDisc.position.set(0, -0.4, 0.25);
      paddleDisc.rotation.z = Math.PI / 2;
      rightArm.add(paddleDisc);
    }
    if (npcOpts.hasGavel) {
      const gavelHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.016, 0.22, 8),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.55 })
      );
      gavelHandle.position.set(0, -0.37, 0.14);
      gavelHandle.rotation.x = Math.PI / 2;
      rightArm.add(gavelHandle);
      const gavelHead = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10), labTrimGoldMat);
      gavelHead.position.set(0, -0.37, 0.25);
      gavelHead.rotation.z = Math.PI / 2;
      rightArm.add(gavelHead);
    }
    if (npcOpts.hasMic) {
      const micShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.19, 8), labFrameMat);
      micShaft.position.set(0, -0.34, 0.14);
      micShaft.rotation.x = Math.PI / 2.6;
      rightArm.add(micShaft);
      const micCapsule = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.45, roughness: 0.25, metalness: 0.7 })
      );
      micCapsule.position.set(0, -0.3, 0.23);
      rightArm.add(micCapsule);
    }
    if (npcOpts.seated) rightArm.rotation.x = -0.9;
    hips.add(rightArm);

    return { npc, headGroup, rightArm };
  };

  // Receptionist behind West-Side Counter (World X=16.8, Z=9.7 -> lx=-4.2, lz=+15.9)
  const recBuild = buildGradingNpc({
    shirtColor: 0x1e3a8a,
    pantsColor: 0x0f172a,
    hairColor: 0x451a03,
    skinColor: 0xffe4cf,
    skinHex: '#ffe4cf',
    badgeColor: 0xfbbf24,
    seated: false,
  });
  const receptionistNpcGroup = recBuild.npc;
  receptionistNpcGroup.position.set(recOffsetX, 0, recBaseZ - 1.0);
  receptionistNpcGroup.visible = hiredReceptionist;
  receptionistNpcGroup.userData.noMerge = true;
  r1Group.add(receptionistNpcGroup);

  // 2 Ambient Collector Visitors admiring Lobby cabinets
  const visitorNpcs: GradingVisitorHandle[] = [];
  const visitorConfigs = [
    { lx: -5.4, lz: 18.75, rotY: -Math.PI / 2, shirt: 0x7c3aed, hair: 0x1c1917, skin: 0xffdfc4, hex: '#ffdfc4' },
    { lx: 4.95, lz: 18.65, rotY: Math.PI / 2, shirt: 0x0f766e, hair: 0x92400e, skin: 0xf1c27d, hex: '#f1c27d' },
  ];
  visitorConfigs.forEach((vc, idx) => {
    const vb = buildGradingNpc({
      shirtColor: vc.shirt,
      pantsColor: 0x1e293b,
      hairColor: vc.hair,
      skinColor: vc.skin,
      skinHex: vc.hex,
      badgeColor: 0x38bdf8,
      seated: false,
    });
    vb.npc.position.set(vc.lx, 0, vc.lz);
    vb.npc.rotation.y = vc.rotY;
    vb.npc.userData.noMerge = true;
    r1Group.add(vb.npc);
    visitorNpcs.push({
      group: vb.npc,
      head: vb.headGroup,
      baseY: 0,
      phase: idx * 2.1,
    });
  });

  // ==========================================
  // ZONE 2: GRAND VIP AUCTION SHOWROOM (World Z = -18.0..+9.5 => lz = -11.8..+15.7)
  // Wide open center straight from the entrance doors!
  // ==========================================
  // Royal Crimson & Gold Aisle Runner leading straight to Stage Steps (World Z = -7.6..+13.8 => lz = -1.4..+20.0)
  const royalRunner = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.018, 21.4), royalCrimsonMat);
  royalRunner.position.set(0, 0.08, 9.3);
  r1Group.add(royalRunner);
  [-1.66, 1.66].forEach((bx) => {
    const runnerTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 21.4), labTrimGoldMat);
    runnerTrim.position.set(bx, 0.082, 9.3);
    r1Group.add(runnerTrim);
  });

  // Grand Suspended Chandeliers down the center of Auction Hall
  [-2.5, 4.5, 11.5].forEach((cz) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 24), labTrimGoldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 4.7, cz);
    r1Group.add(ring);
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.03, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.set(0, 4.65, cz);
    r1Group.add(glowRing);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), labTrimGoldMat);
    stem.position.set(0, 5.05, cz);
    r1Group.add(stem);
  });

  // Raised VIP Auction Stage centered at lx = 0 (World X = 15.6..26.4, Z = -17.4..-8.0 => lz = -11.2..-1.8)
  // Leaves 2.1m side corridors on BOTH West (X=13.5..15.6) & East (X=26.4..28.5) walking cleanly to Rear Private Grading Lab!
  const stageDeck = new THREE.Mesh(
    new THREE.BoxGeometry(10.8, 0.55, 9.4),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45, metalness: 0.25 })
  );
  stageDeck.position.set(0, 0.275, -6.5);
  r1Group.add(stageDeck);

  const stageCarpetTop = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.025, 8.8), royalCrimsonMat);
  stageCarpetTop.position.set(0, 0.56, -6.5);
  r1Group.add(stageCarpetTop);

  const stageFrontGoldRim = new THREE.Mesh(new THREE.BoxGeometry(10.9, 0.08, 0.14), labTrimGoldMat);
  stageFrontGoldRim.position.set(0, 0.54, -1.78);
  r1Group.add(stageFrontGoldRim);

  // Stage Steps
  const stepLower = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, 0.48), labFrameMat);
  stepLower.position.set(0, 0.09, -1.4);
  r1Group.add(stepLower);
  const stepUpper = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.36, 0.45), labFrameMat);
  stepUpper.position.set(0, 0.18, -1.68);
  r1Group.add(stepUpper);

  // Stage Gold Auctioneer Podium (lx = 0, lz = -2.6 -> World Z = -8.8)
  const podiumBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.08, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.35 })
  );
  podiumBody.position.set(0, 1.11, -2.6);
  r1Group.add(podiumBody);
  const podiumTop = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.07, 0.82), labTrimGoldMat);
  podiumTop.position.set(0, 1.66, -2.6);
  r1Group.add(podiumTop);
  const podiumPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.55),
    new THREE.MeshBasicMaterial({
      map: createSignTex(
        'VIP AUCTION PODIUM',
        '[PRESS E] MỞ SÀN ĐẤU GIÁ',
        '#070b14',
        '#fbbf24',
        '#4ade80',
        '#fbbf24'
      ),
    })
  );
  podiumPlaque.position.set(0, 1.12, -2.23);
  r1Group.add(podiumPlaque);

  // Gold Auctioneer NPC standing behind podium
  const aucBuild = buildGradingNpc({
    shirtColor: 0x18181b,
    pantsColor: 0x09090b,
    hairColor: 0xd97706,
    skinColor: 0xffe4cf,
    skinHex: '#ffe4cf',
    badgeColor: 0xfbbf24,
    seated: false,
    hasGavel: true,
  });
  const auctioneerNpcGroup = aucBuild.npc;
  auctioneerNpcGroup.position.set(0, 0.56, -3.45);
  auctioneerNpcGroup.userData.noMerge = true;
  r1Group.add(auctioneerNpcGroup);

  // VIP Auction Host (MC) NPC standing prominently on stage beside the podium
  const hostBuild = buildGradingNpc({
    shirtColor: 0x065f46,
    pantsColor: 0x0f172a,
    hairColor: 0x1c1917,
    skinColor: 0xffdfc4,
    skinHex: '#ffdfc4',
    badgeColor: 0x38bdf8,
    seated: false,
    hasMic: true,
  });
  const auctionHostNpcGroup = hostBuild.npc;
  auctionHostNpcGroup.position.set(-1.45, 0.56, -3.1);
  auctionHostNpcGroup.rotation.y = 0.24;
  auctionHostNpcGroup.userData.noMerge = true;
  r1Group.add(auctionHostNpcGroup);

  // 2 Rotating Featured Auction Grail Pedestals flanking the Podium
  const auctionTurntables: THREE.Group[] = [];
  const featuredSlabMat = new THREE.MeshStandardMaterial({
    map: createShowcaseCardTexture(museumSlabPool[0], {
      company: 'BGS',
      grade: 10,
      gradeLabel: 'BLACK LABEL 10',
      certNumber: '0016888888',
      year: 2026,
      slabGuardColor: 'gold',
    }),
    roughness: 0.5,
    metalness: 0.08,
    side: THREE.FrontSide,
  });

  [-2.6, 2.6].forEach((px, pIdx) => {
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.62, 0.92, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.35 })
    );
    ped.position.set(px, 1.03, -2.8);
    r1Group.add(ped);
    const pedCap = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 16), labTrimGoldMat);
    pedCap.position.set(px, 1.5, -2.8);
    r1Group.add(pedCap);

    const glassCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.78, 16), museumGlassEnclosureMat);
    glassCyl.position.set(px, 1.92, -2.8);
    r1Group.add(glassCyl);

    const turntable = new THREE.Group();
    turntable.position.set(px, 1.55, -2.8);
    turntable.userData.noMerge = true;

    const cardPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.704), featuredSlabMat);
    cardPlane.position.set(0, 0.38, 0.01);
    turntable.add(cardPlane);

    const backCard = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.704), museumSlabBackMat);
    backCard.position.set(0, 0.38, -0.01);
    backCard.rotation.y = Math.PI;
    turntable.add(backCard);

    if (pIdx === 1) turntable.rotation.y = Math.PI * 0.45;
    r1Group.add(turntable);
    auctionTurntables.push(turntable);
  });

  // Acoustic Backdrop Wall & Architectural Luxury Framing (separating Showroom from Rear Private Lab at lz = -11.4 -> World Z = -17.6)
  const stageBackdropWall = new THREE.Mesh(
    new THREE.BoxGeometry(10.8, 5.3, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 0.72, metalness: 0.14 })
  );
  stageBackdropWall.position.set(0, 2.65, -11.4);
  r1Group.add(stageBackdropWall);

  // Fluted vertical architectural wall slats flanking the LED Wall
  const fluteMat = new THREE.MeshStandardMaterial({ color: 0x111726, roughness: 0.58, metalness: 0.22 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.7, 0.08), fluteMat);
      slat.position.set(side * (4.94 + i * 0.12), 2.7, -11.24);
      r1Group.add(slat);
    }
    // Brushed gold vertical architectural pilaster columns
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.11, 4.85, 0.12), labTrimGoldMat);
    pilaster.position.set(side * 4.8, 2.75, -11.22);
    r1Group.add(pilaster);
  }

  // Lower obsidian wainscoting dado panels + brushed-gold ledge below screen
  const stageDadoMat = new THREE.MeshStandardMaterial({ color: 0x0b101c, roughness: 0.55, metalness: 0.25 });
  const stageDado = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.62, 0.14), stageDadoMat);
  stageDado.position.set(0, 0.84, -11.24);
  r1Group.add(stageDado);

  const stageDadoTrim = new THREE.Mesh(new THREE.BoxGeometry(9.72, 0.05, 0.16), labTrimGoldMat);
  stageDadoTrim.position.set(0, 1.15, -11.22);
  r1Group.add(stageDadoTrim);

  // Upper Crown Valance & Warm Champagne LED Cove Strip above Jumbotron
  const topValance = new THREE.Mesh(
    new THREE.BoxGeometry(10.6, 0.22, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x0a0f1c, roughness: 0.4, metalness: 0.5 })
  );
  topValance.position.set(0, 5.18, -11.22);
  r1Group.add(topValance);

  const topCoveStrip = new THREE.Mesh(
    new THREE.BoxGeometry(9.5, 0.04, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    })
  );
  topCoveStrip.position.set(0, 5.06, -11.12);
  r1Group.add(topCoveStrip);

  // Side Portal Frames flanking Stage leading into Private Grading Room (West lx = -7.7..-5.4, East lx = +5.4..+7.7)
  [-6.55, 6.55].forEach((px) => {
    const portalHeader = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.75, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    portalHeader.position.set(px, 4.45, -11.4);
    r1Group.add(portalHeader);

    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.14, 0.3), labTrimGoldMat);
    portalTrim.position.set(px, 3.6, -11.4);
    r1Group.add(portalTrim);

    const portalSignFront = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.72),
      new THREE.MeshBasicMaterial({
        map: createSignTex(
          'PHÒNG CHẤM ĐIỂM RIÊNG',
          'PRIVATE LAB • PSA / CGC / BGS →',
          '#070b14',
          '#38bdf8',
          '#fbbf24',
          '#38bdf8'
        ),
      })
    );
    portalSignFront.position.set(px, 4.25, -11.26);
    r1Group.add(portalSignFront);

    const portalSignBack = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.72),
      new THREE.MeshBasicMaterial({
        map: createSignTex(
          '← LỐI RA SÀN ĐẤU GIÁ VIP',
          'GRAND AUCTION SHOWROOM',
          '#070b14',
          '#fbbf24',
          '#38bdf8',
          '#fbbf24'
        ),
      })
    );
    portalSignBack.position.set(px, 4.25, -11.54);
    portalSignBack.rotation.y = Math.PI;
    r1Group.add(portalSignBack);
  });

  const jumboCanvas = document.createElement('canvas');
  jumboCanvas.width = 2048;
  jumboCanvas.height = 790;
  const jumboCtx = jumboCanvas.getContext('2d')!;
  drawAuctionJumbotronCanvas(jumboCtx, jumboCanvas.width, jumboCanvas.height, null);
  const jumboTex = new THREE.CanvasTexture(jumboCanvas);
  jumboTex.colorSpace = THREE.SRGBColorSpace;
  jumboTex.anisotropy = 8;

  const jumboOuterChassis = new THREE.Mesh(
    new THREE.BoxGeometry(9.64, 3.92, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x0b0f19, roughness: 0.28, metalness: 0.75 })
  );
  jumboOuterChassis.position.set(0, 3.16, -11.24);
  r1Group.add(jumboOuterChassis);

  const jumboBorder = new THREE.Mesh(new THREE.BoxGeometry(9.44, 3.74, 0.14), labTrimGoldMat);
  jumboBorder.position.set(0, 3.16, -11.22);
  r1Group.add(jumboBorder);

  const jumboFrame = new THREE.Mesh(
    new THREE.BoxGeometry(9.34, 3.65, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x050810, roughness: 0.35, metalness: 0.65 })
  );
  jumboFrame.position.set(0, 3.16, -11.2);
  r1Group.add(jumboFrame);

  const jumboScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 3.55),
    new THREE.MeshBasicMaterial({ map: jumboTex })
  );
  jumboScreen.position.set(0, 3.16, -11.11);
  jumboScreen.userData.noMerge = true;
  r1Group.add(jumboScreen);

  // VIP Whale Bidder Luxury Armchairs + 6 Animated Whale Bidders (Wings West & East at World Z = -3.6..-1.0 -> lz = +2.6..+5.2)
  const auctionBidderNpcs: GradingAuctionBidderHandle[] = [];
  const vipArmchairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.62 });
  const bidderSeeds = [
    { lx: -3.35, lz: 2.6, shirt: 0x7c2d12, hair: 0x1c1917, skin: 0xffdfc4, hex: '#ffdfc4' },
    { lx: -4.85, lz: 2.6, shirt: 0x312e81, hair: 0x451a03, skin: 0xf1c27d, hex: '#f1c27d' },
    { lx: -3.35, lz: 5.0, shirt: 0x831843, hair: 0x09090b, skin: 0xffe4cf, hex: '#ffe4cf' },
    { lx: 3.35, lz: 2.6, shirt: 0x064e3b, hair: 0x1c1917, skin: 0xffe4cf, hex: '#ffe4cf' },
    { lx: 4.85, lz: 2.6, shirt: 0x713f12, hair: 0x78350f, skin: 0xffdfc4, hex: '#ffdfc4' },
    { lx: 3.35, lz: 5.0, shirt: 0x1e3a8a, hair: 0x334155, skin: 0xf1c27d, hex: '#f1c27d' },
  ];

  // Static extra luxury chairs in second rows so wings look full (4x2 = 8 total chairs)
  [
    [-4.85, 5.0],
    [4.85, 5.0],
  ].forEach(([cx, cz]) => {
    const riser = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.36, 0.72), vipArmchairMat);
    riser.position.set(cx, 0.24, cz);
    r1Group.add(riser);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.75, 0.14), vipArmchairMat);
    back.position.set(cx, 0.65, cz + 0.32);
    r1Group.add(back);
  });

  bidderSeeds.forEach((bs, bIdx) => {
    const sideArm = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.34, 0.68), vipArmchairMat);
    sideArm.position.set(bs.lx, 0.18, bs.lz);
    r1Group.add(sideArm);

    const npcBuild = buildGradingNpc({
      shirtColor: bs.shirt,
      pantsColor: 0x0f172a,
      hairColor: bs.hair,
      skinColor: bs.skin,
      skinHex: bs.hex,
      badgeColor: 0xfbbf24,
      seated: true,
      hasPaddle: true,
    });
    npcBuild.npc.position.set(bs.lx, 0.05, bs.lz);
    npcBuild.npc.rotation.y = Math.PI; // Facing North toward Stage!
    npcBuild.npc.userData.noMerge = true;
    r1Group.add(npcBuild.npc);

    auctionBidderNpcs.push({
      group: npcBuild.npc,
      head: npcBuild.headGroup,
      rightArm: npcBuild.rightArm,
      baseY: 0.05,
      phase: bIdx * 1.45,
    });
  });

  // ==========================================
  // ZONE 3: PRIVATE REAR OPTICAL GRADING LAB ROOM (World Z = -28.0..-18.0 => lz = -21.8..-11.8)
  // Quiet back room behind the stage, accessed freely via West or East side corridors!
  // ==========================================
  const specialistOffsetsX = [-5.4, -2.5, 0.4, 3.3];
  const specialistHairColors = [0x1c1917, 0x78350f, 0xd97706, 0x334155];
  const specialistSkinColors = [
    { col: 0xffdfc4, hex: '#ffdfc4' },
    { col: 0xf1c27d, hex: '#f1c27d' },
    { col: 0xffe4cf, hex: '#ffe4cf' },
    { col: 0xc68642, hex: '#c68642' },
  ];
  const specialistNpcGroups: GradingSpecialistHandle[] = [];
  const deskZ = -18.0; // World Z = -24.2
  const laserSweepBaseZ = -17.92;

  specialistOffsetsX.forEach((sx, idx) => {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(sx, 0, deskZ);

    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.06, 0.92),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.72 })
    );
    deskTop.position.set(0, 0.78, 0);
    deskGroup.add(deskTop);

    [-0.86, 0.86].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.76, 0.82), labFrameMat);
      leg.position.set(lx, 0.38, 0);
      deskGroup.add(leg);
    });

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    });
    const padMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.025, 0.34), padMat);
    padMesh.position.set(0, 0.825, 0.08);
    deskGroup.add(padMesh);

    const laserSweep = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.012, 0.016),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 })
    );
    laserSweep.position.set(sx, 0.845, laserSweepBaseZ);
    laserSweep.userData.noMerge = true;
    r1Group.add(laserSweep);

    const armPost = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.48, 8), labFrameMat);
    armPost.position.set(-0.34, 1.03, -0.2);
    deskGroup.add(armPost);
    const armBeam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.03), labFrameMat);
    armBeam.position.set(-0.16, 1.24, -0.06);
    armBeam.rotation.y = -0.5;
    deskGroup.add(armBeam);
    const microscopeHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.14, 10), labFrameMat);
    microscopeHead.position.set(0, 1.21, 0.08);
    deskGroup.add(microscopeHead);
    const loupeRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 16), labTrimGoldMat);
    loupeRing.position.set(0, 1.13, 0.08);
    loupeRing.rotation.x = Math.PI / 2.2;
    deskGroup.add(loupeRing);

    const monBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.34, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.4 })
    );
    monBody.position.set(0.56, 1.0, -0.26);
    deskGroup.add(monBody);
    const monScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.3),
      new THREE.MeshBasicMaterial({ map: createDeskMonitorTex(idx), side: THREE.DoubleSide })
    );
    monScreen.position.set(0.56, 1.0, -0.238);
    deskGroup.add(monScreen);

    const sealer = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.24, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.55 })
    );
    sealer.position.set(-0.62, 0.93, -0.04);
    deskGroup.add(sealer);

    const welderLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.35,
    });
    const welderLed = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), welderLedMat);
    welderLed.position.set(-0.62, 1.06, 0.07);
    deskGroup.add(welderLed);

    r1Group.add(deskGroup);

    const specBuild = buildGradingNpc({
      shirtColor: 0xf8fafc,
      pantsColor: 0x1e293b,
      hairColor: specialistHairColors[idx % specialistHairColors.length],
      skinColor: specialistSkinColors[idx % specialistSkinColors.length].col,
      skinHex: specialistSkinColors[idx % specialistSkinColors.length].hex,
      badgeColor: 0x0ea5e9,
      seated: true,
      hasGlasses: true,
    });
    specBuild.npc.position.set(sx, 0, -18.85);
    specBuild.npc.visible = idx < hiredSpecialistsCount;
    specBuild.npc.userData.noMerge = true;
    r1Group.add(specBuild.npc);

    specialistNpcGroups.push({
      group: specBuild.npc,
      head: specBuild.headGroup,
      rightArm: specBuild.rightArm,
      padMat,
      laserSweep,
      laserSweepBaseZ,
      welderLedMat,
    });
  });

  // North Rear Wall of Private Grading Lab (lz = -21.45 -> World Z = -27.65):
  // 1. Vault 01 High-Security Door (lx = -5.5)
  const vaultDoorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 2.75, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72, roughness: 0.35 })
  );
  vaultDoorFrame.position.set(-5.5, 1.38, -21.46);
  r1Group.add(vaultDoorFrame);
  const vaultPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.35),
    new THREE.MeshBasicMaterial({ map: createVaultDoorTex() })
  );
  vaultPlate.position.set(-5.5, 1.38, -21.39);
  r1Group.add(vaultPlate);

  // 2. Optical Protocol Display on Center-North Rear Wall (lx = -0.8)
  const wallBoardFrame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.25, 0.08), labFrameMat);
  wallBoardFrame.position.set(-0.8, 2.65, -21.46);
  r1Group.add(wallBoardFrame);
  const wallBoardScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.05),
    new THREE.MeshBasicMaterial({ map: createLabBackWallPanelTex() })
  );
  wallBoardScreen.position.set(-0.8, 2.65, -21.4);
  r1Group.add(wallBoardScreen);

  // 3. Ultrasonic Encapsulator & Pop Report Terminal at NE Rear Corner (lx = +5.7, lz = -20.5 -> World X=26.7, Z=-26.7)
  const termBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 1.05, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.45 })
  );
  termBase.position.set(5.7, 0.525, -20.5);
  r1Group.add(termBase);

  const termGold = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.72), labTrimGoldMat);
  termGold.position.set(5.7, 1.07, -20.5);
  r1Group.add(termGold);

  const termScreenHousing = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.84, 0.08), labFrameMat);
  termScreenHousing.position.set(5.7, 1.62, -20.8);
  r1Group.add(termScreenHousing);
  const termScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.32, 0.74),
    new THREE.MeshBasicMaterial({ map: createTerminalHudTex() })
  );
  termScreen.position.set(5.7, 1.62, -20.75);
  r1Group.add(termScreen);

  const encapsulationDrum = new THREE.Group();
  encapsulationDrum.position.set(5.7, 1.34, -20.43);
  encapsulationDrum.userData.noMerge = true;
  const drumGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 16), museumGlassEnclosureMat);
  encapsulationDrum.add(drumGlass);
  const drumCardCore = createViewOnlySlab10Stand(3, 0, 'cgc_pristine');
  drumCardCore.scale.set(0.85, 0.85, 0.85);
  drumCardCore.position.set(0, -0.15, 0);
  encapsulationDrum.add(drumCardCore);
  r1Group.add(encapsulationDrum);

  // ==========================================
  // DYNAMIC HALL OF GRAILS SHOWROOM WALL CASES (WEST & EAST WALLS IN AUCTION HALL)
  // Displays player's own graded slabs dynamically via updateShowroomGrailTextures()
  // ==========================================
  const dynamicShowroomSlots: Array<{
    mat: THREE.MeshStandardMaterial;
    card: PokemonCard;
  }> = [];

  const buildShowroomGrailWallCase = (side: 'west' | 'east', caseIdxStart: number) => {
    const cg = new THREE.Group();
    cg.position.set(side === 'west' ? -7.24 : 7.24, 0, 10.4); // World Z = +4.2
    cg.rotation.y = side === 'west' ? Math.PI / 2 : -Math.PI / 2;

    const base = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.66, 0.64), museumCabinetBodyMat);
    base.position.set(0, 0.33, 0);
    cg.add(base);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(6.04, 0.04, 0.68), labTrimGoldMat);
    trim.position.set(0, 0.67, 0);
    cg.add(trim);
    const back = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.25, 0.06), museumCabinetBodyMat);
    back.position.set(0, 1.8, -0.28);
    cg.add(back);
    const velvet = new THREE.Mesh(new THREE.PlaneGeometry(5.82, 2.08), royalCrimsonMat);
    velvet.position.set(0, 1.78, -0.245);
    cg.add(velvet);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.04, 0.3, 0.68), museumCabinetBodyMat);
    canopy.position.set(0, 2.98, 0);
    cg.add(canopy);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 0.24),
      new THREE.MeshBasicMaterial({
        map: createSignTex(
          side === 'west' ? 'YOUR HALL OF GRAILS // BỘ SƯU TẬP SLAB' : 'BLACK LABEL & PRISTINE VAULT ARCHIVE',
          'TRƯNG BÀY TỰ ĐỘNG TỪ KHO SLAB CỦA BẠN',
          '#070b14',
          '#fbbf24',
          '#38bdf8'
        ),
      })
    );
    plaque.position.set(0, 2.98, 0.35);
    cg.add(plaque);

    const shelfHeights = [0.74, 1.65];
    shelfHeights.forEach((sy, rowIdx) => {
      if (rowIdx > 0) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.84, 0.025, 0.54), museumShelfGlassMat);
        shelf.position.set(0, sy - 0.015, -0.02);
        cg.add(shelf);
      }
      for (let c = 0; c < 4; c++) {
        const xSlot = -2.1 + c * 1.4;
        const poolCard = museumSlabPool[(caseIdxStart + rowIdx * 4 + c) % museumSlabPool.length];
        const stand = new THREE.Group();
        stand.position.set(xSlot, sy, 0.02);

        const sBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.14), labTrimGoldMat);
        sBase.position.set(0, 0.01, 0);
        stand.add(sBase);

        const initTex = createShowcaseCardTexture(poolCard, {
          company: rowIdx === 0 ? 'BGS' : 'PSA',
          grade: 10,
          gradeLabel: rowIdx === 0 ? 'BLACK LABEL 10' : 'GEM MT 10',
          certNumber: `0099${String(caseIdxStart + c * 17).padStart(6, '0')}`,
          year: 2026,
          slabGuardColor: rowIdx === 0 ? 'gold' : 'crimson',
        });
        const slotMat = new THREE.MeshStandardMaterial({
          map: initTex,
          roughness: 0.62,
          metalness: 0.06,
          side: THREE.FrontSide,
        });
        const cardMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.616), slotMat);
        cardMesh.position.set(0, 0.36, 0.02);
        cardMesh.rotation.x = -0.1;
        cardMesh.userData.noMerge = true;
        stand.add(cardMesh);

        dynamicShowroomSlots.push({ mat: slotMat, card: poolCard });
        cg.add(stand);
      }
    });

    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(5.88, 2.1, 0.025), museumGlassEnclosureMat);
    frontGlass.position.set(0, 1.78, 0.31);
    cg.add(frontGlass);

    r1Group.add(cg);
  };

  buildShowroomGrailWallCase('west', 0);
  buildShowroomGrailWallCase('east', 10);

  // ==========================================
  // EXTERIOR SIDEWALK VITRINE TROPHY PILLARS & BENCH
  // ==========================================
  const exteriorPropsGroup = new THREE.Group();
  [18.4, 23.6].forEach((px, pIdx) => {
    const pillarBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 1.05, 0.68),
      new THREE.MeshStandardMaterial({ map: slateTex, color: 0xffffff, roughness: 0.55 })
    );
    pillarBase.position.set(px, 0.525, 16.1);
    exteriorPropsGroup.add(pillarBase);

    const pillarCollar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.72), labTrimGoldMat);
    pillarCollar.position.set(px, 1.07, 16.1);
    exteriorPropsGroup.add(pillarCollar);

    const trophyStand = createViewOnlySlab10Stand(pIdx === 0 ? 0 : 1, 0, pIdx === 1 ? 'bgs_black' : 'auto');
    trophyStand.scale.set(1.25, 1.25, 1.25);
    trophyStand.position.set(px, 1.11, 16.1);
    exteriorPropsGroup.add(trophyStand);

    const glassHood = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.42), museumGlassEnclosureMat);
    glassHood.position.set(px, 1.42, 16.1);
    exteriorPropsGroup.add(glassHood);

    const hoodCap = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.03, 0.44), labTrimGoldMat);
    hoodCap.position.set(px, 1.74, 16.1);
    exteriorPropsGroup.add(hoodCap);
  });

  const benchGroup = new THREE.Group();
  benchGroup.position.set(16.2, 0, 17.2);
  const benchIronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });

  [-0.8, 0.8].forEach((bx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.5), benchIronMat);
    leg.position.set(bx, 0.25, 0);
    benchGroup.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), benchIronMat);
    arm.position.set(bx, 0.65, -0.22);
    benchGroup.add(arm);
  });

  for (let s = -0.18; s <= 0.18; s += 0.12) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.09), benchWoodMat);
    slat.position.set(0, 0.48, s);
    benchGroup.add(slat);
  }
  for (let b = 0.62; b <= 0.86; b += 0.12) {
    const bSlat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.04), benchWoodMat);
    bSlat.position.set(0, b, -0.22);
    benchGroup.add(bSlat);
  }
  exteriorPropsGroup.add(benchGroup);

  // ==========================================
  // LIVE UPDATER FUNCTIONS FOR AUCTION JUMBOTRON & PLAYER HALL OF GRAILS
  // ==========================================
  let lastAuctionBoardSig = '';
  const updateAuctionBoard = (
    lot: SlabAuctionLot | null,
    trend?: DailyMarketTrend,
    scheduleStatus?: {
      isOpen: boolean;
      isPrimeTime: boolean;
      auctioneerHired: boolean;
      auctionHostHired?: boolean;
    }
  ) => {
    const sig = lot
      ? `${lot.id}:${lot.currentBid}:${lot.bidCount}:${lot.status}:${Math.ceil(lot.remainingMs / 1000)}:${trend?.id || ''}:${scheduleStatus?.isPrimeTime ? 1 : 0}`
      : `idle:${trend?.id || ''}:${scheduleStatus?.isOpen ? 1 : 0}:${scheduleStatus?.isPrimeTime ? 1 : 0}:${scheduleStatus?.auctioneerHired ? 1 : 0}:${scheduleStatus?.auctionHostHired ? 1 : 0}`;
    if (sig === lastAuctionBoardSig) return;
    lastAuctionBoardSig = sig;

    drawAuctionJumbotronCanvas(jumboCtx, jumboCanvas.width, jumboCanvas.height, lot, trend, scheduleStatus);
    jumboTex.needsUpdate = true;

    if (lot) {
      featuredSlabMat.map = createShowcaseCardTexture(lot.entry.card, {
        company: lot.entry.slab.company,
        grade: lot.entry.slab.grade,
        gradeLabel: lot.entry.slab.gradeLabel,
        certNumber: lot.entry.slab.certNumber,
        year: lot.entry.slab.year,
        slabGuardColor: lot.entry.slab.slabGuardColor,
      });
      featuredSlabMat.needsUpdate = true;
    }
  };

  let lastShowroomSig = '';
  const updateShowroomGrailTextures = (entries: Array<{ card: PokemonCard; slab: GradedSlab }>) => {
    const sig = entries
      .slice(0, dynamicShowroomSlots.length)
      .map((e) => `${e.card.id}:${e.slab.certNumber}:${e.slab.slabGuardColor || ''}`)
      .join('|');
    if (!sig || sig === lastShowroomSig) return;
    lastShowroomSig = sig;

    for (let i = 0; i < dynamicShowroomSlots.length && i < entries.length; i++) {
      const target = entries[i];
      const slot = dynamicShowroomSlots[i];
      slot.mat.map = createShowcaseCardTexture(target.card, {
        company: target.slab.company,
        grade: target.slab.grade,
        gradeLabel: target.slab.gradeLabel,
        certNumber: target.slab.certNumber,
        year: target.slab.year,
        slabGuardColor: target.slab.slabGuardColor,
      });
      slot.mat.needsUpdate = true;
    }
  };

  return {
    r1Group,
    exteriorPropsGroup,
    gradingDoorLeft,
    gradingDoorRight,
    gradingLockBarrierGroup,
    receptionistNpcGroup,
    receptionistHead: recBuild.headGroup,
    receptionistArm: recBuild.rightArm,
    specialistNpcGroups,
    visitorNpcs,
    encapsulationDrum,
    neonMats,
    pointLight,
    extraLights,
    interiorPointLights,
    auctioneerNpcGroup,
    auctioneerHead: aucBuild.headGroup,
    auctioneerRightArm: aucBuild.rightArm,
    auctionHostNpcGroup,
    auctionHostHead: hostBuild.headGroup,
    auctionHostRightArm: hostBuild.rightArm,
    auctionBidderNpcs,
    auctionTurntables,
    updateAuctionBoard,
    updateShowroomGrailTextures,
  };
}
