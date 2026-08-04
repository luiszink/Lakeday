-- CreateTable
CREATE TABLE "shoreline_geometry" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "geometry" geography(MultiLineString,4326) NOT NULL,
    "source_url" TEXT NOT NULL,
    "licence" TEXT NOT NULL,
    "loaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shoreline_geometry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shoreline_municipality" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" "CountryCode" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shoreline_municipality_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "shoreline_geometry_version_key" ON "shoreline_geometry"("version");
