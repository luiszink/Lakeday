import { PrismaClient } from '@prisma/client';

const licences = [
  {
    spdxOrName: 'CC0-1.0',
    attributionRequired: false,
    commercialUseAllowed: true,
    shareAlike: false,
    notes: 'Creative Commons Zero 1.0 Universal.',
    termsUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attributionText: 'No attribution required.',
  },
  {
    spdxOrName: 'CC-BY-4.0',
    attributionRequired: true,
    commercialUseAllowed: true,
    shareAlike: false,
    notes: 'Creative Commons Attribution 4.0 International.',
    termsUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attributionText: 'Creative Commons Attribution 4.0 International.',
  },
  {
    spdxOrName: 'CC-BY-SA-4.0',
    attributionRequired: true,
    commercialUseAllowed: true,
    shareAlike: true,
    notes: 'Creative Commons Attribution-ShareAlike 4.0 International.',
    termsUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attributionText: 'Creative Commons Attribution-ShareAlike 4.0 International.',
  },
  {
    spdxOrName: 'ODbL-1.0',
    attributionRequired: true,
    commercialUseAllowed: true,
    shareAlike: true,
    notes: 'Open Data Commons Open Database License 1.0.',
    termsUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    attributionText: '© OpenStreetMap contributors',
  },
] as const;

const sourceOrigins = [
  {
    originUrl: 'https://www.openstreetmap.org',
    sourceType: 'OSM' as const,
    licence: 'ODbL-1.0',
    refreshCadenceHours: 168,
    attributionText: '© OpenStreetMap contributors',
    notes: 'OpenStreetMap source data.',
  },
  {
    originUrl: 'https://tile.openstreetmap.org',
    sourceType: 'OSM' as const,
    licence: 'ODbL-1.0',
    refreshCadenceHours: null,
    attributionText: '© OpenStreetMap contributors',
    notes: 'OpenStreetMap tile provider.',
  },
  {
    originUrl: 'https://www.openstreetmap.org/relation/1156846',
    sourceType: 'OSM' as const,
    licence: 'ODbL-1.0',
    refreshCadenceHours: null,
    attributionText: '© OpenStreetMap contributors',
    notes: 'Bodensee shoreline geometry.',
  },
  {
    originUrl: 'https://open-meteo.com',
    sourceType: 'OTHER' as const,
    licence: 'CC-BY-4.0',
    refreshCadenceHours: 24,
    attributionText: 'Weather data by Open-Meteo.com',
    notes: 'Weather provider.',
  },
] as const;

export async function seedLicences(client: PrismaClient): Promise<void> {
  for (const licence of licences) {
    await client.licence.upsert({
      where: { spdxOrName: licence.spdxOrName },
      create: licence,
      update: licence,
    });
  }

  for (const source of sourceOrigins) {
    const licence = await client.licence.findUniqueOrThrow({
      where: { spdxOrName: source.licence },
      select: { id: true },
    });
    await client.sourceOrigin.upsert({
      where: {
        originUrl_sourceType: { originUrl: source.originUrl, sourceType: source.sourceType },
      },
      create: {
        originUrl: source.originUrl,
        sourceType: source.sourceType,
        licenceId: licence.id,
        refreshCadenceHours: source.refreshCadenceHours,
        health: 'HEALTHY',
        attributionText: source.attributionText,
        notes: source.notes,
        approvalState: 'APPROVED',
      },
      update: {
        licenceId: licence.id,
        refreshCadenceHours: source.refreshCadenceHours,
        health: 'HEALTHY',
        attributionText: source.attributionText,
        notes: source.notes,
        approvalState: 'APPROVED',
      },
    });
  }
}

export const licenceCodes = licences.map(({ spdxOrName }) => spdxOrName);
