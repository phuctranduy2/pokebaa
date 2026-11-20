// Procedural inline SVG artwork helpers (100% offline & WebGL safe)
export function encodeSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createOnePieceCardSvgDataUrl(params: {
  name: string;
  code: string;
  faction: string;
  power: number;
  rarityLabel: string;
  price: number;
  icon: string;
  bgA: string;
  bgB: string;
  accent: string;
  isManga?: boolean;
}): string {
  const { name, code, faction, power, rarityLabel, price, icon, bgA, bgB, accent, isManga } = params;
  const safeName = escapeXml(name.length > 22 ? `${name.slice(0, 20)}..` : name);
  const safeFaction = escapeXml(faction);
  const safeCode = escapeXml(code);
  const safeRarity = escapeXml(rarityLabel.slice(0, 24));
  const priceText = price >= 100 ? `$${Math.round(price).toLocaleString()}` : `$${price.toFixed(2)}`;

  const mangaStripes = isManga
    ? `<g opacity="0.22">
        <rect x="28" y="88" width="256" height="22" fill="#ffffff"/>
        <rect x="28" y="122" width="256" height="14" fill="#fde047"/>
        <rect x="28" y="150" width="256" height="20" fill="#ffffff"/>
        <rect x="28" y="268" width="256" height="16" fill="#fde047"/>
      </g>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 312 436" width="312" height="436">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgA}"/>
        <stop offset="55%" stop-color="${bgB}"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
      <linearGradient id="foil" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/>
        <stop offset="50%" stop-color="#fef08a" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.25"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="308" height="432" rx="18" fill="#0b1120" stroke="${accent}" stroke-width="4"/>
    <rect x="12" y="12" width="288" height="412" rx="12" fill="url(#bg)" stroke="#fde047" stroke-width="1.5" stroke-opacity="0.7"/>
    ${mangaStripes}
    <rect x="20" y="20" width="272" height="42" rx="8" fill="#090d16" fill-opacity="0.82" stroke="${accent}" stroke-width="1.5"/>
    <text x="32" y="38" fill="#fde047" font-family="Arial Black, sans-serif" font-size="11" font-weight="900">ONE PIECE CARD GAME</text>
    <text x="32" y="54" fill="#cbd5e1" font-family="monospace" font-size="11" font-weight="700">${safeCode} · ${safeFaction}</text>
    <circle cx="264" cy="41" r="16" fill="${accent}" stroke="#ffffff" stroke-width="1.5"/>
    <text x="264" y="45" text-anchor="middle" fill="#090d16" font-family="Arial Black, sans-serif" font-size="10" font-weight="900">${Math.round(power / 1000)}K</text>

    <rect x="24" y="74" width="264" height="222" rx="12" fill="#0f172a" fill-opacity="0.48" stroke="url(#foil)" stroke-width="2.5"/>
    <circle cx="156" cy="184" r="74" fill="${accent}" fill-opacity="0.22" stroke="#fde047" stroke-width="2" stroke-dasharray="6 4"/>
    <circle cx="156" cy="184" r="56" fill="#090d16" fill-opacity="0.6" stroke="${accent}" stroke-width="2.5"/>
    <text x="156" y="204" text-anchor="middle" font-size="68">${icon}</text>

    <rect x="20" y="308" width="272" height="106" rx="10" fill="#090d16" fill-opacity="0.9" stroke="${accent}" stroke-width="1.5"/>
    <text x="156" y="335" text-anchor="middle" fill="#ffffff" font-family="Arial Black, sans-serif" font-size="18" font-weight="900">${safeName}</text>
    <text x="156" y="357" text-anchor="middle" fill="#fde047" font-family="Arial, sans-serif" font-size="11" font-weight="700">${safeRarity}</text>
    <line x1="36" y1="368" x2="276" y2="368" stroke="#334155" stroke-width="1.5"/>
    <text x="34" y="394" fill="#94a3b8" font-family="monospace" font-size="12" font-weight="700">PWR ${power.toLocaleString()}</text>
    <rect x="196" y="376" width="84" height="26" rx="6" fill="#10b981"/>
    <text x="238" y="394" text-anchor="middle" fill="#052e16" font-family="monospace" font-size="13" font-weight="900">${priceText}</text>
  </svg>`;
  return encodeSvgDataUrl(svg);
}
