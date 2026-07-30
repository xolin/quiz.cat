// Fulla de disseny de quiz.cat: paleta amb ratios de contrast calculats, joc d'icones i
// expressions de la mascota, més el favicon.
//
//   pnpm design:sheet     → apps/web/public/_design.html + favicon.svg
//
// El contrast NO es mira a ull: es calcula aquí i el que no arriba a 4,5:1 (3:1 si és text
// gran) surt marcat i fa sortir l'script amb error. Cap color entra a la paleta sense
// passar-hi.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mascotSvg, FACES } from "../apps/web/src/components/mascotArt.js";
import { ICONS } from "../apps/web/src/components/iconArt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ── Contrast WCAG ───────────────────────────────────────────────────────────
const srgb = (hex: string) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
};
const lum = (hex: string) => {
  const [r, g, b] = srgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const C = {
  stage: "#0E1520", stage2: "#182231", stage3: "#223046", hairline: "#2C3C54",
  ink: "#F4F7FB", inkDim: "#A9B6C7", inkOnLight: "#17202C",
  amber: "#F0A044", amberDeep: "#D9822B", live: "#CE3A2F", liveText: "#F08279", good: "#3FBF7F",
  geo: "#2E8FE0", hist: "#C9803A", sci: "#34B8A8", cult: "#B96FDC", nat: "#6FBF4A",
};

/** Barreja amb blanc, com fa `color-mix(in srgb, #fff N%, color)` a la pestanya del rètol. */
const lighten = (hex: string, pct: number) => {
  const h = hex.replace("#", "");
  const mix = [0, 2, 4].map((i) => Math.round(255 * pct + parseInt(h.slice(i, i + 2), 16) * (1 - pct)));
  return "#" + mix.map((v) => v.toString(16).padStart(2, "0")).join("");
};

/** Parelles que el disseny fa servir de debò, amb el mínim que han de complir. */
const PAIRS: Array<[string, string, string, number]> = [
  ["text sobre escenari", C.ink, C.stage, 4.5],
  ["text secundari sobre escenari", C.inkDim, C.stage, 4.5],
  ["text sobre panell", C.ink, C.stage2, 4.5],
  ["text secundari sobre panell", C.inkDim, C.stage2, 4.5],
  ["text sobre pestanya", C.inkDim, C.stage3, 4.5],
  ["ambre sobre escenari (xifres grans)", C.amber, C.stage, 3],
  ["tinta fosca sobre ambre", C.inkOnLight, C.amber, 4.5],
  ["tinta fosca sobre ambre fosc", C.inkOnLight, C.amberDeep, 4.5],
  ["tinta fosca sobre encert", C.inkOnLight, C.good, 4.5],
  ["blanc sobre error", "#FFFFFF", C.live, 4.5],
  ["tinta fosca sobre geografia", C.inkOnLight, C.geo, 4.5],
  ["tinta fosca sobre història", C.inkOnLight, C.hist, 4.5],
  ["tinta fosca sobre ciència", C.inkOnLight, C.sci, 4.5],
  ["tinta fosca sobre cultura", C.inkOnLight, C.cult, 4.5],
  ["tinta fosca sobre natura", C.inkOnLight, C.nat, 4.5],
  // El roig de fons no serveix com a text sobre l'escenari: hi ha un token a part.
  ["roig de text sobre escenari", C.liveText, C.stage, 4.5],
  ["roig de text sobre panell", C.liveText, C.stage2, 4.5],
  // Pestanya del rètol: el color de secció aclarit un 22% amb blanc.
  ...(["geo", "hist", "sci", "cult", "nat"] as const).map(
    (k) => [`tinta fosca sobre pestanya ${k}`, C.inkOnLight, lighten(C[k], 0.22), 4.5] as [string, string, string, number],
  ),
];

const results = PAIRS.map(([name, fg, bg, min]) => {
  const r = ratio(fg, bg);
  return { name, fg, bg, min, r, ok: r >= min };
});
const failed = results.filter((r) => !r.ok);

// ── Fulla ───────────────────────────────────────────────────────────────────
const icons = Object.keys(ICONS) as Array<keyof typeof ICONS>;
const moods = Object.keys(FACES) as Array<keyof typeof FACES>;
const iconSvg = (n: keyof typeof ICONS, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

const html = `<style>
  @font-face { font-family: "Archivo"; src: url("/fonts/archivo-latin.woff2") format("woff2");
    font-weight: 400 700; font-stretch: 62% 125%; }
  body { font-family: Archivo, system-ui, sans-serif; background: ${C.stage}; color: ${C.ink};
    margin: 0; padding: 32px; }
  h2 { font-stretch: 74%; letter-spacing: -0.01em; margin: 32px 0 12px; }
  h2:first-child { margin-top: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 4px; }
  .cell { border: 1px solid ${C.hairline}; border-radius: 3px; padding: 10px 4px; text-align: center;
    background: ${C.stage2}; }
  .cell span { display: block; margin-top: 6px; font-size: 10px; color: ${C.inkDim}; }
  .cell svg { margin: 0 auto; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  td, th { text-align: left; padding: 5px 8px; border-bottom: 1px solid ${C.hairline}; }
  th { color: ${C.inkDim}; font-size: 11px; text-transform: uppercase; letter-spacing: .07em; }
  .ok { color: ${C.good}; } .no { color: ${C.live}; font-weight: 700; }
  .sw { display: inline-block; width: 34px; height: 16px; border-radius: 2px; vertical-align: -3px; }
  .num { font-stretch: 66%; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
<h2>Paleta i contrast</h2>
<table><tr><th>parella</th><th>mostra</th><th>ratio</th><th>mínim</th></tr>
${results.map((r) => `<tr>
  <td>${r.name}</td>
  <td><span class="sw" style="background:${r.bg}"></span>
      <span style="color:${r.fg};background:${r.bg};padding:2px 6px;border-radius:2px">Aa 1.240</span></td>
  <td class="num ${r.ok ? "ok" : "no"}">${r.r.toFixed(2)}:1</td>
  <td class="num" style="color:${C.inkDim}">${r.min}:1</td>
</tr>`).join("")}
</table>
<h2>Icones (${icons.length})</h2>
<div class="grid">${icons.map((n) => `<div class="cell">${iconSvg(n)}<span>${n}</span></div>`).join("")}</div>
<h2>Icones a 16 px</h2>
<div class="grid">${icons.map((n) => `<div class="cell">${iconSvg(n, 16)}<span>${n}</span></div>`).join("")}</div>
<h2>Mascota</h2>
<div class="grid">${moods.map((m) => `<div class="cell">
  <svg viewBox="0 0 100 100" width="64" height="64">${mascotSvg(m)}</svg><span>${m}</span></div>`).join("")}</div>
`;

fs.writeFileSync(path.join(ROOT, "apps/web/public/_design.html"), html);
fs.writeFileSync(
  path.join(ROOT, "apps/web/public/favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${mascotSvg("neutre")}</svg>`,
);

console.log(`Fulla: ${icons.length} icones · ${moods.length} expressions · ${results.length} parelles de contrast`);
for (const r of failed) {
  console.log(`  ✗ ${r.name}: ${r.r.toFixed(2)}:1 (cal ${r.min}:1)`);
}
if (failed.length) {
  console.log(`\n${failed.length} parelles no arriben al mínim: cal ajustar la paleta.`);
  process.exit(1);
}
console.log("Totes les parelles passen el mínim de contrast.");
