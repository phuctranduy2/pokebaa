import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Crosshair,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  RotateCw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CITY_AREAS,
  CITY_BUILDINGS,
  CITY_POIS,
  CITY_ROADS,
  CITY_WORLD_BOUNDS,
  computeCityGpsRoute,
  detectCurrentCityZone,
  type BuildingCategory,
  type CityPoi,
  type GpsRouteResult,
  type MinimapSnapshot,
  type PoiFilterGroup,
} from '../game/cityMapData';
import { PARK_BUS_STOPS } from '../game/CityBusSystem';

export type RadarStylePreset = 'gta6' | 'gta5' | 'san_andreas';

export interface ActiveWaypoint {
  id: string;
  name: string;
  x: number;
  z: number;
  category?: BuildingCategory;
}

interface CityMinimapHudProps {
  poseRef: React.MutableRefObject<MinimapSnapshot>;
  subscribePose: (cb: () => void) => () => void;
  isTouchDevice: boolean;
  isHiddenByModal: boolean;
  isFullMapOpen: boolean;
  onSetFullMapOpen: (open: boolean) => void;
  externalWaypoint?: ActiveWaypoint | null;
  deliveryMarker?: { x: number; z: number; label: string; isVip?: boolean } | null;
  cityHuntMarkers?: Array<{ id: string; x: number; z: number; label: string }>;
}

interface RadarThemePalette {
  bg: string;
  land: string;
  water: string;
  waterBank: string;
  park: string;
  plaza: string;
  road: string;
  roadBridge: string;
  roadCenterLine: string;
  buildingFill: Record<BuildingCategory, string>;
  buildingStroke: string;
  routeGlow: string;
  routeCore: string;
  frameBorder: string;
}

const RADAR_THEMES: Record<RadarStylePreset, RadarThemePalette> = {
  gta6: {
    bg: '#161b26',
    land: '#202634',
    water: '#1e4e6e',
    waterBank: '#2c3d4f',
    park: '#213a32',
    plaza: '#2b3242',
    road: '#343c4d',
    roadBridge: '#4a5568',
    roadCenterLine: 'rgba(226, 232, 240, 0.24)',
    buildingFill: {
      home: '#d97706',
      commerce: '#4b556b',
      tech: '#385778',
      luxury: '#6b4f75',
      nightlife: '#7c3a5c',
      food: '#75533e',
      civic: '#3f6270',
      residence: '#465066',
      landmark: '#58627a',
    },
    buildingStroke: 'rgba(148, 163, 184, 0.28)',
    routeGlow: 'rgba(244, 114, 182, 0.45)',
    routeCore: '#f472b6',
    frameBorder: 'rgba(203, 213, 225, 0.48)',
  },
  gta5: {
    bg: '#0f131a',
    land: '#1c222d',
    water: '#163b5c',
    waterBank: '#273445',
    park: '#1e3528',
    plaza: '#252c38',
    road: '#0b0e14',
    roadBridge: '#2d3748',
    roadCenterLine: 'rgba(148, 163, 184, 0.22)',
    buildingFill: {
      home: '#f59e0b',
      commerce: '#333d4f',
      tech: '#294866',
      luxury: '#4f3b59',
      nightlife: '#5e2c49',
      food: '#5c4232',
      civic: '#2e5461',
      residence: '#3b4559',
      landmark: '#48546b',
    },
    buildingStroke: 'rgba(226, 232, 240, 0.22)',
    routeGlow: 'rgba(192, 132, 252, 0.48)',
    routeCore: '#c084fc',
    frameBorder: 'rgba(39, 46, 61, 0.95)',
  },
  san_andreas: {
    bg: '#101414',
    land: '#5c665a',
    water: '#1c6ea4',
    waterBank: '#8a8568',
    park: '#2f6d31',
    plaza: '#787d74',
    road: '#141619',
    roadBridge: '#4a4e54',
    roadCenterLine: 'rgba(255, 255, 255, 0.25)',
    buildingFill: {
      home: '#facc15',
      commerce: '#d4d8dd',
      tech: '#a5c4d4',
      luxury: '#d8c2e0',
      nightlife: '#e0aec8',
      food: '#dfbe9f',
      civic: '#a6d4d0',
      residence: '#c4cad1',
      landmark: '#e5e7eb',
    },
    buildingStroke: '#18181b',
    routeGlow: 'rgba(250, 204, 21, 0.45)',
    routeCore: '#facc15',
    frameBorder: '#09090b',
  },
};

const POI_BADGE_COLORS: Record<BuildingCategory, string> = {
  home: '#f59e0b',
  commerce: '#38bdf8',
  tech: '#0ea5e9',
  luxury: '#c084fc',
  nightlife: '#ec4899',
  food: '#fb923c',
  civic: '#ef4444',
  residence: '#94a3b8',
  landmark: '#facc15',
};

const MARKET_POI_IDS = new Set(['poi_market_north', 'poi_market_south']);
const MARKET_BUILDING_IDS = new Set(['wr_n2_b3', 'wr_s2_b3']);

function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

