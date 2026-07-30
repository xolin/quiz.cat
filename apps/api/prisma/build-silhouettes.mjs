// Genera les siluetes (contorns SVG) per al tipus de pregunta "silhouette".
// Font: Natural Earth — DOMINI PÚBLIC (naturalearthdata.com/about/terms-of-use).
// A diferència de les imatges de la "foto misteriosa", aquí no hi ha dubte de llicència.
//
// Surt: silhouette-manifest.json amb { path, w, h } per país (clau = ISO A2 en minúscula)
// i per comunitat autònoma (clau = "es-<slug>", dissolent les províncies de Natural Earth).
// Els geojson d'origen NO es guarden al repo: es baixen aquí i es llencen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "silhouette-manifest.json");
const CACHE = path.join(__dirname, ".ne-cache");
const BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";

// Comunitats autònomes: nom en català ← noms de "region" de Natural Earth (en castellà).
const CCAA = {
  catalunya: "Cataluña",
  andalusia: "Andalucía",
  arago: "Aragón",
  astories: "Asturias",
  balears: "Islas Baleares",
  canaries: "Canary Is.",
  cantabria: "Cantabria",
  "castella-la-manxa": "Castilla-La Mancha",
  "castella-i-lleo": "Castilla y León",
  extremadura: "Extremadura",
  galicia: "Galicia",
  madrid: "Madrid",
  murcia: "Murcia",
  navarra: "Foral de Navarra",
  "pais-valencia": "Valenciana",
  "pais-basc": "País Vasco",
  rioja: "La Rioja",
};
const CCAA_LABEL = {
  catalunya: "Catalunya", andalusia: "Andalusia", arago: "Aragó", astories: "Astúries",
  balears: "Illes Balears", canaries: "Canàries", cantabria: "Cantàbria",
  "castella-la-manxa": "Castella-la Manxa", "castella-i-lleo": "Castella i Lleó",
  extremadura: "Extremadura", galicia: "Galícia", madrid: "Madrid", murcia: "Múrcia",
  navarra: "Navarra", "pais-valencia": "País Valencià", "pais-basc": "País Basc", rioja: "La Rioja",
};

async function geojson(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const cached = path.join(CACHE, `${name}.geojson`);
  if (!fs.existsSync(cached)) {
    process.stdout.write(`baixant ${name}… `);
    const res = await fetch(`${BASE}/${name}.geojson`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    fs.writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
    console.log("ok");
  }
  return JSON.parse(fs.readFileSync(cached, "utf8"));
}

/** Anells (arrays de [lng,lat]) d'una geometria Polygon/MultiPolygon, amb forats inclosos. */
function ringsOf(geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polys.map((poly) => poly.map((ring) => ring.map(([lng, lat]) => [lng, lat])));
}

/** Àrea (signada) d'un anell en graus² — només per comparar mides relatives. */
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

const centroid = (ring) => {
  const s = ring.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  return [s[0] / ring.length, s[1] / ring.length];
};

/** Douglas-Peucker sobre una línia oberta: treu punts que no canvien la forma més que `tol`. */
function simplify(points, tol) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    const [x0, y0] = points[i0];
    const [x1, y1] = points[i1];
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1e-9;
    let far = -1, best = tol;
    for (let i = i0 + 1; i < i1; i++) {
      const d = Math.abs((points[i][0] - x0) * dy - (points[i][1] - y0) * dx) / len;
      if (d > best) { best = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([i0, far], [far, i1]); }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Simplifica un anell TANCAT. Douglas-Peucker degenera si el primer i l'últim punt
 * coincideixen (la recta base té llargada 0 i no conserva cap punt), així que
 * partim l'anell pel punt més llunyà del primer i simplifiquem les dues meitats.
 */
function simplifyRing(ring, tol) {
  const first = ring[0], last = ring[ring.length - 1];
  const pts = first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring.slice();
  if (pts.length < 6) return pts;
  let far = 0, best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > best) { best = d; far = i; }
  }
  return simplify(pts.slice(0, far + 1), tol).concat(simplify(pts.slice(far), tol).slice(1));
}

/**
 * Converteix un conjunt de polígons lat/lng en un `path` SVG normalitzat.
 * - Projecció equirectangular escalada per cos(latitud mitjana): prou fidel a escala de país.
 * - Descarta trossos petits o llunyans (territoris d'ultramar: Canàries, Guaiana, Hawaii…).
 */
