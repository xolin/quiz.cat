---
name: quiz.cat
description: El paquet de grafisme d'una retransmissió en directe, tallat a antena dins un client web de mòbil.
colors:
  amber: "#f0a044"
  amber-deep: "#d9822b"
  stage: "#0e1520"
  stage-2: "#182231"
  stage-3: "#223046"
  stagelight: "#24374f"
  hairline: "#2c3c54"
  ink: "#f4f7fb"
  ink-dim: "#a9b6c7"
  ink-on-light: "#17202c"
  good: "#3fbf7f"
  live: "#ce3a2f"
  live-text: "#f08279"
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
    fontVariation: "wdth 66"
    fontFeature: "tnum 1"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    fontVariation: "wdth 74"
  title:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    fontVariation: "wdth 78"
  lead:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
  body:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.06em"
    fontVariation: "wdth 70"
rounded:
  hair: "2px"
  sharp: "3px"
  block: "6px"
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
  button:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sharp}"
    padding: "12px 24px"
    height: "46px"
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.sharp}"
    padding: "12px 24px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.amber-deep}"
    textColor: "{colors.ink-on-light}"
  button-primary-disabled:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink-dim}"
  option:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    typography: "{typography.lead}"
    rounded: "{rounded.sharp}"
    height: "56px"
  option-good:
    backgroundColor: "{colors.good}"
    textColor: "{colors.ink-on-light}"
  option-bad:
    backgroundColor: "{colors.live}"
    textColor: "{colors.ink}"
  panel:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sharp}"
    padding: "16px"
  counter:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.ink}"
    typography: "{typography.score}"
    rounded: "{rounded.sharp}"
    width: "92px"
  lower-third:
    backgroundColor: "{colors.geo}"
    textColor: "{colors.ink-on-light}"
    typography: "{typography.label}"
    rounded: "{rounded.sharp}"
  mode-card:
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.block}"
    padding: "24px 16px"
  toast:
    backgroundColor: "{colors.good}"
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.block}"
    padding: "16px 24px"
---

# Design System: quiz.cat

## Overview

**Creative North Star: "La Realització"**

Això no és una pàgina web amb preguntes a dins: és el **paquet de grafisme d'una
retransmissió**, tallat a antena des d'una sala de realització. Cada element té l'ofici que
tindria en directe — el rètol identifica el bloc, el comptador és el rellotge de plató, el
marcador és un objecte amb entitat pròpia i l'escombrada entre rondes és un canvi de càmera. La
conseqüència pràctica és dura i útil: si un element no faria feina en una retransmissió, no hi
pinta res.

El to és **de concurs**. Contrastos durs, color de secció ocupant regions senceres en comptes
d'insígnies, i moviment decidit als moments que ho demanen. Però l'energia va per **color, llum
i moviment**, mai per material. Aquesta distinció és el que separa aquest món del seu
anti-referent: el kitsch retro de concurs —bisells, daurats, purpurina, scanlines— queda fora
sense excepcions. Un grafisme de retransmissió modern és net i dur alhora, i és aquesta duresa
la que fa l'energia, no la textura.

El públic juga **al mòbil, en estones mortes, i es pot sentir avaluat**. Per això el sistema
informa i no jutja: cap percentatge d'encert a la cara, cap comparació amb ningú, i el gat
amfitrió no apareix mentre penses. Surt quan hi ha emoció, que és quan un presentador parlaria.

**Key Characteristics:**
- El grafisme de retransmissió com a món sencer, no com a decoració
- Cantell viu de 3 px: cap pastilla, cap targeta arrodonida
- Una sola família tipogràfica amb l'eix d'amplada fent de segona veu
- L'ambre com a color d'antena, escàs per definició
- Color de secció ocupant tota la regió, mai una insígnia
- El color mai és l'únic indicador: sempre l'acompanya una forma o un glif

## Colors

Una paleta de plató fosc amb un únic color càlid que mana, cinc colors de secció que
identifiquen el bloc temàtic i dos colors d'estat que mai treballen sols.

