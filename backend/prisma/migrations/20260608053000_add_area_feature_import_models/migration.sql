CREATE TABLE "districts" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_categories" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "business_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "datasets" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sourcePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "area_features" (
  "id" TEXT NOT NULL,
  "districtId" TEXT NOT NULL,
  "businessCategoryId" TEXT NOT NULL,
  "datasetId" TEXT NOT NULL,
  "monthlySalesAmount" DOUBLE PRECISION,
  "monthlySalesCount" DOUBLE PRECISION,
  "totalSalesCount" DOUBLE PRECISION,
  "targetSalesCount" DOUBLE PRECISION,
  "peakTimeSalesRatio" DOUBLE PRECISION,
  "recommendedTimeBand" TEXT,
  "quarterlySalesStability" DOUBLE PRECISION,
  "targetSalesRatio" DOUBLE PRECISION,
  "averageTicket" DOUBLE PRECISION,
  "dawnSalesRatio" DOUBLE PRECISION,
  "morningSalesRatio" DOUBLE PRECISION,
  "lunchSalesRatio" DOUBLE PRECISION,
  "afternoonSalesRatio" DOUBLE PRECISION,
  "eveningSalesRatio" DOUBLE PRECISION,
  "nightSalesRatio" DOUBLE PRECISION,
  "totalFootTraffic" DOUBLE PRECISION,
  "targetFootTraffic" DOUBLE PRECISION,
  "targetFootTrafficRatio" DOUBLE PRECISION,
  "estimatedMonthlyFootTraffic" DOUBLE PRECISION,
  "cafeConversionRate" DOUBLE PRECISION,
  "targetCafeConversionRate" DOUBLE PRECISION,
  "rawFeatures" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "area_features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");
CREATE UNIQUE INDEX "business_categories_code_key" ON "business_categories"("code");
CREATE UNIQUE INDEX "datasets_code_key" ON "datasets"("code");
CREATE UNIQUE INDEX "area_features_datasetId_businessCategoryId_districtId_key" ON "area_features"("datasetId", "businessCategoryId", "districtId");
CREATE INDEX "area_features_districtId_idx" ON "area_features"("districtId");
CREATE INDEX "area_features_businessCategoryId_idx" ON "area_features"("businessCategoryId");
CREATE INDEX "area_features_datasetId_idx" ON "area_features"("datasetId");

ALTER TABLE "area_features" ADD CONSTRAINT "area_features_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "area_features" ADD CONSTRAINT "area_features_businessCategoryId_fkey" FOREIGN KEY ("businessCategoryId") REFERENCES "business_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "area_features" ADD CONSTRAINT "area_features_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
