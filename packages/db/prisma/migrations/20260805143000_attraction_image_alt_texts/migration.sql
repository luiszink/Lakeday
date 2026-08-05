ALTER TABLE "attraction_image"
ADD COLUMN "alt_de" TEXT NOT NULL DEFAULT 'Attraction image',
ADD COLUMN "alt_en" TEXT NOT NULL DEFAULT 'Attraction image';

ALTER TABLE "attraction_image"
ALTER COLUMN "alt_de" DROP DEFAULT,
ALTER COLUMN "alt_en" DROP DEFAULT;