### Primary
- **Ambre d'Antena** (`amber`): el color del que està **en directe** i del que crida a
  l'acció. Botó primari, la teva marca al mapa, ompliment del mesurador, anell de focus. La seva
  escassetat és el que el fa funcionar.
- **Ambre Fondo** (`amber-deep`): només l'estat `hover` del primari. Cap altre ús.

### Secondary
Els **colors de secció**, un per categoria, que pinten la banda sencera del rètol i el camp de
la targeta de mode: `geo` Geografia, `hist` Història, `sci` Ciència, `cult` Cultura, `nat`
Natura. Tots cinc estan escollits per arribar al mínim de contrast amb la tinta fosca al damunt.

### Tertiary
- **Verd d'Encert** (`good`): inunda el panell de la resposta bona.
- **Roig de Directe** (`live`): inunda el panell de la resposta fallada i el toast d'error.
- **Roig Llegible** (`live-text`): el mateix roig **com a text sobre fons fosc**. Existeix
  perquè el roig de camp no arriba al contrast mínim quan es fa servir com a lletra.

### Neutral
- **Blau de Plató** (`stage`): el fons de tot. És blau pissarra, no negre — i el nom importa,
  perquè tractar-lo com a negre porta a decisions equivocades.
- **Blau de Plató · Panell** (`stage-2`): superfícies que reposen damunt del fons: panells,
  botons, opcions, comptador, marcador.
- **Blau de Plató · Relleu** (`stage-3`): el nivell més alt, per a `hover` i per a les pistes
  dels mesuradors.
- **Llum de Plató** (`stagelight`): el blau del bany de llum radial darrere la pregunta. És
  l'únic lloc on apareix, i és el que fa que la pregunta sembli il·luminada per un focus.
- **Fil** (`hairline`): la vora d'un píxel que separa objectes. És l'eina de profunditat
  principal del sistema.
- **Tinta** (`ink`) i **Tinta Apagada** (`ink-dim`): text principal i secundari sobre fosc.
- **Tinta sobre Clar** (`ink-on-light`): text damunt de qualsevol camp clar — ambre, color de
  secció, verd d'encert.

### Named Rules

**La Regla de l'Antena.** L'ambre no omple mai un camp gran. És per a un botó, un anell, una
marca o una xifra. Si l'ambre és a tot arreu, deixa de voler dir «això».

**La Regla del Camp Sencer.** Un color de secció ocupa **tota la regió** que identifica, no una
pastilla dins d'una targeta. És el que separa un rètol de retransmissió d'una insígnia de
formulari.

**La Regla de l'Operador.** El blanc i el negre purs no són colors de la paleta: només
existeixen **dins d'un `color-mix`**, com a operació d'aclarir o enfosquir un color que sí que
hi és — la pestanya del rètol és el color de secció amb un 22% de blanc; la pestanya d'una
opció revelada és el seu verd o roig amb un 18-20% de negre. Fora d'un `color-mix`, un `#fff`
o un `#000` és sempre deriva: el text sobre camp fosc és `ink` i el text sobre camp clar és
`ink-on-light`.

**La Regla del Doble Senyal.** Cap estat es diu només amb color. L'encert i l'error porten glif
(✓ / ✗); el temps baix porta ratlles a 45° a més del roig; la resposta descartada conserva
contorn i opacitat plena i només se li apaga el text.

## Typography

**Família única:** Archivo (OFL, Omnibus-Type), variable amb **eix d'amplada**, auto-allotjada
en dos fitxers `woff2` amb `unicode-range` per al llatí i el llatí estès.

**Character:** una sola veu que fa dues feines. L'eix d'amplada substitueix la segona família:
la pregunta va condensada al 78%, el marcador al 66%, els rètols al 70% i el text corrent a
l'amplada normal. És el que dona el so de retransmissió sense carregar cap tipografia més i
sense dependre de cap CDN.

