-- CreateTable
CREATE TABLE "question_types" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "answer_schema" JSONB,
    "payload_schema" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_types_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "license" TEXT,
    "attribution" TEXT,
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "type_slug" TEXT NOT NULL,
    "category_id" UUID,
    "locale" TEXT NOT NULL DEFAULT 'ca',
    "prompt" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "answer" JSONB NOT NULL,
    "difficulty" SMALLINT NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_media" (
    "question_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'primary',

    CONSTRAINT "question_media_pkey" PRIMARY KEY ("question_id","media_id","role")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "xp" BIGINT NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lives" INTEGER NOT NULL DEFAULT 5,
    "lives_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_played_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_thresholds" (
    "level" INTEGER NOT NULL,
    "xp_needed" BIGINT NOT NULL,

    CONSTRAINT "level_thresholds_pkey" PRIMARY KEY ("level")
);

-- CreateTable
CREATE TABLE "achievements" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "criteria" JSONB,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "user_id" UUID NOT NULL,
    "achievement_slug" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id","achievement_slug")
);

-- CreateTable
CREATE TABLE "games" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "games_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "game_slug" TEXT NOT NULL DEFAULT 'quiz',
    "mode" TEXT NOT NULL DEFAULT 'solo',
    "category_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "seed" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "placement" SMALLINT,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_rounds" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "round_index" SMALLINT NOT NULL,
    "question_id" UUID NOT NULL,
    "time_limit_ms" INTEGER NOT NULL DEFAULT 15000,
    "started_at" TIMESTAMP(3),

    CONSTRAINT "match_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_answers" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "given_answer" JSONB,
    "is_correct" BOOLEAN,
    "response_ms" INTEGER,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_stats" (
    "question_id" UUID NOT NULL,
    "times_served" INTEGER NOT NULL DEFAULT 0,
    "times_correct" INTEGER NOT NULL DEFAULT 0,
    "avg_response_ms" INTEGER,

    CONSTRAINT "question_stats_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "user_question_history" (
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_question_history_pkey" PRIMARY KEY ("user_id","question_id")
);

-- CreateTable
CREATE TABLE "datasets" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "dataset_items" (
    "id" UUID NOT NULL,
    "dataset_slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "media_id" UUID,

    CONSTRAINT "dataset_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "questions_type_slug_idx" ON "questions"("type_slug");

-- CreateIndex
CREATE INDEX "questions_category_id_idx" ON "questions"("category_id");

-- CreateIndex
CREATE INDEX "questions_status_locale_idx" ON "questions"("status", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_match_id_user_id_key" ON "match_participants"("match_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_rounds_match_id_round_index_key" ON "match_rounds"("match_id", "round_index");

-- CreateIndex
CREATE UNIQUE INDEX "round_answers_round_id_participant_id_key" ON "round_answers"("round_id", "participant_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_type_slug_fkey" FOREIGN KEY ("type_slug") REFERENCES "question_types"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_media" ADD CONSTRAINT "question_media_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_media" ADD CONSTRAINT "question_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_slug_fkey" FOREIGN KEY ("achievement_slug") REFERENCES "achievements"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_game_slug_fkey" FOREIGN KEY ("game_slug") REFERENCES "games"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_answers" ADD CONSTRAINT "round_answers_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "match_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_answers" ADD CONSTRAINT "round_answers_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "match_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_stats" ADD CONSTRAINT "question_stats_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_question_history" ADD CONSTRAINT "user_question_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_question_history" ADD CONSTRAINT "user_question_history_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_dataset_slug_fkey" FOREIGN KEY ("dataset_slug") REFERENCES "datasets"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
