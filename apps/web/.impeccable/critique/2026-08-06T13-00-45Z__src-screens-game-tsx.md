---
target: src/screens/Game.tsx
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-06T13-00-45Z
slug: src-screens-game-tsx
---
Method: dual-agent (A: revisió de disseny · B: detector i evidència de navegador)

Provenance: A va revisar des del codi i ho va confirmar en una partida real al servidor de desenvolupament (port 5273), amb payloads reals de totes les mecàniques. B va executar el detector CLI i va inspeccionar el navegador; va descobrir pel camí que el port 5173 és un altre projecte, cosa que explica que un primer intent s'encallés. Vuit de les nou mecàniques no es van poder veure en directe (només va sortir `multiple_choice`) i estan avaluades des del codi. El mecanisme del P0 el va verificar també el context principal.

## Design Health Score

| # | Heurística | Nota | Problema clau |
|---|---|---|---|
| 1 | Visibilitat de l'estat | 3 | Comptador, temporitzador i marcador són excel·lents; però no hi ha estat d'enviament entre el toc i el resultat, i amb la pestanya amagada no es pinta res. |
| 2 | Correspondència amb el món real | 2 | «Incorrecte» és registre d'examen; a més-o-menys els botons diuen «Més superfície» sense subjecte i l'enunciat nomena el subjecte en ordre invers al del panell. |
| 3 | Control i llibertat | 1 | Cap pausa; el compte enrere és de rellotge de paret i segueix corrent amb la pestanya amagada fins a fallar sol; l'auto-avanç no es pot alentir. |
| 4 | Consistència i estàndards | 2 | Tres models de compromís diferents entre nou mecàniques; una mecànica sense marc de mèdia; un botó circular de 72 px; colors fora de paleta. |
| 5 | Prevenció d'errors | 1 | El «Confirma» de l'estimació no es desactiva mai i envia el punt mitjà sense tocar; ordenació i cronologia s'envien soles a l'últim toc; abandonar no demana confirmació. |
| 6 | Reconèixer en lloc de recordar | 2 | Més-o-menys obliga a lligar «Més/Menys» al panell de la dreta de memòria; l'estimació obliga a arrossegar la unitat des d'un peu de 12 px fins a una xifra de 48. |
| 7 | Flexibilitat i eficiència | 2 | El clic a qualsevol lloc per avançar és un accelerador real; però situar al mapa no té cap camí de teclat i no hi ha manera de saltar. |
| 8 | Disseny estètic i minimalista | 3 | Composició forta i honesta; però estimació i cronologia diuen la resposta correcta en tres llocs alhora al moment de més càrrega. |
| 9 | Recuperació d'errors | 0 | Cap `catch` al fitxer; un enviament fallit deixa la ronda morta per sempre, sense cap missatge i sense sortida. |
| 10 | Ajuda i documentació | 1 | Nou mecàniques noves i cap indicació de primera vegada; l'única instrucció va al text més petit i apagat de la pantalla; l'ordenació no en té. |
| **Total** | | **17/40** | **Pobre — l'experiència central té esquerdes estructurals** |

Cap heurística és n/a: és una superfície d'operació i les deu apliquen.

## Design Specificity Verdict

**Autoria real, amb una costura a dins.** No és una pantalla de trivia intercanviable. El paquet de retransmissió és de veritat i sosté pes: el rètol inunda la banda sencera amb el color de secció, el comptador és un objecte emmarcat i no una xifra dins la metadata, el bany de llum vessa fora de la columna, i l'escombrada porta el color de la categoria que entra. Els comentaris del codi es llegeixen com un diari de disseny: gairebé cada decisió no òbvia nomena l'errada que reparava.

La costura és **dins del fitxer**. El marc —tira, comptador, temporitzador, pregunta, toast, marcador— és un sistema dissenyat. Les nou mecàniques de sota **no ho són**: set blocs amb estils en línia més dues que comparteixen `OptionGrid`. Quatre mecàniques són un component ben fet amb un marc de mèdia a sobre; les altres cinc s'han inventat cadascuna la seva disposició, la seva regla de compromís i la seva manera de revelar. `ordering` és l'única sense marc de mèdia: abandona sencera la «gramàtica comuna de les nou mecàniques» que el propi codi declara. I `higher_lower` duplica el marcatge d'`OptionGrid` en línia en comptes de reutilitzar el component.