### Hierarchy
- **Display** (700, `clamp(1.5rem, 7vw, 2.4rem)`, amplada 78%, interlineat 1,08): la pregunta.
  Porta `text-wrap: balance` perquè no li quedi una paraula òrfena a l'última línia.
- **Score** (700, `clamp(2rem, 8vw, 3rem)`, amplada 66%, tabular): el comptador i les xifres del
  marcador. Tabular perquè un número que canvia no ha de fer ballar la caixa.
- **Headline** (700, `1.5rem`, amplada 74%): títol de mode i salutació d'inici.
- **Title** (700, `1.25rem`, amplada 78%): capçalera de modal i xifres destacades dins d'un marc
  de mèdia.
- **Lead** (`1.0625rem`): el text de l'opció de resposta, i prou.
- **Body** (`1rem`, interlineat 1,5): text corrent.
- **Small** (`0.875rem`): notes al peu i text secundari.
- **Label** (700, `0.75rem`, amplada 70%, `+0.06em`, majúscules): rètols, peus del marc de mèdia
  i etiquetes del marcador.

### Named Rules

**La Regla d'una Sola Veu.** Mai una segona família tipogràfica. Si cal contrast, es fa amb
l'eix d'amplada. I mai des d'un CDN: tot va auto-allotjat.

**La Regla del Número Tabular.** Qualsevol xifra que canviï en viu —comptador, punts, ratxa—
porta `tabular-nums`. Un marcador que salta d'amplada és un error de realització.

## Layout

Columna única de **680 px màxim**, centrada, amb coixí de 24 px a dalt, 16 px als costats i
48 px a baix. Mòbil primer: tot està pensat perquè funcioni a 390 px i s'eixampli, no al revés.

L'escala d'espai és de set passos (`4 · 8 · 12 · 16 · 24 · 32 · 48 px`) i no se'n fan servir
valors intermedis.

**Dos punts de ruptura, tots dos amb motiu concret:**
- **480 px** — la ronda i el nom de la mecànica tornen a la mateixa línia dins del rètol. Per
  sota s'apilen, perquè a 390 px no hi caben i sortia «Ronda 1» partit en dues.
- **560 px** — les respostes poden anar a dues columnes. És la porta d'amplada; la segona porta
  és que **totes** les opcions siguin curtes, perquè hi ha respostes com «Castella-la Manxa» o
  noms científics binomials que en una graella 2×2 es partirien en tres línies.

El bany de llum darrere la pregunta va **a sang** (`inset: -88px -50vw -76px`): la llum d'un
plató no s'atura a la columna de text.

## Elevation & Depth

El sistema separa objectes amb **to i fil**: tres nivells de blau de plató i una vora d'un
píxel. És el llenguatge principal i explica la immensa majoria de la pantalla.

**Compromís d'agost de 2026: el món admet profunditat.** El to de concurs demana que el que
**sura** ho sembli, i fins ara el sistema només tenia una ombra. S'obre un vocabulari curt, amb
propòsit declarat a cada entrada. La condició que ho fa possible sense caure al kitsch és que
**l'ombra descriu jerarquia, no material**: diu què hi ha per damunt de què, i mai simula un
bisell, un vidre ni un metall.

### Shadow Vocabulary
- **Ombra de flotant** (`box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.7)`): el toast de
  resultat, l'únic element que sura per damunt de la pantalla. **Construïda i en ús.**
- **Fil interior** (`box-shadow: inset 0 0 0 1px var(--qc-hairline)`): dors de la carta del
  Memory, on una vora desquadraria la cara girada. **Construïda i en ús.**
- **Ombra d'alçat** (`box-shadow: 0 6px 16px -8px rgba(0, 0, 0, 0.55)`): per a l'objecte que
  l'usuari manipula ara mateix — la targeta de mode premuda, la carta del Memory girant-se.
  **Compromís, encara no aplicat al codi.**

### Named Rules

**La Regla del Fil Primer.** El fil i el to resolen la profunditat per defecte. L'ombra només
entra quan un objecte **surt del pla** de debò: flota per damunt de la pantalla o l'usuari
l'està movent. Una superfície en repòs no porta ombra mai.

