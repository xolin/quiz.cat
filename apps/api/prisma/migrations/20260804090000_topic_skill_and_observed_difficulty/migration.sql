-- Dificultat mesurada, al costat de la declarada (que segueix sent el prior).
ALTER TABLE "questions" ADD COLUMN "observed_difficulty" DOUBLE PRECISION;

-- Nivell de l'usuari per temàtica: un sol número global no distingeix qui sap química
-- de qui no, i les dues persones acabaven rebent les mateixes preguntes.
CREATE TABLE "topic_skills" (
    "profile_id" UUID NOT NULL,
    "topic_slug" TEXT NOT NULL,
    "skill" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "answers" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "topic_skills_pkey" PRIMARY KEY ("profile_id","topic_slug")
);

ALTER TABLE "topic_skills" ADD CONSTRAINT "topic_skills_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_skills" ADD CONSTRAINT "topic_skills_topic_slug_fkey"
  FOREIGN KEY ("topic_slug") REFERENCES "topics"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