const FILTER_TABS: Array<{ id: PoiFilterGroup; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'home_civic', label: 'Cửa Tiệm & Y Tế' },
  { id: 'food_nightlife', label: 'Ăn Uống & Chợ' },
  { id: 'luxury_fashion', label: 'Luxury & Mall' },
  { id: 'tech_auto', label: 'Công Nghệ & Xe' },
  { id: 'landmark_park', label: 'Cầu & Công Trình' },
];

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawCitySceneLayers(
  ctx: CanvasRenderingContext2D,
  palette: RadarThemePalette,
  options: {
    showBuildingLabels: boolean;
    showStreetLabels: boolean;
    pixelsPerMeter: number;
  }
) {
  const { showBuildingLabels, showStreetLabels, pixelsPerMeter } = options;

  // 0. Subtle Cartographic Grid on Full Map (100m spacing covering Biển Mỹ Khê Tây -> Far East)
  if (showStreetLabels) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.045)';
    ctx.lineWidth = Math.max(0.5, 0.8 / pixelsPerMeter);
    for (let gx = -1600; gx <= 1000; gx += 100) {
      ctx.beginPath();
      ctx.moveTo(gx, -800);
      ctx.lineTo(gx, 900);
      ctx.stroke();
    }
    for (let gz = -800; gz <= 900; gz += 100) {
      ctx.beginPath();
      ctx.moveTo(-1600, gz);
      ctx.lineTo(1100, gz);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 1. Areas: Seamless Western Ocean, Sông Hàn River, Golden Beach Sand, Parks, Plazas, Pools
  for (let i = 0; i < CITY_AREAS.length; i++) {
    const a = CITY_AREAS[i];
    const w = a.maxX - a.minX;
    const h = a.maxZ - a.minZ;
    if (a.kind === 'water') {
      if (a.id === 'west_ocean_sea') {
        // Western Ocean (Biển Mỹ Khê Tây): extend seamlessly WEST off-canvas, NEVER east under the city!
        const extMinX = a.minX - 1800;
        const extMaxX = a.maxX;
        const extW = extMaxX - extMinX;
        const extMinZ = a.minZ - 900;
        const extH = h + 1800;

        const oceanGrad = ctx.createLinearGradient(extMinX + 1500, 0, extMaxX, 0);
        oceanGrad.addColorStop(0, '#0c4a6e');
        oceanGrad.addColorStop(0.62, palette === RADAR_THEMES.san_andreas ? '#1d76ae' : '#1b5f87');
        oceanGrad.addColorStop(0.92, '#0ea5c9');
        oceanGrad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(extMinX, extMinZ, extW, extH);

        // Crisp surf foam line along eastern shoreline (maxX = -1032)
        ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
        ctx.fillRect(extMaxX - 3.2, extMinZ, 3.2, extH);

        // Subtle north-south ocean current swell streaks strictly inside the ocean
        ctx.save();
        ctx.beginPath();
        ctx.rect(extMinX, extMinZ, extW - 4, extH);
        ctx.clip();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.11)';
        ctx.lineWidth = Math.max(0.7, 1.3 / pixelsPerMeter);
        ctx.setLineDash([22, 30]);
        for (let rx = extMaxX - 18; rx > extMaxX - 520; rx -= 24) {
          const offset = ((Math.abs(Math.round(rx)) * 17) % 44);
          ctx.beginPath();
          ctx.moveTo(rx, extMinZ + offset);
          ctx.lineTo(rx, extMinZ + extH);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Sông Hàn River: extend seamlessly East beyond viewport while keeping West NW terrain (-960..-360) dry
        const extMinX = a.minX;
        const extW = 575 - extMinX + 1800;
        ctx.fillStyle = palette.waterBank;
        ctx.fillRect(extMinX, a.minZ - 3.6, extW, h + 7.2);

        const riverGrad = ctx.createLinearGradient(0, a.minZ, 0, a.maxZ);
        riverGrad.addColorStop(0, palette.water);
        riverGrad.addColorStop(0.5, palette === RADAR_THEMES.san_andreas ? '#227bb5' : '#235e84');
        riverGrad.addColorStop(1, palette.water);
        ctx.fillStyle = riverGrad;
        ctx.fillRect(extMinX, a.minZ, extW, h);

        // Gentle stylized river current streaks (positive modulo so lines never poke left of extMinX!)
        ctx.save();
        ctx.beginPath();
        ctx.rect(extMinX, a.minZ, extW, h);
        ctx.clip();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.085)';
        ctx.lineWidth = Math.max(0.7, 1.3 / pixelsPerMeter);
        ctx.setLineDash([18, 28]);
        for (let rz = a.minZ + 16; rz < a.maxZ - 12; rz += 20) {
          const offset = (((Math.round(rz) * 13) % 40) + 40) % 40;
          ctx.beginPath();
          ctx.moveTo(extMinX + offset, rz);
          ctx.lineTo(extMinX + extW, rz);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (a.id === 'west_golden_beach_sand') {
      // Warm golden sandy beach strip between Ocean (-1032) and Coastal Promenade (-996)
      const sandGrad = ctx.createLinearGradient(a.minX, 0, a.maxX, 0);
      sandGrad.addColorStop(0, '#b5975c');
      sandGrad.addColorStop(0.35, '#d6bc82');
      sandGrad.addColorStop(1, '#e2ca93');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(a.minX, a.minZ, w, h);
    } else if (a.kind === 'park') {
      ctx.fillStyle = palette.park;
      drawRoundedRectPath(ctx, a.minX, a.minZ, w, h, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.22)';
      ctx.lineWidth = Math.max(0.4, 0.9 / pixelsPerMeter);
      ctx.stroke();

      // Stylized park tree canopy clusters
      ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
      const cols = Math.max(2, Math.floor(w / 13));
      const rows = Math.max(2, Math.floor(h / 13));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const tx = a.minX + ((c + 0.5) / cols) * w;
          const tz = a.minZ + ((r + 0.5) / rows) * h;
          ctx.beginPath();
          ctx.arc(tx, tz, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (a.kind === 'parking') {
      ctx.fillStyle = palette.plaza;
      ctx.fillRect(a.minX, a.minZ, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = Math.max(0.35, 0.9 / pixelsPerMeter);
      ctx.strokeRect(a.minX, a.minZ, w, h);
    } else {
      ctx.fillStyle = palette.plaza;
      ctx.fillRect(a.minX, a.minZ, w, h);
      // Peri Pool blue water rectangle
      if (a.id === 'peri_pool_plaza') {
        ctx.fillStyle = '#0ea5e9';
        drawRoundedRectPath(ctx, a.minX + 3.2, a.minZ + 3.5, w - 6.4, h - 7, 1.5);
        ctx.fill();
      }
    }
  }

  // 2. Seamless 4-Pass Road Architecture (Sidewalks -> Asphalt -> Dashes -> Bridges)
  // Pass 1: Sidewalk / Curb Casing on non-bridge roads
  for (let i = 0; i < CITY_ROADS.length; i++) {
    const r = CITY_ROADS[i];
    if (r.kind === 'bridge') continue;
    ctx.save();
    ctx.lineCap = r.kind === 'alley' ? 'butt' : 'round';
    ctx.beginPath();
    ctx.moveTo(r.x1, r.z1);
    ctx.lineTo(r.x2, r.z2);
    ctx.strokeStyle =
      r.kind === 'alley'
        ? palette === RADAR_THEMES.san_andreas
          ? '#40473f'
          : 'rgba(148, 163, 184, 0.28)'
        : palette === RADAR_THEMES.san_andreas
          ? '#363b36'
          : 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = r.kind === 'alley' ? r.width + 1.8 : r.width + 3.6;
    ctx.stroke();
    ctx.restore();
  }

  // Pass 2: Seamless Asphalt Fill on all non-bridge roads (merges T/4-way intersections cleanly)
  for (let i = 0; i < CITY_ROADS.length; i++) {
    const r = CITY_ROADS[i];
    if (r.kind === 'bridge') continue;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(r.x1, r.z1);
    ctx.lineTo(r.x2, r.z2);
    ctx.strokeStyle = r.kind === 'alley' ? '#475569' : palette.road;
    ctx.lineWidth = r.width;
    ctx.stroke();
    ctx.restore();
  }

  // Pass 3: Dashed Lane Dividers + Clean Junction Boxes (so dashes don't overlap inside intersections)
  if (pixelsPerMeter >= 0.35) {
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = palette.roadCenterLine;
    ctx.lineWidth = Math.max(0.55, 0.9 / pixelsPerMeter);
    ctx.setLineDash([4.8, 5.2]);
    for (let i = 0; i < CITY_ROADS.length; i++) {
      const r = CITY_ROADS[i];
      if (r.kind === 'bridge' || r.kind === 'alley') continue;
      ctx.beginPath();
      ctx.moveTo(r.x1, r.z1);
      ctx.lineTo(r.x2, r.z2);
      ctx.stroke();
    }
    // Thin crisp lane dividers along every alley lane ("chia lane hẻm trên map")
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.58)';
    ctx.lineWidth = Math.max(0.45, 0.68 / pixelsPerMeter);
    ctx.setLineDash([2.6, 3.2]);
    for (let i = 0; i < CITY_ROADS.length; i++) {
      const r = CITY_ROADS[i];
      if (r.kind !== 'alley') continue;
      ctx.beginPath();
      ctx.moveTo(r.x1, r.z1);
      ctx.lineTo(r.x2, r.z2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Clean junction patches + subtle crosswalk stripes at major intersections
    const junctions = [
      { x: -227.5, z: 29.0 },
      { x: -227.5, z: -117.5 },
      { x: 193.5, z: 29.0 },
      { x: 193.5, z: -117.5 },
      { x: 193.5, z: -362.0 },
      { x: 193.5, z: 148.0 },
      { x: 193.5, z: 344.0 },
      { x: 370.0, z: 29.0 },
      { x: 370.0, z: 148.0 },
      { x: 370.0, z: 344.0 },
      { x: 370.0, z: -117.5 },
      { x: 370.0, z: -362.0 },
      { x: 503.0, z: 29.0 },
      { x: 503.0, z: 148.0 },
      { x: 503.0, z: 344.0 },
      { x: 503.0, z: -117.5 },
      { x: 503.0, z: -362.0 },
    ];
    for (const j of junctions) {
      ctx.fillStyle = palette.road;
      ctx.fillRect(j.x - 8.4, j.z - 8.4, 16.8, 16.8);
    }
    ctx.restore();
  }

  // Pass 4: Bridges Over Sông Hàn (Swing Pylon, Dragon Arch Spine & Trần Thị Lý Red Cable Sail)
  for (let i = 0; i < CITY_ROADS.length; i++) {
    const r = CITY_ROADS[i];
    if (r.kind !== 'bridge') continue;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(r.x1, r.z1);
    ctx.lineTo(r.x2, r.z2);

    // Outer bridge guard rail glow
    ctx.strokeStyle =
      r.id === 'dragon_bridge'
        ? 'rgba(250, 204, 21, 0.55)'
        : r.id === 'tran_thi_ly_bridge'
          ? 'rgba(226, 162, 145, 0.72)'
          : 'rgba(56, 189, 248, 0.42)';
    ctx.lineWidth = r.width + 3.2;
    ctx.stroke();

    // Bridge deck surface
    ctx.strokeStyle = palette.roadBridge;
    ctx.lineWidth = r.width;
    ctx.stroke();

    // Center arch / cable sail spine
    ctx.strokeStyle =
      r.id === 'dragon_bridge'
        ? 'rgba(250, 204, 21, 0.85)'
        : r.id === 'tran_thi_ly_bridge'
          ? 'rgba(248, 250, 252, 0.92)'
          : 'rgba(186, 230, 253, 0.65)';
    ctx.lineWidth = r.id === 'dragon_bridge' || r.id === 'tran_thi_ly_bridge' ? 2.2 : 1.4;
    ctx.stroke();

    // Cầu Sông Hàn central rotary swing pylon, Cầu Rồng North Dragon Head & Cầu Trần Thị Lý white sail pylon
    if (r.id === 'han_river_bridge') {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(r.x1, (r.z1 + r.z2) * 0.5, 4.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (r.id === 'dragon_bridge') {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(r.x1, -318.2, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (r.id === 'tran_thi_ly_bridge') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(r.x1, -246.0, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9ab396';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. 2.5D Building Footprints with Shadows & Rooftop Detail
  const strokeW = Math.max(0.4, 0.95 / pixelsPerMeter);
  const shadowOffset = Math.min(2.2, 1.5 / Math.max(0.55, pixelsPerMeter));
  for (let i = 0; i < CITY_BUILDINGS.length; i++) {
    const b = CITY_BUILDINGS[i];
    const w = b.maxX - b.minX;
    const h = b.maxZ - b.minZ;
    const isHome = b.category === 'home';
    const isMarket = MARKET_BUILDING_IDS.has(b.id);

    // Ground ambient shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    drawRoundedRectPath(ctx, b.minX + shadowOffset, b.minZ + shadowOffset, w, h, 1.4);
    ctx.fill();

    // Main building roof footprint (distinct terracotta-amber highlight for traditional markets)
    ctx.fillStyle = isMarket
      ? palette === RADAR_THEMES.san_andreas
        ? '#f59e0b'
        : '#ea580c'
      : palette.buildingFill[b.category];
    drawRoundedRectPath(ctx, b.minX, b.minZ, w, h, 1.4);
    ctx.fill();

    // Rooftop bevel / architectural trim on larger complexes
    if (isMarket) {
      // Market hall ridge & awning bays so both traditional markets stand out instantly
      ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
      drawRoundedRectPath(ctx, b.minX + 2.4, b.minZ + 2.4, w - 4.8, h - 4.8, 1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.52)';
      ctx.lineWidth = Math.max(0.7, 1.2 / pixelsPerMeter);
      ctx.beginPath();
      ctx.moveTo(b.minX + 4, (b.minZ + b.maxZ) * 0.5);
      ctx.lineTo(b.maxX - 4, (b.minZ + b.maxZ) * 0.5);
      ctx.stroke();
    } else if (w >= 16 && h >= 16) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      drawRoundedRectPath(ctx, b.minX + 2.2, b.minZ + 2.2, w - 4.4, h - 4.4, 1);
      ctx.fill();
    }

    // Crisp building outline
    ctx.strokeStyle = isHome || isMarket ? '#fde047' : palette.buildingStroke;
    ctx.lineWidth = isHome || isMarket ? strokeW * 2.1 : strokeW;
    drawRoundedRectPath(ctx, b.minX, b.minZ, w, h, 1.4);
    ctx.stroke();

    // Building name label when zoomed in (show traditional markets much earlier for instant readability)
    if (
      showBuildingLabels &&
      ((pixelsPerMeter >= 1.25 && w * pixelsPerMeter >= 42) ||
        (isHome && pixelsPerMeter >= 1.0) ||
        (isMarket && pixelsPerMeter >= 0.72))
    ) {
      const text = b.shortLabel || b.label;
      ctx.save();
      const fontSize = isMarket
        ? Math.max(5.4, Math.min(8.6, 10.2 / pixelsPerMeter))
        : Math.max(4.4, Math.min(7.8, 9.2 / pixelsPerMeter));
      ctx.font = `800 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.lineWidth = Math.max(1.2, 2.4 / pixelsPerMeter);
      ctx.strokeText(text, (b.minX + b.maxX) * 0.5, (b.minZ + b.maxZ) * 0.5, Math.max(8, w - 4));
      ctx.fillStyle = isMarket ? '#fef08a' : palette === RADAR_THEMES.san_andreas ? '#09090b' : '#f8fafc';
      ctx.fillText(text, (b.minX + b.maxX) * 0.5, (b.minZ + b.maxZ) * 0.5, Math.max(8, w - 4));
      ctx.restore();
    }
  }

  // 4. Clean Cartographic Street & River Labels on Full Map (Zero POI Collision)
  if (showStreetLabels && pixelsPerMeter >= 0.45) {
    const fontSize = Math.max(6.2, Math.min(13.5, 10.5 / pixelsPerMeter));
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sông Hàn & Biển Mỹ Khê Tây water labels
    ctx.font = `italic 800 ${fontSize * 1.25}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(186, 230, 253, 0.42)';
    ctx.fillText('S Ô N G   H À N', 38, -240);
    ctx.save();
    ctx.translate(-1095, 110);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
    ctx.fillText('B I Ể N   M Ỹ   K H Ê   T Â Y', 0, 0);
    ctx.restore();

    ctx.font = `800 ${fontSize * 0.92}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(241, 245, 249, 0.88)';
    ctx.strokeStyle = 'rgba(9, 13, 22, 0.92)';
    ctx.lineWidth = Math.max(1.4, 2.8 / pixelsPerMeter);

    const streetTags: Array<{ text: string; x: number; z: number; rot?: number }> = [
      { text: 'Đ. VEN BIỂN VÕ NGUYÊN GIÁP', x: -973.2, z: 185, rot: -Math.PI / 2 },
      { text: 'ĐẠI LỘ TRUNG TÂM', x: -790, z: 29 },
      { text: 'ĐẠI LỘ TRUNG TÂM', x: -560, z: 29 },
      { text: 'ĐẠI LỘ TRUNG TÂM', x: -115, z: 29 },
      { text: 'ĐẠI LỘ TRUNG TÂM', x: 98, z: 29 },
      { text: 'ĐẠI LỘ LUXURY', x: 438, z: 29 },
      { text: 'Đ. NỘI KHU BẮC 1', x: -600, z: -22 },
      { text: 'Đ. NỘI KHU BẮC 2', x: -600, z: -60 },
      { text: 'Đ. NỘI KHU BẮC 3', x: -600, z: -98 },
      { text: 'Đ. NỘI KHU NAM 1', x: -660, z: 98 },
      { text: 'Đ. NỘI KHU NAM 2', x: -600, z: 152 },
      { text: 'KHU PHỐ SAU CYBER', x: -302, z: -42 },
      { text: 'SAU TRƯỜNG PCT', x: -360, z: 175 },
      { text: 'ĐƯỜNG BẠCH ĐẰNG', x: -68, z: -117.5 },
      { text: 'ĐƯỜNG BẠCH ĐẰNG', x: 282, z: -117.5 },
      { text: 'ĐẠI LỘ BỆNH VIỆN', x: -227.5, z: -45, rot: -Math.PI / 2 },
      { text: 'ĐƯỜNG TRẦN HƯNG ĐẠO (BỜ BẮC)', x: 282, z: -362 },
      { text: 'CẦU SÔNG HÀN', x: 162, z: -240 },
      { text: 'CẦU RỒNG', x: 342, z: -240 },
      { text: 'CẦU TRẦN THỊ LÝ', x: 468, z: -240 },
      { text: 'PHỐ ĐI BỘ', x: 193.5, z: -45, rot: -Math.PI / 2 },
      { text: 'ĐƯỜNG SƠN TÂY', x: 370, z: -52, rot: -Math.PI / 2 },
      { text: 'VINHOMES OCEAN PARK', x: 193.5, z: 265, rot: -Math.PI / 2 },
      { text: 'VINHOMES OCEAN PARK 2', x: 370, z: 265, rot: -Math.PI / 2 },
      { text: 'VINHOMES OCEAN PARK 3', x: 503, z: 265, rot: -Math.PI / 2 },
    ];
    for (const st of streetTags) {
      ctx.save();
      ctx.translate(st.x, st.z);
      if (st.rot) ctx.rotate(st.rot);
      ctx.strokeText(st.text, 0, 0);
      ctx.fillText(st.text, 0, 0);
      ctx.restore();
    }
    if (pixelsPerMeter >= 0.9) {
      const alleyFont = Math.max(3.6, Math.min(5.6, 5.2 / pixelsPerMeter));
      ctx.font = `700 ${alleyFont}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.82)';
      for (let i = 0; i < CITY_ROADS.length; i++) {
        const r = CITY_ROADS[i];
        if (r.kind !== 'alley') continue;
        const shortTag = r.name.replace(/^Hẻm\s+/i, '');
        const mx = (r.x1 + r.x2) * 0.5;
        const mz = (r.z1 + r.z2) * 0.5;
        ctx.save();
        ctx.translate(mx, mz);
        ctx.rotate(-Math.PI / 2);
        ctx.strokeText(shortTag, 0, 0);
        ctx.fillText(shortTag, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}

const EMPTY_HUNT_MARKERS: Array<{ id: string; x: number; z: number; label: string }> = [];
const MINI_CACHE_MIN_X = -990;
const MINI_CACHE_MIN_Z = -490;
const MINI_CACHE_W = 1650;
const MINI_CACHE_H = 960;
const MINI_CACHE_PPM = 1.35;
const staticCityCanvasCache: Partial<Record<RadarStylePreset, HTMLCanvasElement>> = {};

function getStaticCityOffscreenCanvas(style: RadarStylePreset): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = staticCityCanvasCache[style];
  if (cached) return cached;

  const offscreen = document.createElement('canvas');
  offscreen.width = Math.round(MINI_CACHE_W * MINI_CACHE_PPM);
  offscreen.height = Math.round(MINI_CACHE_H * MINI_CACHE_PPM);
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return null;

  const palette = RADAR_THEMES[style];
  offCtx.fillStyle = palette.land;
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
  offCtx.save();
  offCtx.scale(MINI_CACHE_PPM, MINI_CACHE_PPM);
  offCtx.translate(-MINI_CACHE_MIN_X, -MINI_CACHE_MIN_Z);
  drawCitySceneLayers(offCtx, palette, {
    showBuildingLabels: false,
    showStreetLabels: false,
    pixelsPerMeter: MINI_CACHE_PPM,
  });
  offCtx.restore();

  staticCityCanvasCache[style] = offscreen;
  return offscreen;
}

export const CityMinimapHud: React.FC<CityMinimapHudProps> = React.memo(({
  poseRef,
  subscribePose,
  isTouchDevice,
  isHiddenByModal,
  isFullMapOpen,
  onSetFullMapOpen,
  externalWaypoint = null,
  deliveryMarker = null,
  cityHuntMarkers = EMPTY_HUNT_MARKERS,
}) => {
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastMiniSigRef = useRef<string>('');

  const [radarStyle, setRadarStyle] = useState<RadarStylePreset>('gta6');
  const [headingUp, setHeadingUp] = useState<boolean>(true);
  const [waypoint, setWaypoint] = useState<ActiveWaypoint | null>(externalWaypoint);
  const [zoneText, setZoneText] = useState<string>('Pokémon Card Shop');

  useEffect(() => {
    if (externalWaypoint) {
      setWaypoint(externalWaypoint);
    } else {
      setWaypoint((prev) => (prev?.id.startsWith('pokeship_') ? null : prev));
    }
  }, [externalWaypoint]);
  const [hudTelemetry, setHudTelemetry] = useState<{
    floor: number;
    isRiding: boolean;
    speedKmh: number;
    routeMeters: number | null;
  }>({
    floor: 1,
    isRiding: false,
    speedKmh: 0,
    routeMeters: null,
  });

  // Full-Map Interactive Pan / Zoom & POI Filter State
  const [mapCenter, setMapCenter] = useState<{ x: number; z: number }>({ x: 96, z: 22 });
  const [mapZoom, setMapZoom] = useState<number>(0.85); // px per world meter
  const [poiFilter, setPoiFilter] = useState<PoiFilterGroup>('all');
  const [poiQuery, setPoiQuery] = useState<string>('');
  const [hoveredPoi, setHoveredPoi] = useState<CityPoi | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startClientX: number;
    startClientY: number;
    origCenterX: number;
    origCenterZ: number;
  }>({
    active: false,
    moved: false,
    startClientX: 0,
    startClientY: 0,
    origCenterX: 80,
    origCenterZ: 0,
  });

  // Cache last computed GPS route to avoid running Dijkstra on redundant redraws
  const routeCacheRef = useRef<{
    px: number;
    pz: number;
    wx: number;
    wz: number;
    result: GpsRouteResult;
  } | null>(null);

  const getGpsRoute = useCallback((px: number, pz: number, wp: ActiveWaypoint | null): GpsRouteResult | null => {
    if (!wp) return null;
    const prev = routeCacheRef.current;
    if (
      prev &&
      Math.abs(prev.px - px) < 0.7 &&
      Math.abs(prev.pz - pz) < 0.7 &&
      Math.abs(prev.wx - wp.x) < 0.1 &&
      Math.abs(prev.wz - wp.z) < 0.1
    ) {
      return prev.result;
    }
    const res = computeCityGpsRoute(px, pz, wp.x, wp.z);
    routeCacheRef.current = { px, pz, wx: wp.x, wz: wp.z, result: res };
    return res;
  }, []);

  // Auto-clear waypoint when player arrives within 9m of destination
  const checkArrivalAndSyncHud = useCallback(
    (snap: MinimapSnapshot, route: GpsRouteResult | null) => {
      const nextZone = detectCurrentCityZone(snap.x, snap.z, snap.currentFloor);
      setZoneText((prev) => (prev === nextZone ? prev : nextZone));

      let nextRouteMeters: number | null = route ? route.totalMeters : null;
      if (waypoint && !waypoint.id.startsWith('pokeship_')) {
        const directDist = Math.hypot(waypoint.x - snap.x, waypoint.z - snap.z);
        if (directDist <= 8.5) {
          setWaypoint(null);
          nextRouteMeters = null;
        }
      }

      setHudTelemetry((prev) => {
        if (
          prev.floor === snap.currentFloor &&
          prev.isRiding === snap.isRidingMotorbike &&
          prev.speedKmh === snap.speedKmh &&
          prev.routeMeters === nextRouteMeters
        ) {
          return prev;
        }
        return {
          floor: snap.currentFloor,
          isRiding: snap.isRidingMotorbike,
          speedKmh: snap.speedKmh,
          routeMeters: nextRouteMeters,
        };
      });
    },
    [waypoint]
  );

  // =========================================================================
  // DRAW MINI RADAR CANVAS
  // =========================================================================
  const drawMiniRadar = useCallback(() => {
    if (isHiddenByModal || isFullMapOpen) return;
    const canvas = miniCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const widthCss = radarStyle === 'gta5' ? 182 : radarStyle === 'san_andreas' ? 140 : 168;
    const heightCss = radarStyle === 'gta5' ? 114 : radarStyle === 'san_andreas' ? 140 : 132;
    const targetW = Math.round(widthCss * dpr);
    const targetH = Math.round(heightCss * dpr);

    let sizeChanged = false;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      sizeChanged = true;
    }
    const widthPxStr = `${widthCss}px`;
    const heightPxStr = `${heightCss}px`;
    if (canvas.style.width !== widthPxStr) canvas.style.width = widthPxStr;
    if (canvas.style.height !== heightPxStr) canvas.style.height = heightPxStr;

    const snap = poseRef.current;
    const activeBusesForSig =
      snap.buses && snap.buses.length > 0
        ? snap.buses
        : snap.busX !== null && snap.busZ !== null
          ? [{ x: snap.busX, z: snap.busZ, yaw: 0 }]
          : [];
    const busSig = activeBusesForSig
      .map((b) => `${Math.round(b.x * 2)},${Math.round(b.z * 2)},${Math.round(b.yaw * 20)}`)
      .join(';');
    const huntSig = cityHuntMarkers.map((h) => h.id).join(',');
    const drawSig = [
      Math.round(snap.x * 20),
      Math.round(snap.z * 20),
      Math.round(snap.yaw * 100),
      snap.currentFloor,
      snap.isRidingMotorbike ? 1 : 0,
      Math.round(snap.speedKmh),
      snap.hasParkedBike ? `${Math.round(snap.parkedBikeX)},${Math.round(snap.parkedBikeZ)}` : '0',
      waypoint?.id || '',
      deliveryMarker ? `${deliveryMarker.x},${deliveryMarker.z},${deliveryMarker.isVip ? 1 : 0}` : '',
      huntSig,
      busSig,
      radarStyle,
      headingUp ? 1 : 0,
      targetW,
      targetH,
    ].join('|');

    if (!sizeChanged && drawSig === lastMiniSigRef.current) {
      return;
    }
    lastMiniSigRef.current = drawSig;

    const route = getGpsRoute(snap.x, snap.z, waypoint);
    checkArrivalAndSyncHud(snap, route);

    const palette = RADAR_THEMES[radarStyle];
    // Dynamic zoom: keep wide city awareness inside compact corner radar
    const speedFactor = snap.isRidingMotorbike ? Math.min(1, snap.speedKmh / 65) : 0;
    const pixelsPerMeter = (radarStyle === 'san_andreas' ? 0.98 : 1.06) - speedFactor * 0.3;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, widthCss, heightCss);

    // Background
    ctx.fillStyle = palette.land;
    ctx.fillRect(0, 0, widthCss, heightCss);

    const cx = widthCss * 0.5;
    const cy = radarStyle === 'gta6' ? heightCss * 0.62 : heightCss * 0.54;
    const mapRotation = headingUp ? snap.yaw : 0;

    // World Layer Transform
    ctx.save();
    ctx.translate(cx, cy);
    if (mapRotation !== 0) ctx.rotate(mapRotation);
    ctx.scale(pixelsPerMeter, pixelsPerMeter);
    ctx.translate(-snap.x, -snap.z);

    const cachedCityCanvas = getStaticCityOffscreenCanvas(radarStyle);
    if (cachedCityCanvas) {
      ctx.drawImage(
        cachedCityCanvas,
        MINI_CACHE_MIN_X,
        MINI_CACHE_MIN_Z,
        MINI_CACHE_W,
        MINI_CACHE_H
      );
    } else {
      drawCitySceneLayers(ctx, palette, {
        showBuildingLabels: false,
        showStreetLabels: false,
        pixelsPerMeter,
      });
    }

    // GPS Route Line
    if (route && route.points.length >= 2) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(route.points[0].x, route.points[0].z);
      for (let i = 1; i < route.points.length; i++) {
        ctx.lineTo(route.points[i].x, route.points[i].z);
      }
      ctx.strokeStyle = palette.routeGlow;
      ctx.lineWidth = 5.4 / pixelsPerMeter;
      ctx.stroke();

      ctx.strokeStyle = palette.routeCore;
      ctx.lineWidth = 2.6 / pixelsPerMeter;
      ctx.stroke();
      ctx.restore();
    }

    // Parked Poké-Sport Bike Marker
    if (snap.hasParkedBike) {
      const r = 3.2 / pixelsPerMeter;
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(snap.parkedBikeX, snap.parkedBikeZ, r + 1.1 / pixelsPerMeter, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(snap.parkedBikeX, snap.parkedBikeZ, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4 Park Bus Stop Markers inside visible radar radius
    for (let i = 0; i < PARK_BUS_STOPS.length; i++) {
      const stop = PARK_BUS_STOPS[i];
      const dx = stop.x - snap.x;
      const dz = stop.z - snap.z;
      if (dx * dx + dz * dz > 175 * 175) continue;
      ctx.save();
      ctx.translate(stop.x, stop.z);
      if (mapRotation !== 0) ctx.rotate(-mapRotation);
      ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);
      ctx.fillStyle = '#042f2e';
      drawRoundedRectPath(ctx, -4.6, -4.6, 9.2, 9.2, 2.2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = '#2dd4bf';
      ctx.font = '900 5.5px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('B', 0, 0.4);
      ctx.restore();
    }

    // Live City Bus Fleet Markers (3 alternating buses)
    const activeBuses =
      snap.buses && snap.buses.length > 0
        ? snap.buses
        : snap.busX !== null && snap.busZ !== null
          ? [{ id: 'bus_01', unitLabel: 'XE 01', x: snap.busX, z: snap.busZ, yaw: 0 }]
          : [];
    for (let i = 0; i < activeBuses.length; i++) {
      const b = activeBuses[i];
      ctx.save();
      ctx.translate(b.x, b.z);
      ctx.rotate(-b.yaw);
      ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);
      ctx.fillStyle = '#09090b';
      drawRoundedRectPath(ctx, -3.2, -5.6, 6.4, 11.2, 1.6);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      drawRoundedRectPath(ctx, -2.3, -4.6, 4.6, 9.2, 1.1);
      ctx.fill();
      // Front windshield indicator (+Y local = sin(yaw), cos(yaw) forward)
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-1.8, 2.5, 3.6, 1.5);
      ctx.restore();
    }

    // Key POI markers inside visible radar radius
    for (let i = 0; i < CITY_POIS.length; i++) {
      const poi = CITY_POIS[i];
      const isMarket = MARKET_POI_IDS.has(poi.id);
      const dx = poi.x - snap.x;
      const dz = poi.z - snap.z;
      const maxRadius = isMarket ? 235 : 175;
      if (dx * dx + dz * dz > maxRadius * maxRadius) continue;
      if (
        !isMarket &&
        poi.category !== 'home' &&
        poi.category !== 'civic' &&
        poi.category !== 'landmark' &&
        poi.id !== 'poi_aeon_mall' &&
        poi.id !== 'poi_casa_riva' &&
        poi.id !== 'poi_porsche' &&
        poi.id !== 'poi_dior'
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(poi.x, poi.z);
      if (mapRotation !== 0) ctx.rotate(-mapRotation);
      ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);

      if (isMarket) {
        ctx.fillStyle = '#09090b';
        drawRoundedRectPath(ctx, -10.5, -5.8, 21, 11.6, 3.2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        drawRoundedRectPath(ctx, -9.2, -4.6, 18.4, 9.2, 2.4);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 5.4px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CHỢ', 0, 0.4);
      } else {
        const miniGlyph =
          poi.badge === 'HOME'
            ? '★'
            : poi.badge === 'AEON'
              ? 'AE'
              : poi.badge === 'VCB'
                ? '₫'
                : poi.badge.slice(0, 2);
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = POI_BADGE_COLORS[poi.category];
        ctx.beginPath();
        ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#09090b';
        ctx.font = '900 5.8px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(miniGlyph, 0, 0.4);
      }
      ctx.restore();
    }

    // Destination Waypoint Pin
    if (waypoint) {
      ctx.save();
      ctx.translate(waypoint.x, waypoint.z);
      if (mapRotation !== 0) ctx.rotate(-mapRotation);
      ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = waypoint.id.startsWith('pokeship_') ? '#0ea5e9' : palette.routeCore;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // PokeShip Active Delivery Drop Marker
    if (deliveryMarker) {
      ctx.save();
      ctx.translate(deliveryMarker.x, deliveryMarker.z);
      if (mapRotation !== 0) ctx.rotate(-mapRotation);
      ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);
      ctx.fillStyle = '#09090b';
      drawRoundedRectPath(ctx, -6.5, -6.5, 13, 13, 3.5);
      ctx.fill();
      ctx.fillStyle = deliveryMarker.isVip ? '#f59e0b' : '#0ea5e9';
      drawRoundedRectPath(ctx, -5, -5, 10, 10, 2.5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 6.5px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', 0, 0.5);
      ctx.restore();
    }

    // Active City Hunt Rare Card Markers
    for (const hm of cityHuntMarkers) {
      ctx.save();
      ctx.translate(hm.x, hm.z);
      if (mapRotation !== 0) ctx.rotate(-mapRotation);
      ctx.scale(1 / pixelsPerMeter, 1 / pixelsPerMeter);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.font = '900 7px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 0.5);
      ctx.restore();
    }

    ctx.restore(); // End world space

    // Off-screen Waypoint Direction Indicator hugging edge
    if (waypoint) {
      const dx = (waypoint.x - snap.x) * pixelsPerMeter;
      const dz = (waypoint.z - snap.z) * pixelsPerMeter;
      const cosR = Math.cos(mapRotation);
      const sinR = Math.sin(mapRotation);
      const sx = dx * cosR - dz * sinR;
      const sy = dx * sinR + dz * cosR;

      const maxRx = widthCss * 0.5 - 12;
      const maxRyTop = cy - 12;
      const maxRyBot = heightCss - cy - 12;

      const outOfFrame =
        radarStyle === 'san_andreas'
          ? Math.hypot(sx, sy) > widthCss * 0.5 - 11
          : sx < -maxRx || sx > maxRx || sy < -maxRyTop || sy > maxRyBot;

      if (outOfFrame) {
        let pxEdge = sx;
        let pyEdge = sy;
        if (radarStyle === 'san_andreas') {
          const rad = widthCss * 0.5 - 10;
          const len = Math.hypot(sx, sy) || 1;
          pxEdge = (sx / len) * rad;
          pyEdge = (sy / len) * rad;
        } else {
          const tx = Math.abs(sx) > 1e-3 ? maxRx / Math.abs(sx) : 999;
          const ty = sy < 0 ? (Math.abs(sy) > 1e-3 ? maxRyTop / Math.abs(sy) : 999) : Math.abs(sy) > 1e-3 ? maxRyBot / Math.abs(sy) : 999;
          const t = Math.min(tx, ty);
          pxEdge = sx * t;
          pyEdge = sy * t;
        }
        ctx.save();
        ctx.translate(cx + pxEdge, cy + pyEdge);
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.routeCore;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Center Player Directional Arrow
    ctx.save();
    ctx.translate(cx, cy);
    if (!headingUp) {
      ctx.rotate(-snap.yaw);
    }
    // Crisp dark circular backing for GTA VI style or pure sharp GTA V chevron
    if (radarStyle === 'gta6') {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(5.2, 5.2);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5.2, 5.2);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();
    ctx.restore();

    // North Compass Indicator ("N")
    {
      const nxWorld = Math.sin(mapRotation);
      const nyWorld = -Math.cos(mapRotation);
      let nx = 0;
      let ny = 0;
      if (radarStyle === 'san_andreas') {
        const rad = widthCss * 0.5 - 10;
        nx = cx + nxWorld * rad;
        ny = cy + nyWorld * rad;
      } else {
        const padX = widthCss * 0.5 - 13;
        const padTop = cy - 13;
        const padBot = heightCss - cy - 13;
        const tx = Math.abs(nxWorld) > 1e-4 ? padX / Math.abs(nxWorld) : 999;
        const ty = nyWorld < 0 ? (Math.abs(nyWorld) > 1e-4 ? padTop / Math.abs(nyWorld) : 999) : Math.abs(nyWorld) > 1e-4 ? padBot / Math.abs(nyWorld) : 999;
        const t = Math.min(tx, ty);
        nx = cx + nxWorld * t;
        ny = cy + nyWorld * t;
      }
      ctx.save();
      ctx.translate(nx, ny);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0, 0, 6.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 7.6px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', 0, 0.5);
      ctx.restore();
    }

    // Subtle inset vignette shadow along radar edges
    const vig = ctx.createRadialGradient(
      widthCss * 0.5,
      heightCss * 0.5,
      Math.min(widthCss, heightCss) * 0.28,
      widthCss * 0.5,
      heightCss * 0.5,
      Math.max(widthCss, heightCss) * 0.68
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, widthCss, heightCss);

    ctx.restore();
  }, [checkArrivalAndSyncHud, cityHuntMarkers, deliveryMarker, getGpsRoute, headingUp, isFullMapOpen, isHiddenByModal, poseRef, radarStyle, waypoint]);

  // =========================================================================
  // DRAW INTERACTIVE FULL CITY MAP CANVAS
  // =========================================================================
  const drawFullMap = useCallback(() => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const snap = poseRef.current;
    const route = getGpsRoute(snap.x, snap.z, waypoint);
    const palette = RADAR_THEMES[radarStyle];
    const w = rect.width;
    const h = rect.height;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = palette.land;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.scale(mapZoom, mapZoom);
    ctx.translate(-mapCenter.x, -mapCenter.z);

    // Subtle highlight for mapped city district zone
    ctx.fillStyle = palette.land;
    ctx.fillRect(
      CITY_WORLD_BOUNDS.minX,
      CITY_WORLD_BOUNDS.minZ,
      CITY_WORLD_BOUNDS.maxX - CITY_WORLD_BOUNDS.minX,
      CITY_WORLD_BOUNDS.maxZ - CITY_WORLD_BOUNDS.minZ
    );

    drawCitySceneLayers(ctx, palette, {
      showBuildingLabels: true,
      showStreetLabels: true,
      pixelsPerMeter: mapZoom,
    });

    // GPS Route
    if (route && route.points.length >= 2) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(route.points[0].x, route.points[0].z);
      for (let i = 1; i < route.points.length; i++) {
        ctx.lineTo(route.points[i].x, route.points[i].z);
      }
      ctx.strokeStyle = palette.routeGlow;
      ctx.lineWidth = 8.0 / mapZoom;
      ctx.stroke();

      ctx.strokeStyle = palette.routeCore;
      ctx.lineWidth = 3.6 / mapZoom;
      ctx.stroke();
      ctx.restore();
    }

    // POIs: Crisp Pill / Circle Badges (Draw traditional markets in Pass 2 so they ALWAYS stand out on top!)
    const drawFullMapPoi = (poi: CityPoi) => {
      const isHovered = hoveredPoi?.id === poi.id;
      const isSelected = waypoint?.id === poi.id;
      const isMarket = MARKET_POI_IDS.has(poi.id);
      const badgeStr = poi.badge;

      ctx.save();
      ctx.translate(poi.x, poi.z);
      ctx.scale(1 / mapZoom, 1 / mapZoom);

      const fontSize = isMarket ? (isHovered || isSelected ? 8.4 : 7.4) : isHovered || isSelected ? 7.8 : 6.8;
      ctx.font = `900 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;

      if (isMarket) {
        const pw = isHovered || isSelected ? 30 : 26;
        const ph = isHovered || isSelected ? 17 : 15;
        ctx.fillStyle = isSelected ? '#f472b6' : '#09090b';
        drawRoundedRectPath(ctx, -pw * 0.5 - 2, -ph * 0.5 - 2, pw + 4, ph + 4, 5.5);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        drawRoundedRectPath(ctx, -pw * 0.5, -ph * 0.5, pw, ph, 4.5);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeStr, 0, 0.5);

        // Always-visible market callout tag (even at whole-city zoom!)
        const shortTag = poi.id === 'poi_market_north' ? 'CHỢ BẮC TÂY' : 'CHỢ NAM TÂY';
        const tagText = isHovered || isSelected ? poi.name : shortTag;
        ctx.font = isHovered || isSelected ? '800 9.5px ui-sans-serif, system-ui, sans-serif' : '900 8.5px ui-sans-serif, system-ui, sans-serif';
        const labelW = ctx.measureText(tagText).width + 12;
        const labelH = isHovered || isSelected ? 16 : 14;
        ctx.fillStyle = 'rgba(9, 13, 22, 0.94)';
        drawRoundedRectPath(ctx, -labelW * 0.5, -ph * 0.5 - labelH - 4, labelW, labelH, 4);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#f472b6' : '#fb923c';
        ctx.lineWidth = 1.25;
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.fillText(tagText, 0, -ph * 0.5 - labelH * 0.5 - 3.6);
      } else {
        if (badgeStr.length >= 3) {
          const pw = Math.max(20, badgeStr.length * 5.2 + 8);
          const ph = isHovered || isSelected ? 16 : 14;
          ctx.fillStyle = isSelected ? '#f472b6' : '#09090b';
          drawRoundedRectPath(ctx, -pw * 0.5 - 1.5, -ph * 0.5 - 1.5, pw + 3, ph + 3, 5);
          ctx.fill();

          ctx.fillStyle = POI_BADGE_COLORS[poi.category];
          drawRoundedRectPath(ctx, -pw * 0.5, -ph * 0.5, pw, ph, 4);
          ctx.fill();
        } else {
          const radius = isHovered || isSelected ? 9.5 : 7.6;
          ctx.fillStyle = isSelected ? '#f472b6' : '#09090b';
          ctx.beginPath();
          ctx.arc(0, 0, radius + 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = POI_BADGE_COLORS[poi.category];
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#09090b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeStr, 0, 0.5);

        // Show crisp name tag next to hovered/selected POI
        if (isHovered || isSelected) {
          ctx.font = '800 9.5px ui-sans-serif, system-ui, sans-serif';
          const labelW = ctx.measureText(poi.name).width + 12;
          ctx.fillStyle = 'rgba(9, 13, 22, 0.94)';
          drawRoundedRectPath(ctx, -labelW * 0.5, -26, labelW, 15, 4);
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#f472b6' : 'rgba(255,255,255,0.28)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(poi.name, 0, -18.3);
        }
      }
      ctx.restore();
    };

    for (let i = 0; i < CITY_POIS.length; i++) {
      const poi = CITY_POIS[i];
      if (MARKET_POI_IDS.has(poi.id)) continue;
      if (poiFilter !== 'all' && poi.filterGroup !== poiFilter) continue;
      drawFullMapPoi(poi);
    }
    for (let i = 0; i < CITY_POIS.length; i++) {
      const poi = CITY_POIS[i];
      if (!MARKET_POI_IDS.has(poi.id)) continue;
      if (poiFilter !== 'all' && poi.filterGroup !== poiFilter) continue;
      drawFullMapPoi(poi);
    }

    // 4 Park Bus Stop Markers
    for (let i = 0; i < PARK_BUS_STOPS.length; i++) {
      const stop = PARK_BUS_STOPS[i];
      ctx.save();
      ctx.translate(stop.x, stop.z);
      ctx.scale(1 / mapZoom, 1 / mapZoom);
      ctx.fillStyle = '#042f2e';
      drawRoundedRectPath(ctx, -7, -6, 14, 12, 3);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#5eead4';
      ctx.font = '900 6.5px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`B${stop.stopNumber}`, 0, 0.5);
      ctx.restore();
    }

    // Parked Bike & Live 3-Bus City Transit Fleet
    if (snap.hasParkedBike) {
      ctx.save();
      ctx.translate(snap.parkedBikeX, snap.parkedBikeZ);
      ctx.scale(1 / mapZoom, 1 / mapZoom);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const fullMapBuses =
      snap.buses && snap.buses.length > 0
        ? snap.buses
        : snap.busX !== null && snap.busZ !== null
          ? [{ id: 'bus_01', unitLabel: 'XE 01', x: snap.busX, z: snap.busZ, yaw: 0 }]
          : [];
    for (let i = 0; i < fullMapBuses.length; i++) {
      const b = fullMapBuses[i];
      ctx.save();
      ctx.translate(b.x, b.z);
      ctx.rotate(-b.yaw);
      ctx.scale(1 / mapZoom, 1 / mapZoom);
      ctx.fillStyle = '#09090b';
      drawRoundedRectPath(ctx, -4.4, -7.8, 8.8, 15.6, 2.2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      drawRoundedRectPath(ctx, -3.2, -6.4, 6.4, 12.8, 1.6);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-2.4, 3.6, 4.8, 2.0);
      ctx.restore();

      ctx.save();
      ctx.translate(b.x, b.z);
      ctx.scale(1 / mapZoom, 1 / mapZoom);
      ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
      drawRoundedRectPath(ctx, -11, -18.5, 22, 9.5, 3);
      ctx.fill();
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '800 6px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.unitLabel, 0, -13.6);
      ctx.restore();
    }

    // Active Waypoint Crosshair
    if (waypoint) {
      ctx.save();
      ctx.translate(waypoint.x, waypoint.z);
      ctx.scale(1 / mapZoom, 1 / mapZoom);
      ctx.strokeStyle = waypoint.id.startsWith('pokeship_') ? '#38bdf8' : palette.routeCore;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = waypoint.id.startsWith('pokeship_') ? '#38bdf8' : palette.routeCore;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // PokeShip Active Delivery Badge on Full Map
    if (deliveryMarker) {
      ctx.save();
      ctx.translate(deliveryMarker.x, deliveryMarker.z);
      ctx.scale(1 / mapZoom, 1 / mapZoom);
      const pillColor = deliveryMarker.isVip ? '#f59e0b' : '#0ea5e9';
      ctx.fillStyle = '#09090b';
      drawRoundedRectPath(ctx, -10.5, -10.5, 21, 21, 5);
      ctx.fill();
      ctx.fillStyle = pillColor;
      drawRoundedRectPath(ctx, -8.5, -8.5, 17, 17, 4);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.font = '900 9px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PS', 0, 0.5);

      ctx.font = '800 9.5px ui-sans-serif, system-ui, sans-serif';
      const labelText = `📦 ${deliveryMarker.label}`;
      const lw = ctx.measureText(labelText).width + 12;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.94)';
      drawRoundedRectPath(ctx, -lw * 0.5, -29, lw, 16, 4);
      ctx.fill();
      ctx.strokeStyle = pillColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(labelText, 0, -20.8);
      ctx.restore();
    }

    // Active City Hunt Rare Card Markers on Full Map
    for (const hm of cityHuntMarkers) {
      ctx.save();
      ctx.translate(hm.x, hm.z);
      ctx.scale(1 / mapZoom, 1 / mapZoom);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.font = '900 9.5px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 0.5);

      ctx.font = '800 9px ui-sans-serif, system-ui, sans-serif';
      const labelText = `✨ ${hm.label}`;
      const lw = ctx.measureText(labelText).width + 10;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.94)';
      drawRoundedRectPath(ctx, -lw * 0.5, -26, lw, 15, 4);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillText(labelText, 0, -18.2);
      ctx.restore();
    }

    // Player Live Marker + FOV Cone
    ctx.save();
    ctx.translate(snap.x, snap.z);
    ctx.rotate(-snap.yaw);
    ctx.scale(1 / mapZoom, 1 / mapZoom);

    // Subtle position halo so player stands out even at full-city zoom
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // View cone
    const coneGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    coneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.36)');
    coneGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 34, -Math.PI * 0.68, -Math.PI * 0.32);
    ctx.closePath();
    ctx.fill();

    // Player Chevron
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // End world space

    // Static Compass Badge Top-Right of Map Canvas
    ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
    ctx.beginPath();
    ctx.arc(w - 28, 28, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 10.5px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', w - 28, 28.5);

    ctx.restore();
  }, [cityHuntMarkers, deliveryMarker, getGpsRoute, hoveredPoi, mapCenter, mapZoom, poiFilter, poseRef, radarStyle, waypoint]);

  const fitWholeCity = useCallback(() => {
    const rect = fullCanvasRef.current?.getBoundingClientRect();
    const cw = rect && rect.width > 80 ? rect.width : 740;
    const ch = rect && rect.height > 80 ? rect.height : 600;
    // Full city + Biển Mỹ Khê Tây extent: X [-1130..565] (1695m), Z [-460..430] (890m)
    const zoomX = (cw - 44) / 1710;
    const zoomY = (ch - 56) / 900;
    const fittedZoom = Math.max(0.32, Math.min(1.25, Math.min(zoomX, zoomY)));
    setMapCenter({ x: -280, z: -15 });
    setMapZoom(fittedZoom);
  }, []);

  // Subscribe to ~18Hz telemetry from ShopScene without causing App.tsx re-renders
  useEffect(() => {
    drawMiniRadar();
    if (isFullMapOpen) drawFullMap();
    const unsub = subscribePose(() => {
      drawMiniRadar();
      if (isFullMapOpen) drawFullMap();
    });
    return unsub;
  }, [drawFullMap, drawMiniRadar, isFullMapOpen, subscribePose]);

  // Redraw immediately when view parameters change or minimap becomes visible again
  useEffect(() => {
    if (!isHiddenByModal && !isFullMapOpen) {
      lastMiniSigRef.current = '';
      drawMiniRadar();
    }
    if (isFullMapOpen) drawFullMap();
  }, [drawFullMap, drawMiniRadar, isFullMapOpen, isHiddenByModal, radarStyle, headingUp, waypoint, mapCenter, mapZoom, poiFilter, hoveredPoi]);

  // When opening Full City Map, cleanly fit the entire city so all districts & bridges are immediately visible
  useEffect(() => {
    if (isFullMapOpen) {
      const id = window.requestAnimationFrame(() => fitWholeCity());
      return () => window.cancelAnimationFrame(id);
    }
  }, [fitWholeCity, isFullMapOpen]);

  const filteredPois = useMemo(() => {
    const q = normalizeSearchText(poiQuery);
    return CITY_POIS.filter((p) => {
      if (!q && poiFilter !== 'all' && p.filterGroup !== poiFilter) return false;
      if (!q) return true;
      const hay = normalizeSearchText(`${p.name} ${p.subtitle} ${p.badge}`);
      if (hay.includes(q)) return true;
      if (MARKET_POI_IDS.has(p.id) && (q.includes('market') || q.includes('cho'))) return true;
      return false;
    });
  }, [poiFilter, poiQuery]);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = fullCanvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left - rect.width * 0.5;
      const sy = clientY - rect.top - rect.height * 0.5;
      return {
        x: mapCenter.x + sx / mapZoom,
        z: mapCenter.z + sy / mapZoom,
      };
    },
    [mapCenter, mapZoom]
  );

  const cycleRadarStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRadarStyle((prev) => (prev === 'gta6' ? 'gta5' : prev === 'gta5' ? 'san_andreas' : 'gta6'));
  };

  const toggleHeadingMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeadingUp((prev) => !prev);
  };

  const styleDisplayName =
    radarStyle === 'gta6' ? 'GTA VI' : radarStyle === 'gta5' ? 'GTA V' : 'San Andreas';

  const snapNow = poseRef.current;
  const fullMapRoute = useMemo(() => {
    if (!isFullMapOpen || !waypoint) return null;
    return computeCityGpsRoute(snapNow.x, snapNow.z, waypoint.x, waypoint.z);
  }, [isFullMapOpen, snapNow.x, snapNow.z, waypoint]);

  return (
    <>
      {/* LIVE MINI RADAR HUD (Hidden when another major modal is open) */}
      {!isHiddenByModal && !isFullMapOpen && (
        <div
          className={`pointer-events-auto fixed z-30 flex flex-col gap-1 select-none ${
            isTouchDevice ? 'top-16 left-3' : 'bottom-4 left-4'
          }`}
        >
          {/* Zone & Quick Toolbar Pill */}
          <div className="flex items-center justify-between gap-1.5 px-0.5">
            <div className="max-w-[112px] truncate text-[10px] font-bold tracking-wide text-zinc-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
              {zoneText}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cycleRadarStyle}
                title={`Đổi kiểu radar (${styleDisplayName})`}
                className="flex h-5 items-center gap-1 rounded bg-zinc-950/90 px-1.5 text-[9px] font-black text-zinc-200 border border-zinc-700/80 hover:border-amber-400 hover:text-amber-300 cursor-pointer transition"
              >
                <Layers className="h-2.5 w-2.5" />
                <span>{styleDisplayName === 'San Andreas' ? 'SA' : styleDisplayName.replace('GTA ', '')}</span>
              </button>
              <button
                type="button"
                onClick={toggleHeadingMode}
                title={headingUp ? 'Đang xoay theo hướng nhìn (Heading-Up)' : 'Đang cố định hướng Bắc (North-Up)'}
                className={`flex h-5 w-5 items-center justify-center rounded border cursor-pointer transition ${
                  headingUp
                    ? 'bg-zinc-950/90 border-zinc-700/80 text-sky-300 hover:border-sky-400'
                    : 'bg-sky-500/20 border-sky-400 text-sky-200'
                }`}
              >
                <RotateCw className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          {/* Radar Frame */}
          <div
            onClick={() => onSetFullMapOpen(true)}
            title="Nhấn để mở Bản Đồ Thành Phố [Z]"
            className={`group relative overflow-hidden cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.65)] transition-transform hover:scale-[1.015] ${
              radarStyle === 'gta6'
                ? 'rounded-2xl border-2 border-slate-300/55 bg-slate-900/95'
                : radarStyle === 'gta5'
                  ? 'rounded-md border-[3px] border-zinc-950 bg-zinc-950'
                  : 'rounded-full border-[4px] border-black bg-zinc-950'
            }`}
          >
            <canvas ref={miniCanvasRef} className="block" />

            {/* Top-Left Distance Readout (GTA VI Style) */}
            {hudTelemetry.routeMeters !== null && (
              <div
                className={`absolute flex items-center gap-1 rounded-md bg-zinc-950/90 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white border border-white/15 shadow ${
                  radarStyle === 'san_andreas' ? 'top-2.5 left-1/2 -translate-x-1/2' : 'top-2 left-2'
                }`}
              >
                <Navigation className="h-2.5 w-2.5 text-pink-400" />
                <span>{hudTelemetry.routeMeters} m</span>
              </div>
            )}

            {/* Clear Waypoint Quick X */}
            {waypoint && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setWaypoint(null);
                }}
                title="Hủy chỉ đường GPS"
                className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950/90 text-zinc-300 border border-white/20 hover:bg-rose-600 hover:text-white cursor-pointer transition ${
                  radarStyle === 'san_andreas' ? 'bottom-2.5 left-1/2 -translate-x-1/2' : 'top-2 right-2'
                }`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}

            {/* GTA V Tactical Bottom Telemetry Bar */}
            {radarStyle === 'gta5' && (
              <div className="flex items-center justify-between gap-1 bg-zinc-950 px-2 py-1 border-t border-zinc-800 text-[9px] font-black uppercase tracking-wider">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                  <span className="h-1.5 flex-1 rounded-full bg-sky-500" />
                  <span className="h-1.5 w-6 rounded-full bg-amber-400" />
                </div>
                <span className="text-zinc-300 tabular-nums ml-1">
                  {hudTelemetry.isRiding ? `${hudTelemetry.speedKmh} km/h` : `T${hudTelemetry.floor}`}
                </span>
              </div>
            )}

            {/* Expand [Z] Hint Badge on Hover */}
            <div
              className={`pointer-events-none absolute flex items-center gap-1 rounded bg-zinc-950/90 px-1.5 py-0.5 text-[9px] font-black text-amber-300 border border-amber-400/40 opacity-85 group-hover:opacity-100 transition ${
                radarStyle === 'san_andreas'
                  ? 'bottom-2 right-6'
                  : radarStyle === 'gta5'
                    ? 'bottom-6 right-1.5'
                    : 'bottom-2 right-2'
              }`}
            >
              <Maximize2 className="h-2.5 w-2.5" />
              <span>Z</span>
            </div>
          </div>
        </div>
      )}

      {/* FULL INTERACTIVE CITY MAP MODAL ([Z] OR CLICK MINIMAP) */}
      {isFullMapOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6"
          onClick={() => onSetFullMapOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 text-white shadow-2xl"
          >
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/95 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black tracking-wide text-white">
                    BẢN ĐỒ THÀNH PHỐ &amp; CHỈ ĐƯỜNG GPS
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Vị trí hiện tại: <strong className="text-amber-300">{zoneText}</strong>
                    {waypoint && fullMapRoute && (
                      <>
                        {' '}• Đang dẫn tới <strong className="text-pink-400">{waypoint.name}</strong> ({fullMapRoute.totalMeters} m)
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Style Selector */}
                <div className="hidden sm:flex items-center rounded-xl bg-zinc-950 border border-zinc-800 p-0.5 text-[11px] font-bold">
                  {(
                    [
                      ['gta6', 'GTA VI'],
                      ['gta5', 'GTA V'],
                      ['san_andreas', 'San Andreas'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRadarStyle(key)}
                      className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                        radarStyle === key
                          ? 'bg-amber-500 text-black font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {waypoint && (
                  <button
                    type="button"
                    onClick={() => setWaypoint(null)}
                    className="flex items-center gap-1 rounded-xl border border-rose-500/50 bg-rose-950/60 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-900 cursor-pointer transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Hủy GPS</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSetFullMapOpen(false)}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 cursor-pointer transition"
                >
                  <span>Đóng</span>
                  <span className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                    Z
                  </span>
                </button>
              </div>
            </div>

            {/* Body: Interactive Map Canvas + POI Directory Sidebar */}
            <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
              {/* Left Map Canvas */}
              <div className="relative flex-1 min-h-[280px] bg-zinc-950 overflow-hidden">
                <canvas
                  ref={fullCanvasRef}
                  className="h-full w-full cursor-grab active:cursor-grabbing block"
                  onPointerDown={(e) => {
                    dragStateRef.current = {
                      active: true,
                      moved: false,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origCenterX: mapCenter.x,
                      origCenterZ: mapCenter.z,
                    };
                    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const ds = dragStateRef.current;
                    if (ds.active) {
                      const dx = e.clientX - ds.startClientX;
                      const dy = e.clientY - ds.startClientY;
                      if (Math.hypot(dx, dy) > 4) {
                        ds.moved = true;
                      }
                      setMapCenter({
                        x: ds.origCenterX - dx / mapZoom,
                        z: ds.origCenterZ - dy / mapZoom,
                      });
                      return;
                    }
                    const world = screenToWorld(e.clientX, e.clientY);
                    if (!world) return;
                    let closest: CityPoi | null = null;
                    let bestDist = 14 / mapZoom;
                    for (const p of CITY_POIS) {
                      if (poiFilter !== 'all' && p.filterGroup !== poiFilter) continue;
                      const d = Math.hypot(p.x - world.x, p.z - world.z);
                      if (d < bestDist) {
                        bestDist = d;
                        closest = p;
                      }
                    }
                    setHoveredPoi(closest);
                  }}
                  onPointerUp={(e) => {
                    const ds = dragStateRef.current;
                    const wasClick = ds.active && !ds.moved;
                    ds.active = false;
                    if (!wasClick) return;

                    const world = screenToWorld(e.clientX, e.clientY);
                    if (!world) return;

                    // Snap to POI if clicked close to one
                    let hitPoi: CityPoi | null = null;
                    let bestD = 16 / mapZoom;
                    for (const p of CITY_POIS) {
                      if (poiFilter !== 'all' && p.filterGroup !== poiFilter) continue;
                      const d = Math.hypot(p.x - world.x, p.z - world.z);
                      if (d < bestD) {
                        bestD = d;
                        hitPoi = p;
                      }
                    }

                    if (hitPoi) {
                      setWaypoint({
                        id: hitPoi.id,
                        name: hitPoi.name,
                        x: hitPoi.x,
                        z: hitPoi.z,
                        category: hitPoi.category,
                      });
                      return;
                    }

                    // Otherwise snap to building center or exact ground coordinate
                    let hitBldgName = 'Điểm Đánh Dấu Tùy Chỉnh';
                    for (const b of CITY_BUILDINGS) {
                      if (world.x >= b.minX && world.x <= b.maxX && world.z >= b.minZ && world.z <= b.maxZ) {
                        hitBldgName = b.label;
                        break;
                      }
                    }
                    setWaypoint({
                      id: 'custom_pin',
                      name: hitBldgName,
                      x: Math.round(world.x * 10) / 10,
                      z: Math.round(world.z * 10) / 10,
                    });
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    const factor = e.deltaY < 0 ? 1.15 : 0.87;
                    setMapZoom((z) => Math.max(0.32, Math.min(4.2, z * factor)));
                  }}
                />

                {/* Hovered POI Tooltip */}
                {hoveredPoi && (
                  <div className="pointer-events-none absolute top-3 left-3 rounded-xl border border-zinc-700 bg-zinc-950/95 px-3 py-2 shadow-xl max-w-xs">
                    <div className="text-xs font-black text-white">{hoveredPoi.name}</div>
                    <div className="text-[10px] text-zinc-400">{hoveredPoi.subtitle}</div>
                    <div className="mt-1 text-[10px] font-bold text-pink-400">
                      Click để đặt chỉ đường GPS
                    </div>
                  </div>
                )}

                {/* Map Controls Overlay (Bottom-Left of Full Map Canvas) */}
                <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-xl border border-zinc-700 bg-zinc-950/95 p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => setMapZoom((z) => Math.min(4.2, z * 1.25))}
                      title="Phóng to"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapZoom((z) => Math.max(0.32, z * 0.8))}
                      title="Thu nhỏ"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const s = poseRef.current;
                        setMapCenter({ x: s.x, z: s.z });
                        setMapZoom(1.45);
                      }}
                      title="Về vị trí hiện tại"
                      className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-amber-300 hover:bg-zinc-800 cursor-pointer"
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                      <span>Vị Trí Tôi</span>
                    </button>
                    <button
                      type="button"
                      onClick={fitWholeCity}
                      title="Xem toàn bộ thành phố"
                      className="flex h-7 items-center rounded-lg px-2 text-[11px] font-bold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                    >
                      Toàn Cảnh
                    </button>
                  </div>

                  {/* Quick Legend */}
                  <div className="hidden sm:flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/95 px-3 py-1.5 text-[10px] text-zinc-300">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-white border border-black" /> Bạn
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Xe Máy
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Xe Buýt
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-pink-400" /> Tuyến GPS
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Sidebar: Searchable POI Directory */}
              <div className="flex w-full lg:w-80 shrink-0 flex-col border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/70 min-h-[210px] max-h-[38vh] lg:max-h-none">
                <div className="p-3 border-b border-zinc-800 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={poiQuery}
                      onChange={(e) => setPoiQuery(e.target.value)}
                      placeholder="Tìm địa điểm (Chợ Bắc, Chợ Nam, AEON, Cầu Rồng...)"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {FILTER_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPoiFilter(tab.id)}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                          poiFilter === tab.id
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-dark-scrollbar p-2 pr-1.5 space-y-1.5">
                  {filteredPois.map((poi) => {
                    const dist = Math.round(Math.hypot(poi.x - snapNow.x, poi.z - snapNow.z));
                    const isSelected = waypoint?.id === poi.id;
                    const isMarket = MARKET_POI_IDS.has(poi.id);
                    return (
                      <button
                        key={poi.id}
                        type="button"
                        onClick={() => {
                          setMapCenter({ x: poi.x, z: poi.z });
                          setMapZoom((z) => Math.max(z, 1.45));
                          setWaypoint({
                            id: poi.id,
                            name: poi.name,
                            x: poi.x,
                            z: poi.z,
                            category: poi.category,
                          });
                        }}
                        className={`w-full flex items-center gap-2.5 rounded-xl border p-2 text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-pink-500/80 bg-pink-950/35'
                            : isMarket
                              ? 'border-orange-500/50 bg-orange-950/25 hover:border-amber-400 hover:bg-orange-950/45'
                              : 'border-zinc-800/80 bg-zinc-950/70 hover:border-amber-400/60 hover:bg-zinc-900'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-black ${
                            isMarket ? 'text-white ring-1 ring-yellow-300/70' : 'text-black'
                          }`}
                          style={{ backgroundColor: isMarket ? '#f97316' : POI_BADGE_COLORS[poi.category] }}
                        >
                          {poi.badge}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`truncate text-xs font-bold ${isMarket ? 'text-amber-200' : 'text-white'}`}>
                            {poi.name}
                          </div>
                          <div className="truncate text-[10px] text-zinc-400">{poi.subtitle}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[11px] font-black tabular-nums text-amber-300">{dist} m</div>
                          {isSelected && (
                            <div className="flex items-center justify-end gap-0.5 text-[9px] font-bold text-pink-400">
                              <MapPin className="h-2.5 w-2.5" />
                              <span>GPS</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredPois.length === 0 && (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Không tìm thấy địa điểm phù hợp.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