Dit curt: **una closca amb autoria al voltant d'un conjunt de mecàniques a mig sistematitzar.**

**Escaneig determinista: 0 troballes.** El detector CLI dona zero sobre `Game.tsx` i sobre `src/screens` i `src/components`, amb sortida 0. No hi ha res silenciat: no existeix cap `config.json` al projecte i `--no-config` dona el mateix resultat. El detector de regles no veu cap dels problemes d'aquest informe, i això no és un buit de l'eina: tot el que segueix és per damunt del que un motor de regles pot veure.

**Superposicions al navegador: 2 troballes, totes dues falsos positius.** Injectades a la pàgina real: `radial-halo` (avís) i `repeating-stripes-gradient` (informatiu). El primer és el bany de llum d'estudi, que el contracte de direcció nomena com el dispositiu propi del món. El segon és el ratllat del temps baix, que existeix precisament perquè sota `prefers-reduced-motion` el color no quedi com a únic indicador — el detector llegeix com a decoració el que és un remei d'accessibilitat.

## Overall Impression

El marc està ben dissenyat i les reparacions d'aquesta setmana es noten i estan ben comentades. La nota no puja perquè el sostre l'ha passat a marcar una altra classe de problema: **la pantalla no sobreviu a les condicions on el producte diu que es jugarà.** El `PRODUCT.md` situa el joc «en estones mortes — cua, transport, sofà», al mòbil. Doncs bé: amagar la pestanya perd la ronda sense haver ensenyat mai les respostes, i un tall de xarxa deixa la ronda morta sense dir res. Les dues fallades més probables de l'escena d'ús descrita produeixen els dos pitjors resultats possibles.

La major oportunitat no és visual: és que **el rellotge sigui una condició de fracàs**. Gairebé tots els problemes greus en descendeixen.

## What's Working

**El senyal de temps baix és de primera, i s'ha confirmat en directe.** A 3 segons el comptador porta vora roja de 2 px, camp tenyit, barra ratllada a 45° dins del seu marc, i la barra de temps es torna roja ratllada. Quatre canals. Sobreviu al daltonisme i a `prefers-reduced-motion`. El comentari del codi mostra que primer es va provar amb text, que menjava el nom de la mecànica a 390 px, i es va moure el senyal a textura. És la Regla del Doble Senyal i la prohibició de ficar elements nous al rètol honrades **alhora**, que és el cas difícil.

**El panell d'opció és un component de firma de debò.** Pestanya de lletra que passa a glif, inundació de camp sencer, i sobretot: l'opció descartada conserva fil i opacitat plena i només se li apaga el text. Els comentaris registren per què — `opacity: .45` deixava el text a 4,26:1 i feia parpellejar la graella a cada enviament, just quan cal comparar les quatre.

**El model de compromís és correcte allà on existeix.** `map_guess` desactiva «Confirma la posició» fins que hi ha un punt, i el peu canvia a «Confirma o torna a clicar». És el patró correcte per a una entrada cara i imprecisa. El problema és que no és el patró d'enlloc més.

## Priority Issues

### [P0] Amagar la pestanya perd la ronda, i les opcions no s'han pintat mai

**Per què importa.** `.qc-lit > *` porta `animation-fill-mode: backwards` i el keyframe arrenca a `opacity: 0`. Chrome no avança les línies de temps d'animació en una pestanya amagada, o sigui que el retard no s'esgota mai i **les opcions es queden invisibles**. Mentrestant el compte enrere és de rellotge de paret (`Date.now() - startedAt`) i **no escolta `visibilitychange` enlloc** — verificat: zero ocurrències al fitxer. Als quinze segons envia `submit(null)`.

Confirmat en directe: amb `visibilityState === "hidden"` i el comptador a 14, les quatre opcions donaven `opacity: "0"` amb l'animació en marxa i `currentTime: 0`. Existeixen al DOM amb els seus 56 px d'alçada i no pinten res.

Això no és un cas extrem per a aquest producte: **és el comportament que defineix el seu públic.** Mires si arriba el bus, et salta una notificació, bloqueges la pantalla — i tornes a una ronda ja perduda sense haver vist mai les respostes.

