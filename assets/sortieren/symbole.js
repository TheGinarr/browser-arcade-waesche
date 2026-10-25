/* ============================================================
   SORTIERSPIELE · symbole.js – eigene SVG-Bildchen (keine Fremdgrafik)
   Jede Sorte hat Farbe UND Zeichen, damit man sie auch ohne
   Farbsehen unterscheiden kann.
   ============================================================ */

export const FARBEN = [
  ["#ff4d6d", "Rot"],
  ["#3a86ff", "Blau"],
  ["#ffd23f", "Gelb"],
  ["#2ec4b6", "Türkis"],
  ["#9b5de5", "Lila"],
  ["#ff8c42", "Orange"],
  ["#8ac926", "Grün"],
  ["#f15bb5", "Pink"],
  ["#e9ecef", "Weiß"],
  ["#6c757d", "Grau"],
  ["#8d5524", "Braun"],
  ["#00f5d4", "Mint"],
];

// Kleine Zeichen auf den Teilen (Farbe allein reicht nicht für alle Augen)
const ZEICHEN = [
  '<circle cx="0" cy="0" r="3"/>',
  '<rect x="-3" y="-3" width="6" height="6"/>',
  '<path d="M0-4 4 3H-4z"/>',
  '<path d="M0-4 4 0 0 4-4 0z"/>',
  '<path d="M-4-1h8v2h-8zM-1-4h2v8h-2z"/>',
  '<path d="M-4-3h8v2h-8zM-4 1h8v2h-8z"/>',
  '<circle cx="0" cy="0" r="3.5" fill="none" stroke-width="1.6" stroke="#0008"/>',
  '<path d="M0 4-4-1a2.3 2.3 0 0 1 4-2.5A2.3 2.3 0 0 1 4-1z"/>',
  '<path d="M0-4 1.2-1.2 4-1 1.8 1 2.5 4 0 2.3-2.5 4-1.8 1-4-1-1.2-1.2z"/>',
  '<path d="M-4 3 0-4 4 3M-2 0h4" fill="none" stroke-width="1.6" stroke="#0008"/>',
  '<path d="M-4-4h3v3h-3zM1 1h3v3h-3zM1-4h3v3h-3zM-4 1h3v3h-3z"/>',
  '<path d="M-4 0a4 4 0 0 0 8 0z"/>',
];

const zeichen = (s, x, y, f = 1) =>
  `<g transform="translate(${x} ${y}) scale(${f})" fill="#0008">${ZEICHEN[s % ZEICHEN.length]}</g>`;

/* ---------- Wäsche ---------- */
export function shirt(s) {
  const [farbe] = FARBEN[s];
  return `<svg viewBox="0 0 40 22" aria-hidden="true"><path d="M8 2 14 1q6 4 12 0l6 1 7 6-4 5-4-2v10H9V11l-4 2-4-5z" fill="${farbe}" stroke="#0006" stroke-width="1"/><path d="M14 1q6 4 12 0" fill="none" stroke="#0004" stroke-width="1.4"/>${zeichen(s, 20, 13)}</svg>`;
}

export function socke(s) {
  const [farbe] = FARBEN[s];
  return `<svg viewBox="0 0 40 22" aria-hidden="true"><path d="M10 1h12v9l9 4q3 3 0 6H14q-4 0-4-5z" fill="${farbe}" stroke="#0006" stroke-width="1"/><path d="M10 4h12" stroke="#fff6" stroke-width="2"/>${zeichen(s, 16, 12)}</svg>`;
}

/** Wäscheklammer (leer) für die Leine. */
export function klammer() {
  return `<svg viewBox="0 0 16 26" aria-hidden="true"><rect x="4" y="1" width="3.4" height="24" rx="1.4" fill="#d4a373"/><rect x="8.6" y="1" width="3.4" height="24" rx="1.4" fill="#c08552"/><circle cx="8" cy="10" r="2.6" fill="none" stroke="#9aa0c6" stroke-width="1.2"/></svg>`;
}

