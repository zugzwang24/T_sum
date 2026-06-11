CREATE TABLE "saved_areas" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "areaFeatureId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "saved_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comparisons" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '내 비교함',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comparison_items" (
  "id" TEXT NOT NULL,
  "comparisonId" TEXT NOT NULL,
  "areaFeatureId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "comparison_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_areas_userId_areaFeatureId_key" ON "saved_areas"("userId", "areaFeatureId");
CREATE INDEX "saved_areas_userId_idx" ON "saved_areas"("userId");
CREATE INDEX "saved_areas_areaFeatureId_idx" ON "saved_areas"("areaFeatureId");
CREATE INDEX "comparisons_userId_idx" ON "comparisons"("userId");
CREATE UNIQUE INDEX "comparison_items_comparisonId_areaFeatureId_key" ON "comparison_items"("comparisonId", "areaFeatureId");
CREATE INDEX "comparison_items_comparisonId_idx" ON "comparison_items"("comparisonId");
CREATE INDEX "comparison_items_areaFeatureId_idx" ON "comparison_items"("areaFeatureId");

ALTER TABLE "saved_areas" ADD CONSTRAINT "saved_areas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_areas" ADD CONSTRAINT "saved_areas_areaFeatureId_fkey" FOREIGN KEY ("areaFeatureId") REFERENCES "area_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comparison_items" ADD CONSTRAINT "comparison_items_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comparison_items" ADD CONSTRAINT "comparison_items_areaFeatureId_fkey" FOREIGN KEY ("areaFeatureId") REFERENCES "area_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
