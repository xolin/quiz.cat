-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "energy" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "energy_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "premium_pack" TEXT;

-- CreateTable
CREATE TABLE "minigame_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'memory',
    "deck" JSONB NOT NULL,
    "labels" JSONB NOT NULL,
    "matched_indices" INTEGER[],
    "first_flip" INTEGER,
    "moves" INTEGER NOT NULL DEFAULT 0,
    "pairs" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "energy_spent" INTEGER NOT NULL,
    "credits_awarded" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "minigame_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_packs" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "price_credits" INTEGER NOT NULL,

    CONSTRAINT "premium_packs_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "user_unlocks" (
    "user_id" UUID NOT NULL,
    "pack_slug" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_unlocks_pkey" PRIMARY KEY ("user_id","pack_slug")
);

-- AddForeignKey
ALTER TABLE "minigame_sessions" ADD CONSTRAINT "minigame_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_unlocks" ADD CONSTRAINT "user_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_unlocks" ADD CONSTRAINT "user_unlocks_pack_slug_fkey" FOREIGN KEY ("pack_slug") REFERENCES "premium_packs"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
