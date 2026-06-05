ALTER TABLE "AuditLog"
ADD COLUMN "actorRole" "Role",
ADD COLUMN "entityName" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "beforeState" JSONB,
ADD COLUMN "afterState" JSONB,
ADD COLUMN "notes" TEXT;

CREATE TABLE "LeadAssignmentHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "fromUserId" TEXT,
  "toUserId" TEXT,
  "changedById" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadAssignmentHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "LeadAssignmentHistory_leadId_createdAt_idx" ON "LeadAssignmentHistory"("leadId", "createdAt");
CREATE INDEX "LeadAssignmentHistory_changedById_idx" ON "LeadAssignmentHistory"("changedById");

ALTER TABLE "LeadAssignmentHistory"
ADD CONSTRAINT "LeadAssignmentHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "LeadAssignmentHistory_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "LeadAssignmentHistory_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "LeadAssignmentHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