**Arreglar-ho.** Dues coses independents, totes dues necessàries. Primera: treure `backwards` i fer que el keyframe arrenqui a `opacity: 1` amb l'entrada expressada només com a desplaçament, perquè una línia de temps aturada degradi a «sense animació» i no a «invisible». Segona: escoltar `visibilitychange` al compte enrere — congelar el temps restant en amagar-se i reprendre'l en tornar. El servidor ja dona 2 s de gràcia, o sigui que una pausa al client no obre cap forat que el límit de 15 s no permeti ja.

**Comanda suggerida:** `/impeccable harden`

### [P1] Un enviament fallit mata la ronda per sempre i no diu res

**Per què importa.** `submit` posa `submittedRef.current = true` abans d'esperar, i el `finally` només reposa `busy`. `api()` llança amb qualsevol resposta no correcta. **No hi ha cap `catch` al fitxer ni cap límit d'error a `App.tsx`.** Resultat d'una fallada: cap feedback, per tant cap toast, per tant cap auto-avanç; i com que `submittedRef` es queda a cert, el camí de caducitat tampoc reintenta. La pantalla queda morta amb la barra de temps congelada i cap explicació.

El transport és a l'escena d'ús declarada. Túnels i canvis de cel·la són la norma, no l'excepció. **La fallada més probable de l'entorn que el producte descriu produeix el pitjor resultat possible**, i l'única sortida és l'enllaç d'abandonar, que no demana confirmació.

**Arreglar-ho.** `try`/`catch` al voltant de l'espera; en fallar, reposar `submittedRef`, reprendre el compte enrere des del temps guardat, i oferir un reintent al lloc del toast amb el camp d'error que ja existeix. `loadRound` necessita el mateix tracte: és una crida asíncrona sense capturar dins d'un efecte.

**Comanda suggerida:** `/impeccable harden`

### [P1] Tres models de compromís incompatibles entre nou mecàniques

**Per què importa.** Què costa un toc canvia de tres maneres, sense cap senyal que digui en quina ets:

- **Instantani i irreversible:** opció múltiple, àudio, imatge, silueta i més-o-menys s'envien al primer toc.
- **Omplir i disparar sol:** ordenació i cronologia s'envien just quan col·loques l'últim element. El botó de desfer existeix per a les col·locacions 1…N−1 i **desapareix exactament quan importaria** — mai arribes a revisar la seqüència que acabes de muntar.
- **Confirmació explícita:** mapa (correctament desactivat fins que hi ha punt) i estimació (**mai desactivat**).

El vocabulari visual també va sobrecarregat: `data-state="picked"` és un centelleig d'un fotograma a l'opció múltiple i un estat durable i desfeible a l'ordenació. Mateix senyal, significats oposats.

Amb una mà, en un autobús en marxa, **el toc que acaba una ronda no hauria de ser indistingible del que en construeix una.**

**Arreglar-ho.** Reduir a dos models i fer-los visualment distints. El que es respon en un sol acte es queda instantani. El que es **compon** —ordenació, cronologia, estimació, mapa— acaba amb la mateixa confirmació desactivada-fins-a-vàlida que el mapa ja té, i manté el desfer viu fins que la premis.

**Comanda suggerida:** `/impeccable shape`

### [P1] La cronologia diu encert i error només amb color

**Per què importa.** Cada casella pinta el fons de verd o roig sense glif, sense ratllat i sense canvi de gruix. És la Regla del Doble Senyal trencada de ple, i justament a la mecànica on el veredicte per element **és** tot el feedback. El component d'opció, del mateix autor, sí que porta pestanya amb ✓ i ✗.

Un 8% del públic adult masculí no pot llegir aquest feedback. I des que l'ordenació perdona un intercanvi de veïns, el toast pot dir «correcte» mentre dues caselles són roges: per a qui no distingeix els colors, el toast és llavors l'única informació, i és ambigua.

**Arreglar-ho.** Donar a cada casella el tractament de pestanya del component d'opció: un glif ✓/✗ al costat del número de posició, que ja s'hi pinta. I de passada, el `#fff` d'aquesta mateixa línia ha de ser `var(--qc-ink)`.

**Comanda suggerida:** `/impeccable clarify`

### [P2] L'avís de temps baix pràcticament no existeix al survival

