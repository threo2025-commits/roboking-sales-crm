ALTER TABLE "ChatConversation"
ADD COLUMN "category" TEXT DEFAULT 'TEAM',
ADD COLUMN "ownerId" TEXT;

UPDATE "ChatConversation"
SET "ownerId" = "createdById"
WHERE "isGroup" = true AND "ownerId" IS NULL;

CREATE INDEX "ChatConversation_category_idx" ON "ChatConversation"("category");
CREATE INDEX "ChatConversation_ownerId_idx" ON "ChatConversation"("ownerId");
