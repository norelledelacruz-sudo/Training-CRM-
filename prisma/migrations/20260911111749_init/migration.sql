-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "jobDetails" JSONB NOT NULL,
    "messages" JSONB NOT NULL,
    "resolutionOptions" JSONB NOT NULL,
    "answerKey" JSONB NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraineeLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "traineeName" TEXT NOT NULL,
    "cohort" TEXT,
    "scenarioId" TEXT NOT NULL,
    "firstOpenedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraineeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "traineeLinkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "traineeLinkId" TEXT NOT NULL,
    "autoFlag" TEXT NOT NULL,
    "autoNotes" TEXT,
    "trainerFlag" TEXT,
    "trainerNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_slug_key" ON "Scenario"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TraineeLink_token_key" ON "TraineeLink"("token");

-- CreateIndex
CREATE INDEX "ActionLog_traineeLinkId_createdAt_idx" ON "ActionLog"("traineeLinkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_traineeLinkId_key" ON "Review"("traineeLinkId");

-- AddForeignKey
ALTER TABLE "TraineeLink" ADD CONSTRAINT "TraineeLink_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_traineeLinkId_fkey" FOREIGN KEY ("traineeLinkId") REFERENCES "TraineeLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_traineeLinkId_fkey" FOREIGN KEY ("traineeLinkId") REFERENCES "TraineeLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
