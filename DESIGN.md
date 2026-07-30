---
name: quiz.cat
description: El paquet de grafisme d'una retransmissió de concurs, dins un client web de mòbil.
colors:
  stage: "#0e1520"
  stage-2: "#182231"
  stage-3: "#223046"
  hairline: "#2c3c54"
  ink: "#f4f7fb"
  ink-dim: "#a9b6c7"
  ink-on-light: "#17202c"
  amber: "#f0a044"
  amber-deep: "#d9822b"
  live: "#ce3a2f"
  live-text: "#f08279"
  good: "#3fbf7f"
  geo: "#2e8fe0"
  hist: "#c9803a"
  sci: "#34b8a8"
  cult: "#b96fdc"
  nat: "#6fbf4a"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.5rem, 7vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.02em"
    fontVariation: "wdth 78"
  score:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2rem, 8vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
    fontVariation: "wdth 66"
    fontFeature: "tnum 1"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontVariation: "wdth 74"
  lead:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.15
  label:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.07em"
    fontVariation: "wdth 74"
rounded:
  r: "3px"
  r-2: "6px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
components:
  option:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    height: "56px"
  option-tab:
    backgroundColor: "{colors.stage-3}"
    textColor: "{colors.ink-dim}"
    width: "46px"
  option-picked:
    backgroundColor: "color-mix(in srgb, #f0a044 16%, #182231)"
    textColor: "{colors.ink}"
  option-good:
    backgroundColor: "{colors.good}"
    textColor: "{colors.ink-on-light}"
  option-bad:
    backgroundColor: "{colors.live}"
    textColor: "#ffffff"
  button:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "12px 24px"
    height: "46px"
  button-hover:
    backgroundColor: "{colors.stage-3}"
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.r}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.amber-deep}"
    textColor: "{colors.ink-on-light}"
  button-primary-disabled:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink-dim}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    size: "44px"
  lower-third:
    backgroundColor: "{colors.geo}"
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.r}"
    padding: "8px 12px"
  lower-third-plain:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink-dim}"
  counter:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    typography: "{typography.score}"
    rounded: "{rounded.r}"
    padding: "0 12px"
    width: "92px"
  counter-low:
    backgroundColor: "color-mix(in srgb, #ce3a2f 14%, #182231)"
    textColor: "{colors.live-text}"
  media:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
  media-caption:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    padding: "8px 12px"
  scoreboard:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "8px 12px"
  mode:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.r-2}"
    padding: "24px 16px"
  panel:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "16px"
  input:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "12px"
  toast-good:
    backgroundColor: "{colors.good}"
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.r-2}"
    padding: "16px 24px"
  toast-bad:
    backgroundColor: "{colors.live}"
    textColor: "#ffffff"
    rounded: "{rounded.r-2}"
    padding: "16px 24px"
---

# Design System: quiz.cat

