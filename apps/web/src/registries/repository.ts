import { database } from '../auth/database';

import {
  sourceApprovalStates,
  sourceHealthValues,
  sourceTypes,
  type RegistrySource,
  type RegistrySourceApprovalState,
  type RegistrySourceHealth,
  type RegistrySourceType,
} from './types';

export { sourceApprovalStates, sourceHealthValues, sourceTypes } from './types';
export type {
  RegistrySource,
  RegistrySourceApprovalState,
  RegistrySourceHealth,
  RegistrySourceType,
} from './types';

export type SourceMutation = {
  originUrl: string;
  sourceType: RegistrySourceType;
  licenceId: string;
  refreshCadenceHours?: number | null;
  health?: RegistrySourceHealth;
  attributionText?: string | null;
  notes?: string | null;
  approvalState?: RegistrySourceApprovalState;
};

export type SourcePatch = Partial<SourceMutation>;

export type LicenceMutation = {
  spdxOrName: string;
  attributionRequired: boolean;
  commercialUseAllowed: boolean;
  shareAlike: boolean;
  termsUrl?: string | null;
  attributionText?: string | null;
  permissionEvidence?: string | null;
  notes?: string | null;
};

export type LicencePatch = Partial<LicenceMutation>;

export function isSourceOriginApproved(source: Pick<RegistrySource, 'approvalState'>) {
  return source.approvalState === 'APPROVED';
}

export class SourceOriginApprovalError extends Error {
  constructor() {
    super('Source origin approval is required before import or refresh.');
    this.name = 'SourceOriginApprovalError';
  }
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function parseUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseSourcePayload(
  body: unknown,
  partial = false,
): SourceMutation | SourcePatch | null {
  const input = recordValue(body);
  if (!input) return null;

  const originUrl = parseUrl(input.originUrl);
  const sourceType = input.sourceType;
  const licenceId = typeof input.licenceId === 'string' ? input.licenceId.trim() : null;
  const cadence = input.refreshCadenceHours;
  const refreshCadenceHours =
    cadence === null || cadence === undefined
      ? cadence
      : typeof cadence === 'number' && Number.isInteger(cadence) && cadence > 0
        ? cadence
        : undefined;
  if (!partial && (!originUrl || !isOneOf(sourceTypes, sourceType) || !licenceId)) return null;
  if (partial && input.originUrl !== undefined && !originUrl) return null;
  if (partial && input.sourceType !== undefined && !isOneOf(sourceTypes, sourceType)) return null;
  if (partial && input.licenceId !== undefined && !licenceId) return null;
  if (cadence !== undefined && refreshCadenceHours === undefined) return null;

  const result: SourcePatch = {};
  if (originUrl) result.originUrl = originUrl;
  if (isOneOf(sourceTypes, sourceType)) result.sourceType = sourceType;
  if (licenceId) result.licenceId = licenceId;
  if (cadence !== undefined) result.refreshCadenceHours = refreshCadenceHours ?? null;
  if (input.health !== undefined) {
    if (!isOneOf(sourceHealthValues, input.health)) return null;
    result.health = input.health;
  }
  if (input.attributionText !== undefined) {
    const attributionText = optionalText(input.attributionText);
    if (attributionText !== undefined) result.attributionText = attributionText;
  }
  if (input.notes !== undefined) {
    const notes = optionalText(input.notes);
    if (notes !== undefined) result.notes = notes;
  }
  if (input.approvalState !== undefined) {
    if (!isOneOf(sourceApprovalStates, input.approvalState)) return null;
    result.approvalState = input.approvalState;
  }
  return result;
}

export function parseLicencePayload(
  body: unknown,
  partial = false,
): LicenceMutation | LicencePatch | null {
  const input = recordValue(body);
  if (!input) return null;
  const spdxOrName = typeof input.spdxOrName === 'string' ? input.spdxOrName.trim() : '';
  const booleans = ['attributionRequired', 'commercialUseAllowed', 'shareAlike'] as const;
  for (const key of booleans) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') return null;
  }
  if (!partial && (!spdxOrName || booleans.some((key) => typeof input[key] !== 'boolean')))
    return null;
  if (partial && input.spdxOrName !== undefined && !spdxOrName) return null;

