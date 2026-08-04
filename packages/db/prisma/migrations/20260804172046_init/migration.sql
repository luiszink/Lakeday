CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "AttractionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CountryCode" AS ENUM ('DE', 'CH', 'AT');

-- CreateEnum
CREATE TYPE "IndoorOutdoor" AS ENUM ('INDOOR', 'OUTDOOR', 'MIXED');

-- CreateEnum
CREATE TYPE "Suitability" AS ENUM ('POOR', 'OK', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_YEAR');

-- CreateEnum
CREATE TYPE "PriceLevel" AS ENUM ('FREE', 'LOW', 'MEDIUM', 'HIGH', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BookingRequirement" AS ENUM ('NONE', 'RECOMMENDED', 'REQUIRED');

-- CreateEnum
CREATE TYPE "ChildAgeBand" AS ENUM ('0-2', '3-5', '6-9', '10-13', '14+');

-- CreateEnum
CREATE TYPE "StrollerSuitability" AS ENUM ('YES', 'PARTIAL', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WheelchairAccess" AS ENUM ('FULL', 'PARTIAL', 'NONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DogPolicy" AS ENUM ('ALLOWED', 'LEASHED', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VisitorLanguage" AS ENUM ('DE', 'EN', 'FR', 'IT');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('WALK', 'BICYCLE', 'PUBLIC_TRANSPORT', 'CAR');

-- CreateEnum
CREATE TYPE "ParkingAvailability" AS ENUM ('ON_SITE', 'NEARBY', 'DIFFICULT', 'NONE');

-- CreateEnum
CREATE TYPE "VerificationState" AS ENUM ('UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('de', 'en');

-- CreateEnum
CREATE TYPE "TranslationState" AS ENUM ('SOURCE', 'TRANSLATED', 'NEEDS_REVIEW', 'STALE');

-- CreateEnum
CREATE TYPE "CategoryLevel" AS ENUM ('PRIMARY', 'SUB');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "HolidayRule" AS ENUM ('AS_WEEKDAY', 'CLOSED', 'SPECIAL');

-- CreateEnum
CREATE TYPE "PriceAudience" AS ENUM ('ADULT', 'CHILD', 'FAMILY', 'SENIOR', 'GROUP', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'CHF');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL_WEBSITE', 'TOURISM_ORG', 'PUBLIC_FEED', 'OSM', 'WIKIDATA', 'WIKIPEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "FactKey" AS ENUM ('OPENING_HOURS', 'PRICE', 'CLOSURE', 'WHEELCHAIR_ACCESS', 'FOOD_ON_SITE', 'CAFE_ON_SITE', 'PICNIC_ALLOWED', 'TOILETS', 'DOG_POLICY', 'BOOKING_REQUIREMENT', 'LOCATION', 'CONTACT');

-- CreateEnum
CREATE TYPE "UpdateStatus" AS ENUM ('FRESH', 'DUE', 'STALE', 'SOURCE_UNAVAILABLE', 'IN_REVIEW');

-- CreateEnum
CREATE TYPE "ReviewerDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChangeOrigin" AS ENUM ('SCHEDULED_REFRESH', 'RESEARCH_IMPORT', 'USER_REPORT');

-- CreateEnum
CREATE TYPE "ChangeProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ExternalSystem" AS ENUM ('OSM', 'WIKIDATA', 'GOOGLE_PLACE_ID', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "UserReportCategory" AS ENUM ('WRONG_HOURS', 'WRONG_PRICE', 'CLOSED', 'ACCESS_ISSUE', 'INCORRECT_INFO', 'OTHER');

-- CreateEnum
CREATE TYPE "UserReportStatus" AS ENUM ('NEW', 'TRIAGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('EDITOR', 'REVIEWER', 'ADMIN');

-- CreateTable
CREATE TABLE "attraction" (
    "id" UUID NOT NULL,
    "status" "AttractionStatus" NOT NULL DEFAULT 'DRAFT',
    "location" geography(Point,4326) NOT NULL,
    "country_code" "CountryCode" NOT NULL,
    "municipality" TEXT NOT NULL,
    "region_code" TEXT NOT NULL,
    "shoreline_distance_m" INTEGER,
    "scope_exception" BOOLEAN NOT NULL DEFAULT false,
    "scope_exception_reason" TEXT,
    "indoor_outdoor" "IndoorOutdoor" NOT NULL,
    "rain_suitability" "Suitability",
    "heat_suitability" "Suitability",
    "seasons" "Season"[],
    "typical_duration_min" INTEGER,
    "typical_duration_max" INTEGER,
    "price_level" "PriceLevel",
    "booking_requirement" "BookingRequirement" NOT NULL DEFAULT 'NONE',
    "booking_url" TEXT,
    "official_website" TEXT,
    "child_age_bands" "ChildAgeBand"[],
    "food_on_site" BOOLEAN,
    "cafe_on_site" BOOLEAN,
    "picnic_allowed" BOOLEAN,
    "toilets" BOOLEAN,
    "stroller_suitable" "StrollerSuitability",
    "wheelchair_access" "WheelchairAccess",
    "wheelchair_toilet" BOOLEAN,
    "dog_policy" "DogPolicy",
    "visitor_languages" "VisitorLanguage"[],
    "transport_modes" "TransportMode"[],
    "nearest_stop_name" TEXT,
    "nearest_stop_distance_m" INTEGER,
    "parking_availability" "ParkingAvailability",
    "parking_note" TEXT,
    "bicycle_access" BOOLEAN,
    "bicycle_note" TEXT,
    "editorial_importance" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "verification_state" "VerificationState" NOT NULL DEFAULT 'UNVERIFIED',
    "last_verified_at" TIMESTAMPTZ(6),
    "confidence" "Confidence" NOT NULL DEFAULT 'MEDIUM',
    "data_licence_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attraction_localization" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "practical_notes" TEXT,
    "translation_state" "TranslationState" NOT NULL DEFAULT 'SOURCE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attraction_localization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "level" "CategoryLevel" NOT NULL,
    "parent_category_id" UUID,
    "label_de" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attraction_category" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attraction_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label_de" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attraction_interest" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "interest_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attraction_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label_de" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attraction_audience" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "audience_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attraction_audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorial_tag" (
    "id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editorial_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attraction_tag" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attraction_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region" (
    "code" TEXT NOT NULL,
    "name_de" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "polygon" geography(MultiPolygon,4326),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "region_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "opening_schedule" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE NOT NULL,
    "hours_unknown" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "opening_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_rule" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "days_of_week" "DayOfWeek"[],
    "opens" TIME(6),
    "closes" TIME(6),
    "applies_on_public_holidays" "HolidayRule" NOT NULL DEFAULT 'AS_WEEKDAY',
    "holiday_calendar_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opening_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday_calendar" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" "CountryCode" NOT NULL,
    "subdivision" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holiday_calendar_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "exceptional_closure" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "reason" TEXT,
    "source_record_id" UUID,
    "last_checked_at" TIMESTAMPTZ(6),
    "confidence" "Confidence" NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exceptional_closure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_info" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "audience" "PriceAudience" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "valid_from" DATE,
    "valid_to" DATE,
    "note" TEXT,
    "source_record_id" UUID,
    "last_checked_at" TIMESTAMPTZ(6),
    "confidence" "Confidence" NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "price_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_record" (
    "id" UUID NOT NULL,
    "attraction_id" UUID,
    "source_url" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "retrieved_at" TIMESTAMPTZ(6) NOT NULL,
    "content_hash" TEXT NOT NULL,
    "raw_payload" JSONB,
    "licence_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_provenance" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "fact_key" "FactKey" NOT NULL,
    "source_record_id" UUID NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "last_checked_at" TIMESTAMPTZ(6) NOT NULL,
    "next_refresh_at" TIMESTAMPTZ(6) NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "update_status" "UpdateStatus" NOT NULL,
    "detected_change" JSONB,
    "reviewer_decision" "ReviewerDecision",
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fact_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_proposal" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "fact_key" "FactKey" NOT NULL,
    "current_value" JSONB,
    "proposed_value" JSONB NOT NULL,
    "source_record_id" UUID,
    "confidence" "Confidence" NOT NULL DEFAULT 'MEDIUM',
    "origin" "ChangeOrigin" NOT NULL,
    "status" "ChangeProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "change_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_identifier" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "system" "ExternalSystem" NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_identifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attraction_image" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "licence_id" UUID NOT NULL,
    "attribution_text" TEXT NOT NULL,
    "source_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attraction_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" UUID NOT NULL,
    "share_token" TEXT,
    "locale" "Locale" NOT NULL,
    "date" DATE,
    "start_point_x" DECIMAL(9,6),
    "start_point_y" DECIMAL(9,6),
    "start_point_label" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_stop" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "sort_index" INTEGER NOT NULL,
    "planned_duration_min" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_report" (
    "id" UUID NOT NULL,
    "attraction_id" UUID NOT NULL,
    "category" "UserReportCategory" NOT NULL,
    "message" TEXT,
    "locale" "Locale" NOT NULL,
    "status" "UserReportStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "sso_subject" TEXT,
    "role" "AdminRole" NOT NULL,
    "totp_secret" TEXT,
    "totp_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence" (
    "id" UUID NOT NULL,
    "spdx_or_name" TEXT NOT NULL,
    "attribution_required" BOOLEAN NOT NULL DEFAULT true,
    "commercial_use_allowed" BOOLEAN NOT NULL DEFAULT true,
    "share_alike" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attraction_alias" (
    "id" UUID NOT NULL,
    "merged_into_id" UUID NOT NULL,
    "merged_from_id" UUID NOT NULL,
    "reason" TEXT,
    "merged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "merged_by" UUID,

    CONSTRAINT "attraction_alias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attraction_status_region_ix" ON "attraction"("status", "region_code");

-- CreateIndex
CREATE UNIQUE INDEX "attraction_localization_attraction_locale_key" ON "attraction_localization"("attraction_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "attraction_localization_locale_slug_key" ON "attraction_localization"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "category_code_key" ON "category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "attraction_category_attraction_id_category_id_key" ON "attraction_category"("attraction_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "interest_code_key" ON "interest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "attraction_interest_attraction_id_interest_id_key" ON "attraction_interest"("attraction_id", "interest_id");

-- CreateIndex
CREATE UNIQUE INDEX "audience_code_key" ON "audience"("code");

-- CreateIndex
CREATE UNIQUE INDEX "attraction_audience_attraction_id_audience_id_key" ON "attraction_audience"("attraction_id", "audience_id");

-- CreateIndex
CREATE UNIQUE INDEX "editorial_tag_value_locale_key" ON "editorial_tag"("value", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "attraction_tag_attraction_id_tag_id_key" ON "attraction_tag"("attraction_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "opening_schedule_attraction_id_key" ON "opening_schedule"("attraction_id");

-- CreateIndex
CREATE INDEX "price_info_attraction_audience_ix" ON "price_info"("attraction_id", "audience");

-- CreateIndex
CREATE INDEX "source_record_content_hash_ix" ON "source_record"("source_url", "content_hash");

-- CreateIndex
CREATE INDEX "source_record_attraction_ix" ON "source_record"("attraction_id");

-- CreateIndex
CREATE INDEX "fact_provenance_next_refresh_ix" ON "fact_provenance"("next_refresh_at");

-- CreateIndex
CREATE INDEX "fact_provenance_update_status_ix" ON "fact_provenance"("update_status");

-- CreateIndex
CREATE UNIQUE INDEX "fact_provenance_attraction_id_fact_key_source_record_id_key" ON "fact_provenance"("attraction_id", "fact_key", "source_record_id");

-- CreateIndex
CREATE INDEX "change_proposal_status_ix" ON "change_proposal"("status");

-- CreateIndex
CREATE INDEX "change_proposal_attraction_ix" ON "change_proposal"("attraction_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_identifier_system_external_id_key" ON "external_identifier"("system", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_share_token_key" ON "plan"("share_token");

-- CreateIndex
CREATE INDEX "plan_last_accessed_ix" ON "plan"("last_accessed_at");

-- CreateIndex
CREATE INDEX "plan_stop_plan_ix" ON "plan_stop"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_stop_plan_id_sort_index_key" ON "plan_stop"("plan_id", "sort_index");

-- CreateIndex
CREATE INDEX "user_report_status_ix" ON "user_report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_sso_subject_key" ON "admin_user"("sso_subject");

-- CreateIndex
CREATE UNIQUE INDEX "licence_spdx_or_name_key" ON "licence"("spdx_or_name");

-- CreateIndex
CREATE UNIQUE INDEX "attraction_alias_merged_from_id_key" ON "attraction_alias"("merged_from_id");

-- AddForeignKey
ALTER TABLE "attraction" ADD CONSTRAINT "attraction_region_code_fkey" FOREIGN KEY ("region_code") REFERENCES "region"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction" ADD CONSTRAINT "attraction_data_licence_id_fkey" FOREIGN KEY ("data_licence_id") REFERENCES "licence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_localization" ADD CONSTRAINT "attraction_localization_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_category" ADD CONSTRAINT "attraction_category_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_category" ADD CONSTRAINT "attraction_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_interest" ADD CONSTRAINT "attraction_interest_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_interest" ADD CONSTRAINT "attraction_interest_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "interest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_audience" ADD CONSTRAINT "attraction_audience_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_audience" ADD CONSTRAINT "attraction_audience_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "audience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_tag" ADD CONSTRAINT "attraction_tag_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_tag" ADD CONSTRAINT "attraction_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "editorial_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_schedule" ADD CONSTRAINT "opening_schedule_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_rule" ADD CONSTRAINT "opening_rule_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "opening_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_rule" ADD CONSTRAINT "opening_rule_holiday_calendar_code_fkey" FOREIGN KEY ("holiday_calendar_code") REFERENCES "holiday_calendar"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exceptional_closure" ADD CONSTRAINT "exceptional_closure_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exceptional_closure" ADD CONSTRAINT "exceptional_closure_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_info" ADD CONSTRAINT "price_info_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_info" ADD CONSTRAINT "price_info_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_record" ADD CONSTRAINT "source_record_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_provenance" ADD CONSTRAINT "fact_provenance_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_provenance" ADD CONSTRAINT "fact_provenance_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_provenance" ADD CONSTRAINT "fact_provenance_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_proposal" ADD CONSTRAINT "change_proposal_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_proposal" ADD CONSTRAINT "change_proposal_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_proposal" ADD CONSTRAINT "change_proposal_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_identifier" ADD CONSTRAINT "external_identifier_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_image" ADD CONSTRAINT "attraction_image_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_image" ADD CONSTRAINT "attraction_image_licence_id_fkey" FOREIGN KEY ("licence_id") REFERENCES "licence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_stop" ADD CONSTRAINT "plan_stop_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_stop" ADD CONSTRAINT "plan_stop_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_attraction_id_fkey" FOREIGN KEY ("attraction_id") REFERENCES "attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_alias" ADD CONSTRAINT "attraction_alias_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "attraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_alias" ADD CONSTRAINT "attraction_alias_merged_from_id_fkey" FOREIGN KEY ("merged_from_id") REFERENCES "attraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attraction_alias" ADD CONSTRAINT "attraction_alias_merged_by_fkey" FOREIGN KEY ("merged_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add documented structural constraints and PostGIS indexes that Prisma cannot express.
ALTER TABLE "attraction" ADD CONSTRAINT "attraction_scope_exception_reason_check"
    CHECK (NOT "scope_exception" OR COALESCE(length("scope_exception_reason"), 0) > 0);
ALTER TABLE "opening_schedule" ADD CONSTRAINT "opening_schedule_valid_range_check"
    CHECK ("valid_from" <= "valid_to");
ALTER TABLE "opening_rule" ADD CONSTRAINT "opening_rule_time_range_check"
    CHECK (("opens" IS NULL AND "closes" IS NULL) OR "opens" < "closes");
ALTER TABLE "exceptional_closure" ADD CONSTRAINT "exceptional_closure_date_range_check"
    CHECK ("date_from" <= "date_to");
ALTER TABLE "price_info" ADD CONSTRAINT "price_info_amount_check"
    CHECK ("amount" >= 0);
ALTER TABLE "plan" ADD CONSTRAINT "plan_start_point_coordinates_check"
    CHECK (("start_point_x" IS NULL) = ("start_point_y" IS NULL));
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_auth_method_check"
    CHECK ("password_hash" IS NOT NULL OR "sso_subject" IS NOT NULL);

CREATE INDEX "attraction_location_gix" ON "attraction" USING GIST ("location");
CREATE INDEX "region_polygon_gix" ON "region" USING GIST ("polygon");
CREATE INDEX "attraction_published_ix" ON "attraction" ("region_code", "price_level")
    WHERE "status" = 'PUBLISHED';

COMMENT ON COLUMN "plan"."start_point_x" IS
    'Rounded coordinate; precise location is never persisted.';
COMMENT ON COLUMN "plan"."start_point_y" IS
    'Rounded coordinate; precise location is never persisted.';
