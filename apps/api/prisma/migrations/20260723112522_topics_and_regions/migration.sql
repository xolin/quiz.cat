-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "region" TEXT,
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "topic_slug" TEXT;

-- CreateTable
CREATE TABLE "topics" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'general',
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "questions_topic_slug_idx" ON "questions"("topic_slug");