  const result: LicencePatch = {};
  if (spdxOrName) result.spdxOrName = spdxOrName;
  for (const key of booleans) {
    if (typeof input[key] === 'boolean') result[key] = input[key];
  }
  for (const key of ['termsUrl', 'attributionText', 'permissionEvidence', 'notes'] as const) {
    if (input[key] !== undefined) {
      const text = optionalText(input[key]);
      if (text !== undefined) result[key] = text;
    }
  }
  if (result.termsUrl) {
    const termsUrl = parseUrl(result.termsUrl);
    if (!termsUrl) return null;
    result.termsUrl = termsUrl;
  }
  return result;
}

export async function listLicences() {
  return database.licence.findMany({
    orderBy: { spdxOrName: 'asc' },
    select: {
      id: true,
      spdxOrName: true,
      attributionRequired: true,
      commercialUseAllowed: true,
      shareAlike: true,
      termsUrl: true,
      attributionText: true,
      permissionEvidence: true,
      notes: true,
    },
  });
}

export async function listSources() {
  return database.sourceOrigin.findMany({
    orderBy: [{ approvalState: 'asc' }, { originUrl: 'asc' }],
    select: {
      id: true,
      originUrl: true,
      sourceType: true,
      licenceId: true,
      refreshCadenceHours: true,
      health: true,
      attributionText: true,
      notes: true,
      approvalState: true,
      licence: { select: { spdxOrName: true } },
    },
  });
}

export async function listPublicRegistry() {
  const [licences, sources] = await Promise.all([
    database.licence.findMany({
      orderBy: { spdxOrName: 'asc' },
      select: {
        spdxOrName: true,
        attributionRequired: true,
        commercialUseAllowed: true,
        shareAlike: true,
        termsUrl: true,
        attributionText: true,
      },
    }),
    database.sourceOrigin.findMany({
      where: { approvalState: 'APPROVED' },
      orderBy: { originUrl: 'asc' },
      select: {
        originUrl: true,
        attributionText: true,
        licence: { select: { spdxOrName: true, termsUrl: true } },
      },
    }),
  ]);
  return { licences, sources };
}

export async function requireApprovedSourceOrigin(id: string) {
  const source = await database.sourceOrigin.findUnique({ where: { id } });
  if (!source || !isSourceOriginApproved(source)) throw new SourceOriginApprovalError();
  return source;
}

export async function createLicence(input: LicenceMutation) {
  return database.licence.create({ data: input });
}

export async function updateLicence(id: string, input: LicencePatch) {
  return database.licence.update({ where: { id }, data: input });
}

export async function deleteLicence(id: string) {
  return database.licence.delete({ where: { id } });
}

export async function createSource(input: SourceMutation, userId: string) {
  const approvalState = input.approvalState ?? 'PENDING';
  return database.sourceOrigin.create({
    data: {
      ...input,
      approvalState,
      approvedById: approvalState === 'APPROVED' ? userId : null,
      approvedAt: approvalState === 'APPROVED' ? new Date() : null,
    },
    select: {
      id: true,
      originUrl: true,
      sourceType: true,
      licenceId: true,
      refreshCadenceHours: true,
      health: true,
      attributionText: true,
      notes: true,
      approvalState: true,
      licence: { select: { spdxOrName: true } },
    },
  });
}

export async function updateSource(id: string, input: SourcePatch, userId: string) {
  const data = { ...input } as SourcePatch & {
    approvedById?: string | null;
    approvedAt?: Date | null;
  };
  if (input.approvalState === 'APPROVED') {
    data.approvedById = userId;
    data.approvedAt = new Date();
  } else if (input.approvalState) {
    data.approvedById = null;
    data.approvedAt = null;
  }
  return database.sourceOrigin.update({
    where: { id },
    data,
    select: {
      id: true,
      originUrl: true,
      sourceType: true,
      licenceId: true,
      refreshCadenceHours: true,
      health: true,
      attributionText: true,
      notes: true,
      approvalState: true,
      licence: { select: { spdxOrName: true } },
    },
  });
}

export async function deleteSource(id: string) {
  return database.sourceOrigin.delete({ where: { id } });
}