**Per què importa.** L'estat baix és un llindar de **percentatge**: 27% o menys. Amb 15 segons salta a 4,05 s, que és correcte. Amb els 6 segons del survival salta a **1,62 s**, quan la decisió ja està perduda. Al mode construït sencer al voltant de la pressió del temps, el millor senyal de la pantalla no arriba.

**Arreglar-ho.** Fer-lo absolut: quan quedin 4 segons o menys. Una línia, i tot l'aparell del triple senyal comença a rendir al survival.

**Comanda suggerida:** `/impeccable harden`

## Persona Red Flags

**Casey — distret, una mà, mòbil, interromput.** *(És literalment el personatge del `PRODUCT.md`.)*
- Amagar la pestanya deixa les opcions invisibles i la ronda fallada sola. Confirmat en directe.
- Un encert manté el toast **1400 ms**. En 1,4 segons, amb una mà a l'autobús, registres un color i potser un número; el desglossament del bonus és il·legible en aquesta finestra. I l'única pausa que hi havia es va treure a posta.
- El botó de desfer es munta i es desmunta a cada toc de l'ordenació, desplaçant «Abandona la partida» unes 46 px amunt i avall **a la zona del polze**.
- Abandonar és un enllaç sense confirmació, aparcat permanentment a baix de tot on descansa el polze, que executa un `POST` irreversible d'un sol toc. **Mesurat en directe: la seva zona de toc fa 124,1 × 15,5 px** — per sota del mínim de 44 px que el propi projecte declara i per sota fins i tot dels 24 px de la norma.
- No hi ha estat d'enviament. Entre el toc i el resultat amb mala connexió la pantalla és inerta amb la barra congelada i cap acusament de rebut. L'instint és tornar a tocar.

**Sam — lector de pantalla o només teclat.**
- **Situar al mapa és irresolubles.** L'única entrada és un `click` de Leaflet; «Confirma la posició» es queda desactivat fins que hi ha punt, i això demana punter. Amb teclat només pots mirar com s'esgoten els quinze segons. No hi ha entrada alternativa ni cap avís que la ronda és impossible.
- El comptador és `role="timer"`, que implica `aria-live: off`. L'etiqueta canvia cada 100 ms i **no s'anuncia res**. Amb lector de pantalla tens zero informació de pressió temporal en un rellotge de 15 segons. El `DESIGN.md` el descriu com un dels elements més visibles de la pantalla; sense vista és mut.
- La pregunta és un `<h1>` sense regió viva ni gestió de focus. En canviar de ronda se substitueix sense anunciar-ho i el botó enfocat es desmunta, deixant el focus al `<body>`. Cada ronda comença amb una cerca a cegues amb `Tab` sota rellotge.
- El toast és `aria-live="polite"`, però l'auto-avanç el destrueix als 1400 ms en un encert. Els anuncis educats fan cua: el DOM haurà desaparegut abans d'acabar de llegir-lo.
- El lliscador anuncia la **posició** (0-1000) i no el valor que es veu a la pantalla: no hi ha `aria-valuetext`.

**Jordan — primera vegada.**
- El mecanisme central del producte és «mai saps quina mecànica ve després», i **no hi ha cap ajuda de primera vegada**. L'única instrucció és el peu del marc de mèdia, al text més petit, més apagat i en majúscules de la pantalla. El rellotge ja corre.
- L'ordenació no té marc ni peu: la instrucció és un paràgraf solt **sota** les opcions, duplicant el que l'enunciat ja diu i col·locat on un novell ja ha tocat abans de llegir.
- Enlloc es diu que el lliscador és **logarítmic**, i el valor per defecte cau al punt mitjà de la pista. En una ronda real de 0 a 2.000.000 això pinta **151.700** a mida de marcador amb el botó de confirmar viu: sembla una resposta que ja has donat.
- Més-o-menys, confirmat en directe: enunciat «Portugal té més o menys superfície que Xile?», panell amb **Xile** a l'esquerra amb la xifra i **Portugal ?** a la dreta, i botons que només diuen «Més superfície» / «Menys superfície». El subjecte va invertit entre la frase i el panell, i absent dels botons.
- El peu de l'àudio és un «Clip de veu» fix: una etiqueta, no una instrucció, i l'únic peu del fitxer que no canvia amb el resultat.

## Minor Observations