**La Regla de la Jerarquia, no el Material.** L'ombra diu «això és a sobre»; no diu «això és de
vidre». Bisells, daurats, purpurina, scanlines i degradats que imiten metall queden fora del
sistema sense excepció.

## Shapes

**Cantell viu.** El radi per defecte és de **3 px** (`sharp`) i cobreix gairebé tot: panells,
botons, opcions, rètol, comptador, marc de mèdia, marcador i camps. Els **6 px** (`block`)
queden per als blocs grans que s'han de llegir com una sola peça: les targetes de mode de la
pantalla d'inici i el toast. Els **2 px** (`hair`) són el cas rar de la barra del temps, on el
radi ha de ser només un matís del gruix.

La **pastilla** (`pill`, 999 px) existeix per a una sola cosa: la pista dels mesuradors
d'energia i progrés, que són barres i no objectes.

Els objectes compostos —rètol, marc de mèdia, opció amb pestanya, marcador— es tallen amb
`overflow: hidden` i **mai amb radis per cantonada**. Una peça que s'ha de llegir com una sola
cosa no pot tenir les cantonades interiors arrodonides.

### Named Rules

**La Regla del Cantell Viu.** Cap pastilla i cap targeta arrodonida a la interfície. El radi
generós és el llenguatge del programari de consum genèric; aquest món és de retolació.

## Components

### Buttons
- **Shape:** cantell viu (3 px), alçada mínima de 46 px, coixí de 12×24 px, amplada de lletra 82%.
- **Per defecte:** camp de panell amb fil i text de tinta; `hover` puja al to de relleu.
- **Primari:** camp d'Ambre d'Antena amb text fosc; `hover` passa a Ambre Fondo.
- **Fantasma:** fons transparent, mateix fil.
- **Desactivat:** opacitat del 45%… **excepte el primari**, que en comptes d'esvair-se passa a
  neutre amb text apagat. Un ambre al 45% sobre el plató es llegeix com un marró trencat, i el
  que ha de comunicar és «encara no».

### Opció de resposta *(component de firma)*
Un objecte compost: **pestanya de lletra** (A, B, C, D) enganxada a l'esquerra i **camp
d'etiqueta** a la dreta, dins d'una sola peça de 56 px d'alçada tallada amb `overflow: hidden`.

- **En repòs:** camp de panell amb fil.
- **En revelar-se:** el panell bo **s'inunda** de verd i la pestanya passa a ✓; el fallat s'inunda
  de roig, la pestanya passa a ✗ i l'objecte fa una sacsejada curta.
- **Descartada:** conserva **fil i opacitat plena** i només se li apaga el text. Esvair-la amb
  `opacity` baixava el text per sota del contrast mínim i feia parpellejar la graella a cada
  enviament, just quan cal comparar les quatre.
- **Entrada:** les opcions s'encenen escalonadament (`qc-light-up`), com un mur de plaques que
  rep corrent.

### Rètol (lower third) *(component de firma)*
Banda horitzontal partida en dues regions sense separació: **pestanya de secció** (icona i nom
de categoria, en majúscules i amplada 70%, sobre el color de secció aclarit un 22%) i
**metadada** (ronda i nom de la mecànica) sobre el color de secció sencer. El rètol creix
(`flex: 1`) i el comptador es queda fix al costat.

La variant **neutra** és per a les pantalles que no són de categoria: allà el color va només a
la pestanya, perquè pintar la banda sencera d'ambre convertiria el color d'antena en un camp i
trencaria la Regla de l'Antena.

### Comptador *(component de firma)*
Un **objecte amb marc propi**, no una xifra perduda dins la metadada: 92 px d'amplada mínima,
fil, camp de panell, xifra en Score i unitat en Label. L'estat de temps baix es diu **per tres
canals alhora** —camp roig, canvi de gruix del marc i ratlles a 45°— perquè sobrevisqui tant al
daltonisme com a `prefers-reduced-motion`.

