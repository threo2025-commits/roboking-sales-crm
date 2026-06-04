-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "dealId" TEXT;

-- CreateIndex
CREATE INDEX "CallLog_leadId_idx" ON "CallLog"("leadId");

-- CreateIndex
CREATE INDEX "CallLog_clientId_idx" ON "CallLog"("clientId");

-- CreateIndex
CREATE INDEX "CallLog_dealId_idx" ON "CallLog"("dealId");

-- CreateIndex
CREATE INDEX "CallLog_createdById_idx" ON "CallLog"("createdById");

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
