export const sourceTypes = [
  'OFFICIAL_WEBSITE',
  'TOURISM_ORG',
  'PUBLIC_FEED',
  'OSM',
  'WIKIDATA',
  'WIKIPEDIA',
  'OTHER',
] as const;
export type RegistrySourceType = (typeof sourceTypes)[number];

export const sourceHealthValues = ['UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNAVAILABLE'] as const;
export type RegistrySourceHealth = (typeof sourceHealthValues)[number];

export const sourceApprovalStates = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type RegistrySourceApprovalState = (typeof sourceApprovalStates)[number];

export type RegistrySource = {
  id: string;
  originUrl: string;
  sourceType: RegistrySourceType;
  licenceId: string;
  refreshCadenceHours: number | null;
  health: RegistrySourceHealth;
  attributionText: string | null;
  notes: string | null;
  approvalState: RegistrySourceApprovalState;
  licence: { spdxOrName: string };
};
