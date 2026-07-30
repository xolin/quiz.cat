// Carrega el .env dins de process.env. Ha de ser el PRIMER import del procés: en ESM els
// mòduls s'avaluen en ordre d'import, i n'hi ha que llegeixen variables en carregar-se.
//
// Sense això, Prisma es llegia el .env pel seu compte (DATABASE_URL) però JWT_SECRET, PORT i
// S3_* no arribaven mai al procés i queien al valor per defecte del codi.
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  // Sense fitxer .env (producció): s'usen les variables de l'entorn tal com vinguin.
}
