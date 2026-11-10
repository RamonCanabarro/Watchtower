CREATE TYPE "CheckStatus" AS ENUM ('ONLINE', 'OFFLINE', 'TIMEOUT', 'ERROR');
ALTER TABLE "Monitor"
  ADD COLUMN "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leaseUntil" TIMESTAMP(3),
  ADD COLUMN "leaseToken" UUID;
CREATE INDEX "Monitor_enabled_nextCheckAt_idx" ON "Monitor"("enabled", "nextCheckAt");
CREATE TABLE "Check" (
  "id" UUID NOT NULL,
  "monitorId" UUID NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "CheckStatus" NOT NULL,
  "httpStatus" INTEGER,
  "responseTime" INTEGER NOT NULL,
  "error" TEXT,
  CONSTRAINT "Check_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Check_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Check_monitorId_checkedAt_idx" ON "Check"("monitorId", "checkedAt");
