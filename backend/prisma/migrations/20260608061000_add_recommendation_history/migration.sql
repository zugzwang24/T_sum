CREATE TABLE "recommendation_runs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "query" JSONB NOT NULL,
  "criteria" JSONB,
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recommendation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recommendation_results" (
  "id" TEXT NOT NULL,
  "recommendationRunId" TEXT NOT NULL,
  "areaFeatureId" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" DOUBLE PRECISION,
  "baseScore" DOUBLE PRECISION,
  "recommendationTier" TEXT,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recommendation_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recommendation_runs_userId_idx" ON "recommendation_runs"("userId");
CREATE INDEX "recommendation_results_recommendationRunId_idx" ON "recommendation_results"("recommendationRunId");
CREATE INDEX "recommendation_results_areaFeatureId_idx" ON "recommendation_results"("areaFeatureId");

ALTER TABLE "recommendation_runs" ADD CONSTRAINT "recommendation_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_results" ADD CONSTRAINT "recommendation_results_recommendationRunId_fkey" FOREIGN KEY ("recommendationRunId") REFERENCES "recommendation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_results" ADD CONSTRAINT "recommendation_results_areaFeatureId_fkey" FOREIGN KEY ("areaFeatureId") REFERENCES "area_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
