# Quizcat (codi)

Joc de trivia multimèdia amb gamificació moderna. **Trivial modern i arcade, variat per disseny.**

> El disseny, les decisions i l'esquema de dades viuen al repo de docs:
> `~/Developer/projectes-docs/quizcat/` (`README.md`, `decisions.md`, `esquema-dades.md`).

## Estructura (monorepo pnpm)

- `apps/api` — Node + Fastify + Prisma (PostgreSQL). Auth JWT (+ mode convidat), bucle de partida amb puntuació al servidor, progressió (XP/nivells/ratxes/assoliments), rànquings i repte diari determinista.
- `apps/web` — React 19 + Vite. Pantalles: auth, inici (perfil/estadístiques), joc (renderers per tipus + temporitzador), resum i rànquing.
- `packages/shared` — contracte compartit dels **tipus de pregunta** (payload/answer) entre client i servidor.

## Principi: tipus de pregunta com a plugins

Cada tipus (`multiple_choice`, `text_input`, `audio_clip`, `image_guess`, `map_guess`…) té:
- un **contracte** de `payload`/`answer` a `packages/shared`,
- un **validador** al servidor a `apps/api/src/questionValidators`,
- un **renderer** al client a `apps/web/src/screens/Game.tsx` (el mapa: `components/WorldMap.tsx`).

El camp `answer` és la veritat i **mai** surt del backend: les rondes se serveixen sense ell,
el servidor cronometra (límit + 2s de gràcia) i puntua (base 100 + rapidesa fins a +100 + ratxa fins a +75).

## Tipus de pregunta / mecàniques

Opció múltiple · cert-fals · l'intrús · **situa al mapa** (Leaflet, tiles sense etiquetes) · **ordena-ho** · **més alt o més baix** · **foto misteriosa** (blur que es revela) · **estimació** (slider "el preu just"). Escriure resposta: retirat (fricció). Àudio i més mecàniques: al full de ruta (`projectes-docs/quizcat/roadmap.md`).

## Economia (energia · crèdits · premium)

- **Energia** (0-100): es carrega jugant (+5/encert) i amb el temps (+1/min). No bloqueja el quiz; és un mesurador de recompensa.
- **Mini-joc Memory** (banderes): quan l'energia és plena, la gastes per jugar. El **servidor guarda el deck i calcula els crèdits** (anti-trampes).
- **Crèdits → premium**: desbloqueja packs de preguntes (`questions.premiumPack`; taules `PremiumPack`/`UserUnlock`). La selecció exclou el premium bloquejat. Compra amb diners (Stripe) = futur.
- Endpoints: `POST /minigame/memory`, `POST /minigame/:id/flip {index}`, `GET/POST /premium[...]`.

## Contingut

El seed genera la major part des del **dataset de països** (43 països amb capital, coordenades, bandera, població i superfície) i d'un manifest d'imatges. Total: **~310 preguntes** (MC · mapa · més-o-menys · ordenar · foto misteriosa).

**Foto misteriosa — imatges:** es baixen de la Viquipèdia amb `node apps/api/prisma/download-mystery.mjs` (throttled). **No es versionen** i la seva **llicència s'ha de verificar abans de publicar** (veure `apps/web/public/mystery/CREDITS.md` i `decisions.md`).

## Posar-ho en marxa (local)

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # Postgres al port 5444
cp .env.example .env                             # DATABASE_URL ja apunta a :5444? ajusta si cal
cp .env apps/api/.env
pnpm db:migrate                                  # crea l'esquema
node apps/api/prisma/download-mystery.mjs        # baixa les imatges de foto misteriosa
pnpm db:seed                                     # tipus, jocs, dataset i preguntes
pnpm dev:api                                     # API a :4400
pnpm dev:web                                     # web a :5273 (proxy /api → :4400)
```

Obre `http://localhost:5273`, clica **Juga ara (convidat)** i tens una partida de 8 rondes.

## Desplegament (Dokploy)

`docker-compose.prod.yml` segueix el patró de la resta de projectes del VPS: Traefik a la
xarxa `dokploy-network`, Postgres i MinIO amb volum propi, i **nginx com a única porta
d'entrada** — serveix l'estàtic i passa `/api/` a l'API.

```bash
cp .env.prod.example .env      # i omple-hi els valors al panell de Dokploy
docker compose -f docker-compose.prod.yml up -d --build
```

Coses que cal saber abans del primer desplegament:

1. **`quiz.cat` i `storage.quiz.cat`** han d'apuntar tots dos al VPS. El segon no és
   opcional: l'API firma les URL del mèdia amb aquest nom i és el navegador qui les obre,
   o sigui que firmar amb `http://minio:9000` les faria inservibles.
2. **`SEED_ON_BOOT=1` només la primera vegada.** Tornar-lo a executar no trenca res, però
   cada passada afegeix ~35 preguntes noves de "més alt o més baix" (surten de parelles a
   l'atzar): no és del tot idempotent.
3. **El mèdia no és al repositori** (fotos, clips d'àudio: ~100 MB de fitxers amb llicència
   verificada però binaris). Es genera un cop a la màquina local i es puja al MinIO de
   producció:

   ```bash
   node apps/api/prisma/download-mystery.mjs      # i els altres download-*.mjs
   S3_ENDPOINT=https://storage.quiz.cat S3_ACCESS_KEY=… S3_SECRET_KEY=… pnpm media:upload
   ```

   Sense aquest pas el joc arrenca igual, però les 17 rondes de foto i les 124 d'àudio no
   tindran fitxer: el codi degrada al camí local, que a la imatge no existeix.
4. **`JWT_SECRET` no té valor per defecte**: en producció l'API no arrenca sense ell. I si
   no dones `SEED_ADMIN_PASSWORD`, el seed **no crea cap administrador** — la contrasenya
   de dev és pública en aquest repositori.

5. **Els serveis es diuen `quizcat-*`, no `api` o `db`.** El contenidor del web penja de
   `dokploy-network`, que comparteixen tots els projectes del VPS. Amb un nom genèric, el
   DNS de Docker li dona el contenidor d'un ALTRE projecte: resol sense queixar-se i el
   que arriba és un «connection refused» amb la nostra API viva i sana. Si algun dia
   afegeixes un servei aquí, posa-li àlies propi.

La versió de **pnpm està fixada** a `package.json` (`packageManager`): sense això el build
del servidor agafava pnpm 11 mentre la màquina de desenvolupament fa servir la 10.13.

## Proves manuals ràpides (API)

```bash
curl -s -X POST localhost:4400/auth/guest -H 'content-type: application/json' -d '{}'
# amb el token: POST /matches {mode:solo|daily} · GET /matches/:id/round · POST /matches/:id/answer {given}
# GET /me · GET /leaderboard?scope=global|daily · GET /matches/:id/summary
```