Aquest fitxer descriu el sistema **tal com està construït** a `apps/web`, no com es va
plantejar. Font de veritat: `apps/web/src/styles.css` (tokens `--qc-*`, classes `.qc-*`),
`apps/web/src/components/iconArt.ts`, `mascotArt.ts` i `scripts/design-sheet.mts`. Quan el
contracte de direcció (capçalera de `styles.css` i d'`index.html`) i el codi no diuen el
mateix, aquí manda el codi i la diferència queda anotada.

## Overview

**Creative North Star: "El paquet de grafisme de retransmissió"**

El món no és el plató: és el **grafisme que s'hi sobreimprimeix**. Rètol de secció, panells
que s'encenen, comptador amb marc propi, marcador de xifres condensades. Tot viu sobre un
fons d'estudi blau pissarra (`--qc-stage`) amb un únic bany de llum radial darrere la
pregunta. Res de plató físic: cap bisell, cap daurat, cap purpurina, cap scanline. El kitsch
retro és l'anti-referència confirmada.

La densitat és de mòbil primer, columna única de 680 px màxim, centrada, amb ritme
d'espaiat de 4 px. La jerarquia de la pantalla de partida està fixada pel contracte i
respectada pel codi: rètol + comptador, barra de temps, pregunta gran en condensada,
panells de resposta, marcador a baix. La mascota (el gat) **no apareix mentre penses**: entra
al toast del resultat i a les pantalles d'inici i de resum.

El color de secció és estructural, no decoratiu: cada categoria té el seu to i el rètol de
la partida s'hi pinta sencer. L'ambre és el **color d'antena** (pelatge del gat), i per això
mai omple un camp fora d'un mode d'inici: marca acció primària, focus i xifra viva.

**Key Characteristics:**
- Fons d'estudi fosc únic (`color-scheme: dark`), sense mode clar.
- Cantell viu: 3 px de radi per defecte, 6 px per als blocs grans.
- Una sola família tipogràfica, amb l'eix d'amplada fent de segona veu.
- Xifres sempre condensades i tabulars.
- Cap senyal important que depengui només del color.
- Contrast verificat per script, no a ull.

## Colors

Paleta d'estudi fosc amb un únic accent càlid d'antena i cinc tons de secció que entren
només per categoria.

### Primary
- **Ambre d'antena** (`--qc-amber`): acció primària (`.qc-btn--primary`), anell de focus,
  barra de temps i d'energia, xifres vives (ratxa ≥ 2, top 3 del rànquing), enllaços, camp
  del mode «Partida ràpida». És el pelatge del gat portat a la interfície.
- **Ambre profund** (`--qc-amber-deep`): només l'estat `:hover` del botó primari i les
  ratlles/detalls foscos de la mascota.

### Secondary
- **Verd d'encert** (`--qc-good`): panell correcte, toast d'encert, marcador de resposta bona
  al mapa i a la cronologia, carta emparellada al Memory.
- **Roig d'emissió** (`--qc-live`): panell erroni, toast d'error, estat de últims segons
  (marc del comptador i barra de temps), camp del mode Survival.
- **Roig de text** (`--qc-live-text`): existeix perquè `--qc-live` sobre l'escenari no arriba
  a 4,5:1 com a text. Qualsevol xifra o text roig sobre fons fosc fa servir aquest, mai el
  roig de fons.

### Tertiary — colors de secció
Cinc tons, un per categoria, mapats per slug a `CATEGORY_COLOR`: `--qc-geo` (geografia),
`--qc-hist` (història), `--qc-sci` (ciència), `--qc-cult` (cultura), `--qc-nat` (natura).
Tots estan calibrats per portar `--qc-ink-on-light` a sobre, i també aclarits un 22% amb
blanc, que és el que fa la pestanya del rètol.

### Neutral
- **Escenari** (`--qc-stage`): fons de `body` i del peu del marc de mèdia; també el fons dels
  camps de formulari i el `theme-color` del document.
- **Panell** (`--qc-stage-2`): tota superfície aixecada: panells, botons, comptador, marcador,
  marc de mèdia, opcions en repòs.
- **Pestanya** (`--qc-stage-3`): un pas més amunt: pestanya de lletra de les opcions, `:hover`
  de botons i opcions, fila del rànquing on ets tu, dors de la carta del Memory.
- **Fil** (`--qc-hairline`): tot contorn d'1 px i tot divisor. Aquest sistema separa amb fil,
  no amb ombra.
- **Tinta** (`--qc-ink`), **tinta apagada** (`--qc-ink-dim`), **tinta sobre clar**
  (`--qc-ink-on-light`): text principal, secundari i text sobre qualsevol camp de color.

### Named Rules

**La Regla de la Porta de Contrast.** Cap color entra a la paleta sense passar per
`pnpm design:sheet`. L'script (`scripts/design-sheet.mts`) calcula el ratio WCAG de les 22
parelles que el disseny fa servir de debò, exigeix 4,5:1 (3:1 per a xifra gran, cas de
l'ambre sobre escenari), imprimeix les que fallen i **surt amb codi d'error**. Canviar un to
i no tornar a passar l'script no és una decisió de disseny, és una aposta. La fulla generada
(`/_design.html`) també serveix de catàleg d'icones i d'expressions.

**La Regla del Camp de Secció.** El color de secció ocupa **tota** la banda del rètol només
a la partida, on identifica la categoria de la pregunta. A la resta de pantalles
(`--plain`) el camp es queda neutre i el color va només a la pestanya. Pintar la banda
sencera d'ambre convertiria el color d'antena en un camp, que és exactament el que el món no
vol.

**La Regla dels Tres Canals.** Els últims segons es diuen per tres vies alhora: camp roig
(barra), marc i tint rojos al comptador, i **ratlles a 45°** sobre l'emplenat de la barra.
La textura hi és perquè sota `prefers-reduced-motion` el pols desapareix i el color es
quedaria sol; i és textura, i no un rètol de text, perquè a 390 px el rètol es menjava el nom
de la mecànica — i en un joc on la gràcia és no saber quina ve, això era pitjor que el
problema.

**La Regla del Color Acompanyat.** Cap estat es comunica només amb color: la pestanya de
l'opció passa a ✓ o ✗ en revelar-se, el resum posa glif a cada fila, i les icones sempre
duen text o `aria-label`.

**La Regla de l'Hex Literal.** El valor literal en hexadecimal només és admissible on la
variable CSS no arriba: dades de dibuix SVG (`mascotArt.ts`: `FUR`, `FUR_DARK`, `INK`,
`PINK`) i marcadors de Leaflet (`Game.tsx`: `#F0A044`, `#3FBF7F`). Quan hi apareix, ha de
ser el mateix valor que el token; si canvies el token, tens dos llocs per tocar.

## Typography

**Una sola família: Archivo** (OFL, Omnibus-Type), variable, eix d'amplada `62%–125%`,
pesos `400–700`, auto-allotjada a `apps/web/public/fonts` en dos subconjunts
(`archivo-latin.woff2` i `archivo-latin-ext.woff2`, amb `unicode-range`), amb `font-display:
swap` i el subconjunt latin en `preload`. **Cap CDN.** Reserva:
`system-ui, -apple-system, sans-serif`.

**Character:** l'eix d'amplada fa de segona família. La condensada (66%–82%) és la veu de
retransmissió: xifres, títols, rètols, botons. L'amplada normal és la veu de lectura: text
d'opcions i cos. Que sigui la mateixa família és el que evita que la pantalla sembli dos
dissenys enganxats.

### Hierarchy
- **Display** (700, `--qc-t-display` = `clamp(1.5rem, 7vw, 2.4rem)`, amplada 78%,
  interlletra `-0.02em`, `text-wrap: balance`): la pregunta (`.qc-question`), sempre dins del
  bany de llum. És l'element de text més gran de la partida.
- **Score** (700, `--qc-t-score` = `clamp(2rem, 8vw, 3rem)`, amplada 66%, tabular): el
  comptador de segons, la xifra de resultat del resum i el valor de l'slider d'estimació.
- **Headline** (700, `1.5rem`, amplada 74%): títol de mode (`.qc-mode__title`) i salutació de
  l'inici. `h1,h2,h3` per defecte van a 78% i pes 700.
- **Lead** (`--qc-t-lead` = `1.0625rem`): text de l'opció de resposta i prou. És l'única
  mesura de text de lectura per damunt del cos, perquè el panell de resposta és el que has de
  llegir ràpid.
- **Body** (`--qc-t-body` = `1rem`, interlineat 1,5): text general i camps de formulari.
- **Small** (`--qc-t-small` = `0.875rem`): metadada del rètol, subtítols de mode, files de
  llista, enllaços secundaris.
- **Label** (700, `--qc-t-label` = `0.75rem`, amplada 70–74%, interlletra `0.06–0.08em`,
  MAJÚSCULES): `.qc-label`, pestanya del rètol, etiquetes del marcador, peu del marc de
  mèdia. La caixa alta viu només aquí.

### Named Rules

**La Regla d'una Sola Família.** Una família per a tot; si et cal una altra veu, mou l'eix
d'amplada, no la família. I res de CDN: la tipografia s'allotja al projecte perquè la
pregunta no pugui aparèixer en una altra lletra al primer fotograma.

**La Regla de la Xifra Tabular.** Tota xifra que canvia sola porta `.qc-num`
(amplada 66%, pes 700, `tabular-nums` + `tnum`). Sense això, un comptador que baixa de 10 a 9
fa saltar el layout, i saltar és exactament el que un marcador no fa.

## Layout

Columna única centrada: `.qc-screen` amb `max-width: 680px`, coixí de `--qc-5` a dalt,
`--qc-4` als costats i `--qc-7` a baix. No hi ha graella de pàgina; el ritme el porten els set
passos d'espaiat (4, 8, 12, 16, 24, 32, 48 px). Els passos de treball reals són `--qc-2`
(dins d'un objecte), `--qc-3`/`--qc-4` (coixí de component) i `--qc-5` (separació entre blocs
de la pantalla).

Els objectes de retransmissió es componen en tira: `.qc-strip` posa rètol i comptador a la
mateixa línia, el rètol creixent (`flex: 1`) i el comptador fix (`min-width: 92px`), i just a
sota hi va la barra de temps de 6 px.

Dos punts de ruptura, tots dos existeixen per trencament observat a 390 px:

- **480 px** — per sota, `.qc-lower-third__meta` apila ronda i nom de mecànica en dues línies;
  a partir d'aquí tornen a la mateixa fila. Sense apilar, «Ronda 1» es partia i «Foto
  misteriosa» quedava escapçat alhora.
- **560 px** — l'única amplada on `.qc-options--split` passa a dues columnes. Per sota, els
  panells de resposta sempre van a columna única: a 390 px «Castella-la Manxa» es partia en
  tres línies dins de mitja pantalla.

Cap element amb text pot confiar que hi cabrà: `.qc-option__label` porta
`overflow-wrap: anywhere` + `hyphens: auto`, i tota cel·la de flex que conté text porta
`min-width: 0` (i el·lipsi quan la línia és única, com al rètol o al rànquing).

Àrea de toc mínima: 44 px (`.qc-btn--icon`, `input[type=range]`), 46 px per als botons
normals, 56 px d'alçada mínima per als panells de resposta.

**La Regla dels 390.** Cap decisió de layout es pren mirant una finestra d'escriptori. Si una
regla no aguanta a 390 px d'amplada, la regla és falsa. El pas a dues columnes es guanya amb
amplada de viewport (`@media`), no amb suposicions sobre el contingut.

*Divergència registrada:* el comentari de `styles.css` diu que la doble columna «mai» depèn
del nombre de caràcters, però `Game.tsx` sí que hi condiciona la **classe**
(`options.length === 4 && text.length <= 18`), i el `@media` hi condiciona les **columnes**.
El resultat efectiu són dues portes en sèrie: amb quatre opcions curtes i ≥560 px hi ha dues
columnes; en qualsevol altre cas, una. Qui toqui això ha de saber que hi ha dos llocs.

## Elevation & Depth

Sistema **pla i estratificat**, sense ombres. La profunditat es fa amb tres nivells tonals
(`--qc-stage` → `--qc-stage-2` → `--qc-stage-3`) i un fil d'1 px de `--qc-hairline` que
dibuixa el cantell i els divisors. Un panell no s'aixeca: canvia de to.

L'única profunditat atmosfèrica del món és el **bany de llum d'estudi**: `.qc-stagelight` posa
un `radial-gradient` darrere la pregunta amb `z-index: -1` i `isolation: isolate`. Va a sang
(`inset: -88px -50vw -76px`), perquè la llum d'un plató no s'atura a la columna de text; la
caixa és més alta que el degradat perquè amb un radi vertical del 120% el traç transparent
queia fora de la caixa i deixava una costura recta sobre i sota la pregunta.

### Shadow Vocabulary
- **Ombra de toast** (`box-shadow: 0 18px 40px -12px rgba(0,0,0,0.7)`): l'única ombra del
  sistema, i només al `.qc-toast`, que és l'únic element que flota per damunt de la pantalla.
- **Fil interior** (`box-shadow: inset 0 0 0 1px var(--qc-hairline)`): dors de la carta del
  Memory, on un `border` desquadraria la cara girada.

**La Regla del Fil, no l'Ombra.** Les superfícies estan planes en repòs i se separen per to i
per fil. Si et cal una ombra per fer entendre un objecte, l'objecte està al nivell tonal
equivocat. L'excepció és el que sura de debò sobre tot: el toast.

## Shapes

Cantell viu. `--qc-r` = 3 px és el radi de gairebé tot (panells, botons, opcions, rètol,
comptador, marc de mèdia, marcador, camps); `--qc-r-2` = 6 px queda per als blocs grans que
es toquen amb el dit (camps de mode, toast). La forma de pastilla (`999px`) apareix a dos
llocs i prou: les barres de mesura (`.qc-meter`) i les insígnies d'assoliment. Tota la resta
és rectangle.

La silueta que es repeteix és el **rectangle compost de dues regions**: una pestanya estreta
de color amb un glif o una lletra, i el camp ample amb el text. És el rètol
(`__section` + `__meta`), és el panell de resposta (`__tab` + `__label`) i és el marc de mèdia
(cos + peu). Els objectes es tallen amb `overflow: hidden`, mai amb radis per cantonada.

El joc d'icones té la seva pròpia gramàtica: 39 icones de `24×24` en `viewBox`, traç de 2 px
amb extrems i unions rodons, `currentColor`, `fill: none` per defecte i massís només on cal
(pupil·les, banderes, triangle de `play`). És la mateixa línia que la mascota, i per això el
gat i les icones semblen del mateix joc. Verificat també a 16 px a la fulla de disseny.

## Components

### Botons (`.qc-btn`)
- **Forma:** cantell viu (3 px), contorn de fil, alçada mínima 46 px, coixí `12px 24px`.
- **Per defecte:** camp de panell (`--qc-stage-2`), tinta clara, amplada 82%, pes 700.
- **`:hover`:** puja un nivell tonal (`--qc-stage-3`), fons i contorn alhora. Transició de
  150 ms sobre fons, color, contorn, ombra i opacitat.
- **`--primary`:** camp ambre amb tinta fosca; `:hover` a ambre profund.
- **`--ghost`:** fons transparent, conserva el fil. Per a accions d'icona i secundàries.
- **`--block`:** amplada completa. **`--icon`:** quadrat de 44 px sense coixí.
- **Desactivat:** `opacity: .45` en general, **però el primari desactivat no s'esvaeix**:
  passa a neutre (camp de panell, tinta apagada). Un ambre al 45% sobre l'escenari es llegeix
  com un marró trencat, i el que ha de comunicar és «encara no».

### Panells de resposta (`.qc-option`)
El component signatura. Rectangle de dues regions: pestanya de 46 px amb la lletra (A–F, o
`+`/`−`, o el número d'ordre, o `·`) i camp amb el text a `--qc-t-lead`.
- **Repòs:** camp de panell, fil, pestanya un to per damunt.
- **`picked`:** contorn ambre i camp ambre al 16%; la pestanya s'omple d'ambre.
- **`good` / `bad`:** el panell **s'inunda** de verd o de roig i la pestanya passa a ✓ o ✗
  (pestanya un 18–20% més fosca que el camp). El `bad` afegeix `qc-shake`.
- **`dim`** (les descartades al revelar): text apagat, **però contorn i opacitat plens**. Amb
  `opacity: .45` el text queia a 4,26:1 i la graella parpellejava a cada enviament; amb el
  contorn del color del fons les descartades es dissolien justament quan has de comparar les
  quatre opcions.
- **Entrada:** el contenidor porta `.qc-lit`, que encén els fills en cascada de 40 ms
  (`qc-light-up`, delays de 0,02 a 0,14 s per als quatre primers).

### Rètol (`.qc-lower-third`)
Banda de dues regions que identifica on ets. Pestanya en majúscula estreta amb icona +
`color-mix(in srgb, #fff 22%, var(--qc-section))`; camp amb la metadada. Amb `--qc-section`
posat pel cridador (`CATEGORY_COLOR[slug]`) pinta la banda sencera; amb `--plain` el camp és
neutre i el color queda a la pestanya. Vegeu la Regla del Camp de Secció.

### Comptador i barra de temps (`.qc-counter`, `.qc-timer`)
El comptador és un **objecte amb marc propi**, no una xifra dins la metadada: 92 px mínims,
xifra a escala `score`, unitat «s» petita i apagada, dins la tira al costat del rètol. La
barra és el senyal perifèric: 6 px d'alt, emplenat ambre, `transform: scaleX()` (mai `width`:
es repinta cada 100 ms i animar l'amplada recalcularia el layout a cada tic) amb transició de
**100 ms exactes**, que és el tic del rellotge — amb 120 ms la barra anava sempre endarrerida
respecte de la xifra i, després d'un salt de rellotge amb la pestanya en segon pla, es veia
clarament discrepant-hi. A `--low` (≤27% del temps) entra el pols de 900 ms i les ratlles a
45°.

### Marc de mèdia (`.qc-media`)
La gramàtica que unifica les nou mecàniques: caixa de panell amb fil, cos centrat i **peu
d'instrucció** en etiqueta majúscula estreta, separat per fil, amb el fons de l'escenari. El
peu pot portar un valor a la dreta (per exemple el valor real en revelar l'estimació).
Tota mecànica que no sigui opció múltiple pura passa per aquí: mapa, foto amb blur, silueta,
comparació, cronologia i slider. Una mecànica nova hereta el marc; no s'inventa contenidor.

### Marcador (`.qc-scoreboard`)
Cel·les de la mateixa amplada separades per fil, dins una caixa de panell: etiqueta en
majúscula apagada a dalt, xifra tabular a `1.375rem` a sota. És la forma nativa d'aquest món
per a qualsevol conjunt de xifres d'estat: 2 cel·les a la partida, 3 al resum, 5 a l'inici.
La xifra que puja porta `.qc-bump` (escala 1,22 → 1).

### Camps de mode (`.qc-mode`)
Blocs de color que ocupen regió, no targetes amb icona i text. Radi de 6 px, coixí
`24px 16px`, camp injectat per `--qc-field`, títol a escala `headline` i subtítol petit.
`:hover` és `filter: brightness(1.08)` — l'única superfície del sistema que es tracta com a
llum. `--dark` per als camps foscos: elimina l'opacitat del subtítol i el passa a tinta
clara, perquè el blanc al 82% sobre el roig quedava per sota de 4,5:1.

### Toast de resultat (`.qc-toast`)
Fixat a dalt (`top: --qc-5`), centrat, amplada `min(340px, 100vw − 32px)`, radi 6 px, verd o
roig, amb l'única ombra del sistema i entrada `qc-wipe-in` (escombrada amb `clip-path`).
Porta el gat, la xifra de punts i, si has fallat, la resposta correcta. Es tanca sol
(1,4–3 s segons mecànica), avança amb un clic i **atura el compte enrere de l'auto-avanç amb
`mouseenter`/`focus`** perquè puguis llegir amb calma.

### Camps de formulari
Fons d'escenari (més fosc que el panell que els conté), fil, radi 3 px, coixí de 12 px,
`placeholder` en tinta apagada. `input[type=range]` fa servir `accent-color: var(--qc-amber)`
i 44 px d'alçada de toc.

### Mascota (`Mascot` + `mascotArt.ts`)
Un gat, **una sola geometria de cap** i 7 expressions (`neutre`, `content`, `trist`,
`sorpres`, `adormit`, `ko`, `pensant`) que només canvien ULLS i BOCA — és el que fa que
semblin el mateix gat i no set dibuixos. `viewBox` de 100×100, sense degradats ni filtres,
llegible de 128 px a 32 (la cara `neutre` és el favicon, generat per l'script). El taronja
del pelatge és l'origen de l'ambre d'antena. Res folklòric (barretina i companyia):
envelleix malament i és el recurs més gastat.
Ús: amfitrió a l'inici (`adormit` si no queda energia), comentarista al toast i al resum.
Mai durant la pregunta.

### Icones (`Icon` + `iconArt.ts`)
39 icones internes, `currentColor`, `display: block`, `flex-shrink: 0`. Si la icona és
l'únic contingut d'un botó cal `label` (surt com a `aria-label`); si va acompanyada de text
es marca `aria-hidden`. **Els emojis segueixen a la base de dades** (`Category.icon`,
`Topic.icon`) i el client els **ignora**: mapa `slug → icona` a `CATEGORY_ICON` i
`TOPIC_ICON`. Es va fer així per no migrar dades. Conseqüència operativa: qui afegeixi una
categoria o una temàtica ha d'afegir-hi l'entrada al mapa (i, si és categoria, també a
`CATEGORY_COLOR` i a les parelles de contrast de `design-sheet.mts`), o es quedarà sense
icona i sense color de secció.

### Moviment
La motricitat nativa d'aquest món és l'**escombrada** (`qc-wipe-in`, i el mateix gest a la
màscara de la silueta i al revelat de la foto). La resta: `qc-fade-in` a l'entrada de
pantalla (0,2 s), `qc-light-up` en cascada als panells, `qc-pulse` al temps baix, `qc-bump` a
les xifres que pugen, `qc-shake` a l'opció errònia, i el gir 3D de 0,35 s de la carta del
Memory. Tot plegat es desactiva d'una sola regla global:
`@media (prefers-reduced-motion: reduce) { *, .qc-memory-inner { animation: none !important;
transition: none !important; } }`. Per això cap senyal pot dependre d'una animació.

### Leaflet dins el marc de mèdia
El mapa no porta el seu propi aspecte: fons d'escenari, controls i atribució amb els tokens
del sistema, i `filter: brightness(1.45) saturate(0.95)` al pla de tessel·les, perquè les
tessel·les fosques de Carto deixaven les costes gairebé negres i en una pregunta de mapa la
geografia s'ha de poder reconèixer.

## Do's and Don'ts

### Do:
- **Do** passar `pnpm design:sheet` sempre que toquis un color, i afegir-hi la parella nova a
  `PAIRS` si has introduït una combinació text/fons que abans no existia. Si surt amb error,
  el color no entra.
- **Do** fer servir els tokens `--qc-*` per a tot: els valors literals dins de `style={{}}`
  han de ser referències `var(--qc-…)`, com ja fan totes les pantalles.
- **Do** posar `.qc-num` a qualsevol xifra que canviï sola.
- **Do** encaixar tota mecànica nova dins `.qc-media` amb el peu d'instrucció; el marc és la
  gramàtica que fa que les nou mecàniques semblin el mateix joc.
- **Do** donar un segon canal (glif, textura, text per a lector de pantalla) a qualsevol
  senyal que ara mateix es digui amb color.
- **Do** animar amb `transform` (`scaleX`, `translate`) i no amb `width`, sobretot al que es
  repinta cada 100 ms.
- **Do** posar `min-width: 0` i, si el text pot ser llarg, `overflow-wrap: anywhere`, a tota
  cel·la de flex amb text.
- **Do** provar a 390 px abans de qualsevol altra amplada.
- **Do** registrar la icona (i el color, si és categoria) quan afegeixis un slug nou a la
  base de dades.

### Don't:
- **Don't** pintar la banda sencera del rètol d'ambre ni de cap color que no sigui el de la
  categoria de la pregunta: fora de la partida, `--plain` i color només a la pestanya.
- **Don't** fer servir `--qc-live` com a color de text sobre fons fosc; per a això hi ha
  `--qc-live-text`.
- **Don't** esvair amb `opacity` res que hagi de continuar llegible: el primari desactivat
  passa a neutre i les opcions descartades conserven contorn i opacitat plena.
- **Don't** confiar cap informació a una animació ni a un color sols: sota
  `prefers-reduced-motion` el moviment desapareix sencer.
- **Don't** afegir una segona família tipogràfica ni carregar la tipografia des d'un CDN;
  la segona veu es fa amb l'eix d'amplada.
- **Don't** afegir ombres, bisells, daurats, purpurina ni scanlines: la profunditat es fa amb
  els tres nivells tonals i el fil. L'única ombra del sistema és la del toast.
- **Don't** ficar cap element nou dins la banda del rètol a l'amplada de mòbil: ja hi caben
  justos la ronda i el nom de la mecànica, i el nom de la mecànica és part del joc.
- **Don't** posar el gat a la pantalla mentre l'usuari pensa la resposta.
- **Don't** decidir el nombre de columnes de les respostes per la llargada del text sense
  passar també per el punt de ruptura de 560 px.
- **Don't** fer servir emojis com a icona a la interfície, encara que la base de dades en
  tingui.

## Open items

Estat conegut i no resolt, registrat com a tal:

1. **L'escombrada entre rondes no està implementada.** `qc-wipe-in` només s'aplica al toast, i
   el `qc-fade-in` de `.qc-screen` corre un únic cop en muntar-se: ara mateix les rondes es
   canvien sense cap transició. És el primer moviment pendent.
2. **El toast tapa el rètol i el comptador** en revelar-se, just els dos objectes que el
   contracte vol com a més visibles.
3. **L'estat de temps baix del comptador encara es diu només amb color.** Les ratlles són a
   la barra, no al comptador; el marc i el tint rojos són tots dos senyals de color.
4. **Sostre no construït:** banda a sang a escriptori i el marcador com a tercer objecte de
   retransmissió amb entitat pròpia.
5. **Les imatges de «foto misteriosa» tenen la llicència sense verificar.**