function toPath(polygons, { size = 100, tol = 0.35, minAreaPct = 0.02, maxAwayDeg = 22 } = {}) {
  // Antimeridià: si l'abast en longitud passa de 180°, desplaça les longituds negatives.
  const lngs = polygons.flat(2).map((p) => p[0]);
  if (Math.max(...lngs) - Math.min(...lngs) > 180) {
    polygons = polygons.map((poly) => poly.map((ring) => ring.map(([x, y]) => [x < 0 ? x + 360 : x, y])));
  }

  const ranked = polygons
    .map((poly) => ({ poly, area: ringArea(poly[0]), c: centroid(poly[0]) }))
    .sort((a, b) => b.area - a.area);
  const main = ranked[0];
  const kept = ranked.filter(
    (r) => r.area >= main.area * minAreaPct && Math.hypot(r.c[0] - main.c[0], r.c[1] - main.c[1]) <= maxAwayDeg,
  );

  const pts = kept.flatMap((r) => r.poly.flat());
  const lat0 = (Math.min(...pts.map((p) => p[1])) + Math.max(...pts.map((p) => p[1]))) / 2;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const proj = ([lng, lat]) => [lng * k, -lat]; // y invertida: l'SVG creix cap avall

  const xy = kept.map((r) => r.poly.map((ring) => ring.map(proj)));
  const flat = xy.flat(2);
  const minX = Math.min(...flat.map((p) => p[0])), maxX = Math.max(...flat.map((p) => p[0]));
  const minY = Math.min(...flat.map((p) => p[1])), maxY = Math.max(...flat.map((p) => p[1]));
  const scale = size / Math.max(maxX - minX, maxY - minY);
  const w = +((maxX - minX) * scale).toFixed(1);
  const h = +((maxY - minY) * scale).toFixed(1);

  const d = xy
    .flatMap((poly) => poly)
    .map((ring) => {
      const norm = ring.map(([x, y]) => [(x - minX) * scale, (y - minY) * scale]);
      const s = simplifyRing(norm, tol);
      if (s.length < 4) return "";
      return s.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";
    })
    .filter(Boolean)
    .join("");

  return { path: d, w, h };
}

const shapes = {};

// 1) Països (Natural Earth 50m: prou detall per reconèixer-los, prou lleuger).
const adm0 = await geojson("ne_50m_admin_0_countries");
for (const f of adm0.features) {
  const p = f.properties;
  const cc = (p.ISO_A2_EH || p.ISO_A2 || "").toLowerCase();
  if (!cc || cc === "-99" || p.TYPE === "Dependency") continue;
  const polys = ringsOf(f.geometry);
  const biggest = Math.max(...polys.map((poly) => ringArea(poly[0])));
  if (biggest < 0.5) continue; // microestats: la silueta no es distingiria
  shapes[cc] = { ...toPath(polys), label: p.NAME };
}

// 2) Comunitats autònomes: Natural Earth dona províncies; les ajuntem per "region".
//    No cal fer la unió geomètrica: pintades amb el mateix farciment es veuen com una sola forma.
const adm1 = await geojson("ne_10m_admin_1_states_provinces");
const esFeatures = adm1.features.filter((f) => f.properties.adm0_a3 === "ESP");
for (const [slug, region] of Object.entries(CCAA)) {
  const polys = esFeatures.filter((f) => f.properties.region === region).flatMap((f) => ringsOf(f.geometry));
  if (!polys.length) { console.warn(`  ⚠ sense geometria: ${region}`); continue; }
  // Les CCAA són petites: menys tolerància i deixa illes properes (Balears, Canàries).
  shapes[`es-${slug}`] = { ...toPath(polys, { tol: 0.25, minAreaPct: 0.01, maxAwayDeg: 30 }), label: CCAA_LABEL[slug] };
}

const manifest = {
  source: "Natural Earth (naturalearthdata.com) — domini públic",
  scales: { countries: "ne_50m_admin_0_countries", regions: "ne_10m_admin_1_states_provinces" },
  generatedAt: new Date().toISOString().slice(0, 10),
  shapes,
};
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 0));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`Siluetes: ${Object.keys(shapes).length} formes (${Object.keys(CCAA).length} CCAA) · ${kb} kB → ${path.basename(OUT)}`);