- **Regla del Cantell Viu trencada:** el botó de reproducció de l'àudio és un **cercle perfecte de 72 px** amb `borderRadius: 50%`. És l'únic cercle del sistema, és una quarta variant de botó que el `DESIGN.md` no recull, i les seves mides no coincideixen amb res. És l'objecte més intercanviable de la pantalla. `GeoMap` fa servir un radi de 8 px, que no és a l'escala.
- **Regla de l'Operador trencada** (blanc i negre purs fora d'un `color-mix`) a cinc llocs del CSS i del `Game.tsx`, més el `#555` del mapa, que és un gris que no és a la paleta.
- **Deriva de tokens:** `fontStretch: 80%` quan l'escala és 78/74/70/66/82; `fontSize: 2rem` al número del toast, que no és cap graó i és **més petit** que el token de marcador a pantalla ampla; i dos `1.25rem` al panell de més-o-menys. També `#F0A044` i `#3FBF7F` escrits a mà: duplicats exactes de dos tokens.
- **Incoherència a les opcions no triades:** `OptionGrid` les deixa en estat apagat; més-o-menys les deixa en estat inactiu, o sigui que després de revelar una segueix semblant viva i tocable.
- **Les opcions d'any arriben sense ordenar** (`991, 1091, 1141, 1066`). Cal ordenar quatre anys mentalment abans de comparar-los, dins de 15 segons. Ordenar els conjunts numèrics abans de pintar-los són dues línies.
- **L'animació d'entrada es menja el rellotge.** El compte enrere arrenca mentre encara corren els 520 ms d'escombrada i els 400 ms d'encesa esglaonada. Al survival amb 6 segons, això és un 15% de la finestra de resposta.
- El mapa carrega tessel·les de `basemaps.cartocdn.com`: és l'única dependència de tercers dins del bucle de partida, i un túnel la converteix en un mapa en blanc.
- La càrrega inicial pinta un «Carregant…» pelat, sense tira ni marc. És el primer que veu un novell després de tocar «Partida ràpida» i no comparteix res amb la pantalla que ve després.
- **Contrast, mesurat en directe:** pregunta 17,04:1, etiqueta d'opció 14,9:1, comptador 14,9:1, enllaç d'abandonar 8,9:1. Tot còmode. L'estat de temps baix surt a ≈5,68:1 **calculat, no mesurat** — no va arribar a saltar durant el mostreig.
- **Cap desbordament horitzontal** a 505 px. El que semblava desbordar era la insígnia del propi detector injectat. A 390 px queda **sense verificar**.
- Els controls de zoom de Leaflet fan 30×30 px i l'atribució va a 10 px: tots dos per sota del mínim de 44 px que el projecte declara.

## Questions to Consider

1. **El rellotge ha de ser un termini, o un bonus?** Gairebé tots els problemes greus d'aquest informe descendeixen que el temps sigui una **condició de fracàs**: el P0, la manca de pausa, el toast d'1,4 s, la caducitat automàtica, l'«Incorrecte». El bonus de rapidesa ja existeix. Si caducar puntués zero en comptes de fallar, el producte podria honrar alhora «cap element que faci sentir examinat» i el personatge de les interrupcions, i el comptador passaria a ser una font d'emoció en comptes d'angoixa. Què està comprant el termini que el bonus no compri ja?

2. **Nou mecàniques són el diferencial del producte; qui n'és l'autor?** La closca té un autor i un diari de canvis. Les mecàniques en tenen set. Si demà n'entra una desena, quin dels tres models de compromís li toca, i què impedeix que se n'inventi un quart? Fins que no hi hagi un contracte de mecànica —marc, ranura d'instrucció, regla de compromís, gramàtica de revelat—, «mai saps quina mecànica ve després» el jugador ho llegeix com «mai saps quines regles hi ha ara».

3. **Per què l'encert rep un número i l'error rep un veredicte?** «+140» contra «Incorrecte». La frase millor ja està escrita en aquest mateix fitxer —«Gairebé: en tenies dos de canviats»— i només s'arriba en una branca d'una mecànica. Com sonaria l'error si l'amfitrió fos un presentador i no un examinador, i encara caldria el gat noquejat?

4. **L'estimació imprimeix una nota en percentatge i en roig.** «a 34%» després d'endevinar és l'artefacte més d'examen de tota la pantalla, en un producte que diu explícitament que ningú s'ha de sentir avaluat. És una decisió o una herència?
