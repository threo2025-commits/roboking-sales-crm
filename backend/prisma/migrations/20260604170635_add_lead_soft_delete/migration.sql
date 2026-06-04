-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");
