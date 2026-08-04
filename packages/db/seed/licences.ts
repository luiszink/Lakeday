import { PrismaClient } from '@prisma/client';

const licences = [
  ['CC0-1.0', false, true, false, 'Creative Commons Zero 1.0 Universal.'],
  ['CC-BY-4.0', true, true, false, 'Creative Commons Attribution 4.0 International.'],
  ['CC-BY-SA-4.0', true, true, true, 'Creative Commons Attribution-ShareAlike 4.0 International.'],
  ['ODbL-1.0', true, true, true, 'Open Data Commons Open Database License 1.0.'],
] as const;

export async function seedLicences(client: PrismaClient): Promise<void> {
  for (const [
    spdxOrName,
    attributionRequired,
    commercialUseAllowed,
    shareAlike,
    notes,
  ] of licences) {
    await client.licence.upsert({
      where: { spdxOrName },
      create: { spdxOrName, attributionRequired, commercialUseAllowed, shareAlike, notes },
      update: { attributionRequired, commercialUseAllowed, shareAlike, notes },
    });
  }
}

export const licenceCodes = licences.map(([spdxOrName]) => spdxOrName);