### Marc de mèdia
La gramàtica comuna de les nou mecàniques: cos amb el mèdia i **peu amb la instrucció** en
Label. El peu és dinàmic i canvia quan hi ha resultat. També és on va l'atribució d'autoria quan
una foto es revela, en to de nom propi —sense majúscules ni lletra espaiada— perquè és crèdit i
no retolació.

### Cards / Containers
- **Panell:** fil, camp de panell, radi de 3 px, coixí de 16 px.
- **Targeta de mode:** bloc de 6 px amb el camp de la categoria ocupant-lo sencer, coixí de
  24×16 px i text fosc. Són blocs de color que ocupen regió, no targetes amb icona i text.
- **Marcador:** fila de cel·les dins d'una sola peça amb fil; cada cel·la porta etiqueta en Label
  i valor en Score.

### Toast de resultat
Va **al flux**, ocupant el lloc de la pregunta —que quan surt el resultat ja no has de llegir— i
deixant el rètol i el comptador a la vista. Absolut vessava per sota de la seva caixa i tapava
el contingut de la ronda. Verd d'encert o roig d'error, radi de 6 px, i **l'única ombra flotant
del sistema**. Mentre és visible, tota la pantalla és una capa de salt: un clic a qualsevol lloc
avança.

### Inputs / Fields
Camps amb fil sobre fons d'escenari (més fosc que el panell que els conté), radi de 3 px i coixí
de 12 px. El focus és un anell d'ambre de 2 px amb 2 px de separació, sempre visible.

### Perfil de radar *(component de firma)*
Gràfic SVG del nivell per temàtica, a la configuració i mai destacat. Anelles i radis en fil,
figura en ambre amb ompliment al 16%, punts de 4,5 px amb vora del color del panell. Porta
sempre la **taula de valors a sota**: al radar l'àrea creix amb el quadrat del valor i els
números són l'única lectura honesta. Només dibuixa temàtiques amb prou partides i mai amb menys
de tres eixos.

## Do's and Don'ts

### Do:
- **Do** fer servir l'eix d'amplada d'Archivo per a la segona veu: 78% la pregunta, 66% les
  xifres, 70% els rètols.
- **Do** posar `tabular-nums` a qualsevol xifra que canviï en viu.
- **Do** pintar el color de secció a la **regió sencera** del rètol.
- **Do** acompanyar cada estat de color amb una forma: glif, ratllat o canvi de gruix.
- **Do** tallar els objectes compostos amb `overflow: hidden`.
- **Do** fer servir `--qc-live-text` quan el roig hagi de ser **text** sobre fosc.
- **Do** deixar el primari desactivat en **neutre**, no esvaït.
- **Do** comprovar el contrast amb `pnpm design:sheet`, que falla si un parell no arriba al mínim.

### Don't:
- **Don't** omplir un camp gran amb ambre: trenca la Regla de l'Antena.
- **Don't** afegir una segona família tipogràfica ni carregar tipografia des d'un CDN.
- **Don't** posar ombra a una superfície en repòs. L'ombra és per al que sura o per al que
  s'està manipulant.
- **Don't** simular material: ni bisells, ni daurats, ni purpurina, ni scanlines, ni degradats
  metàl·lics. L'energia va per color, llum i moviment.
- **Don't** arrodonir com una pastilla res que no sigui la pista d'un mesurador.
- **Don't** esvair amb `opacity` res que hagi de continuar llegible.
- **Don't** confiar cap informació només a una animació: sota `prefers-reduced-motion` el
  moviment desapareix sencer.
- **Don't** ficar cap element nou dins la banda del rètol a l'amplada de mòbil.
- **Don't** posar el gat a la pantalla mentre l'usuari pensa la resposta.
- **Don't** decidir el nombre de columnes de les respostes només per la llargada del text: hi ha
  també el punt de ruptura de 560 px.
- **Don't** fer servir emojis com a icona a la interfície, encara que la base de dades en tingui.