/** Bullauge der Waschmaschine – über einem fertigen Korb. */
export function bullauge() {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="7" fill="#e9ecef"/><rect x="5" y="4" width="10" height="3" rx="1.5" fill="#adb5bd"/><circle cx="31" cy="6" r="2" fill="#8ac926"/><circle cx="20" cy="23" r="13" fill="#6c757d"/><circle cx="20" cy="23" r="10" fill="#9bd1ff"/><path class="trommel" d="M11 25q4-4 9 0t9 0v6q-4 5-9 5t-9-5z" fill="#3a86ff" opacity=".7"/><circle cx="16" cy="19" r="1.6" fill="#fff" opacity=".8"/><circle cx="24" cy="17" r="1" fill="#fff" opacity=".8"/></svg>`;
}

/* ---------- Regale: 12 Waren ---------- */
const WAREN = [
  '<path d="M12 7c-5-3-10 1-9 7s5 9 9 7c4 2 8-1 9-7s-4-10-9-7z" fill="#ff4d6d"/><path d="M12 7q0-4 3-5" stroke="#5a3" stroke-width="2" fill="none"/>',
  '<path d="M6 8 9 3h6l3 5v14H6z" fill="#e9ecef"/><path d="M6 12h12v6H6z" fill="#3a86ff"/>',
  '<rect x="5" y="4" width="14" height="18" rx="2" fill="#ffd23f"/><rect x="5" y="9" width="14" height="7" fill="#d62828"/>',
  '<path d="M3 12q0-7 9-7t9 7v9H3z" fill="#c68b59"/><path d="M8 9v4M12 8v4M16 9v4" stroke="#8d5524" stroke-width="1.5"/>',
  '<path d="M3 20V11L19 5l2 6v9z" fill="#ffc84d"/><circle cx="9" cy="15" r="1.8" fill="#d9a520"/><circle cx="15" cy="12" r="1.3" fill="#d9a520"/>',
  '<path d="M10 2h4v5l3 4v11H7V11l3-4z" fill="#2ec4b6"/><rect x="7" y="13" width="10" height="5" fill="#e9ecef"/>',
  '<ellipse cx="8" cy="15" rx="4.5" ry="6" fill="#fff1d6"/><ellipse cx="16" cy="15" rx="4.5" ry="6" fill="#f4d6a7"/>',
  '<path d="M12 22 6 8h12z" fill="#ff8c42"/><path d="M12 8 9 2M12 8l3-6M12 8V2" stroke="#8ac926" stroke-width="2"/>',
  '<rect x="3" y="7" width="18" height="12" rx="3" fill="#9aa0c6"/><path d="M7 13q4-4 8 0-4 4-8 0zm8 0 3-2v4z" fill="#3a86ff"/>',
  '<path d="M6 4h12l1 18H5z" fill="#8d5524"/><circle cx="12" cy="13" r="3.5" fill="#3e2112"/><path d="M12 10v6" stroke="#8d5524" stroke-width="1"/>',
  '<rect x="7" y="3" width="10" height="3" fill="#b07d2b"/><path d="M5 8q0-2 3-2h8q3 0 3 2v12q0 2-3 2H8q-3 0-3-2z" fill="#f4a261"/><path d="M8 13h8" stroke="#b07d2b" stroke-width="2"/>',
  '<path d="M4 8q2 12 16 10l1 2Q4 23 2 8z" fill="#ffe066" stroke="#b8961f" stroke-width="1"/>',
];
export const WAREN_NAMEN = [
  "Apfel",
  "Milch",
  "Dose",
  "Brot",
  "Käse",
  "Flasche",
  "Eier",
  "Karotte",
  "Fisch",
  "Kaffee",
  "Honig",
  "Banane",
];

export function ware(s) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${WAREN[s % WAREN.length]}</svg>`;
}

/** Holzkiste mit Zahl (so viele Dreier fehlen noch). */
export function kiste(rest) {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="4" width="36" height="32" rx="3" fill="#a0673a" stroke="#5c3a1e" stroke-width="2"/><path d="M2 14h36M2 26h36" stroke="#5c3a1e" stroke-width="2"/><path d="M4 6l32 28M36 6 4 34" stroke="#7b4a26" stroke-width="3"/><circle cx="20" cy="20" r="9" fill="#ffd23f" stroke="#5c3a1e" stroke-width="1.5"/><text x="20" y="24.5" font-size="12" font-weight="700" text-anchor="middle" fill="#3e2112" font-family="system-ui,sans-serif">${rest}</text></svg>`;
}

/* ---------- Gewürze ---------- */
export const GEWUERZE = [
  ["#e63946", "Paprika"],
  ["#ffb703", "Kurkuma"],
  ["#52b788", "Basilikum"],
  ["#a0522d", "Zimt"],
  ["#9b5de5", "Lavendel"],
];

export function gewuerzGlas(s) {
  const [farbe] = GEWUERZE[s];
  return `<svg viewBox="0 0 30 36" aria-hidden="true"><rect x="7" y="1" width="16" height="6" rx="1.5" fill="#c9a227" stroke="#7a5f12" stroke-width=".8"/><path d="M5 9q0-2 3-2h14q3 0 3 2v23q0 3-3 3H8q-3 0-3-3z" fill="#ffffff26" stroke="#ffffff88"/><path d="M6.5 15h17v16q0 2.5-2.5 2.5H9q-2.5 0-2.5-2.5z" fill="${farbe}"/><rect x="7" y="17" width="16" height="10" rx="1.5" fill="#fff8e7"/>${zeichen(s, 15, 22, 1.05).replace('fill="#0008"', `fill="${farbe}"`)}<path d="M8 10v4" stroke="#fff9" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

/** Klarname einer Sorte für Screenreader. */
export const farbName = (s) => FARBEN[s][1];
