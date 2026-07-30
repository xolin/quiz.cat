# quiz.cat — veritat de producte

> Aquest fitxer recull **què és** el producte i **per a qui**, no com es veu. Les decisions
> visuals viuen a `DESIGN.md`. La fitxa llarga del projecte (negoci, stack, estat, deute) és a
> `~/Developer/projectes-docs/quizcat/README.md`; aquí hi ha només el que necessita qui dissenya.

## Què és

Un joc de trivia web, en català, de partides curtes. El mecanisme propi: **mai saps quina
mecànica ve després**. Una partida de 8 rondes salta entre nou maneres de preguntar —
opció múltiple, situar al mapa, silueta que es descobreix, foto amb blur, clip de veu
(accent o llengua), clip d'instrument, ordenar, cronologia, més-o-menys i estimar amb slider.

No és una eina d'estudi. La frase que ho separa de Seterra i companyia: **«Seterra estudia;
quiz.cat juga.»**

## Per a qui

Públic adult casual dels Països Catalans. Juga **al mòbil, en estones mortes** — cua,
transport, sofà — en sessions de dos o tres minuts. No ve a aprendre; ve a passar el rato i
a comprovar què sap. Es pot sentir avaluat, i això condiciona el to: cap element que faci
sentir examinat.

## Què ha de passar a cada superfície

- **Inici:** entendre en un cop d'ull què pot jugar avui i començar sense fricció (hi ha
  entrada com a convidat, sense registre).
- **Partida:** llegir la pregunta, decidir i respondre **abans que s'acabi el temps** (15 s;
  al survival baixa fins a 6 s). Res no pot competir amb la pregunta i el rellotge.
- **Resum:** saber com ha anat i tornar-hi.

## Modes

| Mode | Què és |
|---|---|
| Partida ràpida | 8 rondes, dificultat adaptativa al teu nivell |
| Survival | rondes sense fi fins que falles; la ratxa és la puntuació |
| Repte diari | mateixes preguntes per a tothom, determinista |
| Mini-joc Memory | es paga amb energia i dona crèdits |

## Contingut real (rangs, no promeses)

3.376 preguntes publicades. Per categoria: Cultura 26% · Història 23% · Geografia 17% ·
Natura 17% · Ciència 16%. Dificultat repartida de l'1 al 5 (263 · 540 · 665 · 600 · 716).
Dotze temàtiques seleccionables. Tot generat de fonts obertes verificables (Natural Earth,
Common Voice, Wikidata, VCSL, TinySOL) amb llicència registrada per peça.

## Gamificació que ja existeix i es veu a la interfície

Punts (base + rapidesa + ratxa dins de partida) · XP i nivells · ratxa diària ·
assoliments · rating d'habilitat 1-5 amb etiqueta (Principiant→Mestre) · energia 0-100 ·
crèdits · packs premium desbloquejables · rànquings global, diari i de survival.

## Marca

- Domini i marca: **quiz.cat**. El `.cat` alinea el producte amb el públic inicial.
- **Mascota felina** (un gat ambre). No és l'origen de la marca: és el pont per a quan es
  surti del mercat català, on `quiz.cat` es llegeix «quiz cat». Fa d'amfitrió del joc i
  reacciona als moments d'emoció; **no acompanya la pregunta**.
- Compromís explícit: **cap element folklòric** (barretina i companyia). La catalanitat, si
  es veu, va per paleta i tipografia.

## Restriccions que lliguen el disseny

- Web PWA, React 19 + Vite. Mòbil primer.
- **Tot auto-allotjat**: cap CDN de fonts ni de scripts. Coherent amb el self-host de la
  resta de la infraestructura.
- Idioma únic: català. Els noms d'opcions poden ser llargs («Castella-la Manxa», noms
  científics binomials), i això condiciona qualsevol graella d'opcions.
- Accessibilitat: el color no pot ser l'únic indicador; `prefers-reduced-motion` respectat.
- El servidor és l'àrbitre: la interfície no pot deixar endevinar la resposta abans d'hora.

## Deute conegut que el disseny no ha de tapar

Les 20 imatges de «foto misteriosa» són de la Viquipèdia i tenen la **llicència per
verificar** abans de publicar. Deploy pendent.
