import { describe, expect, it } from 'vitest';

import { isSourceOriginApproved, parseLicencePayload, parseSourcePayload } from './repository';

describe('source registry contracts', () => {
  it('requires approval before an origin can be used', () => {
    expect(isSourceOriginApproved({ approvalState: 'PENDING' })).toBe(false);
    expect(isSourceOriginApproved({ approvalState: 'REJECTED' })).toBe(false);
    expect(isSourceOriginApproved({ approvalState: 'APPROVED' })).toBe(true);
  });

  it('accepts only absolute HTTP(S) source origins', () => {
    expect(
      parseSourcePayload({
        originUrl: 'https://example.com/source',
        sourceType: 'PUBLIC_FEED',
        licenceId: 'licence-id',
      }),
    ).toMatchObject({ originUrl: 'https://example.com/source' });
    expect(
      parseSourcePayload({
        originUrl: 'file:///tmp/source',
        sourceType: 'PUBLIC_FEED',
        licenceId: 'id',
      }),
    ).toBeNull();
  });

  it('validates licence terms URLs and permission flags', () => {
    expect(
      parseLicencePayload({
        spdxOrName: 'CC-BY-4.0',
        attributionRequired: true,
        commercialUseAllowed: true,
        shareAlike: false,
        termsUrl: 'https://creativecommons.org/licenses/by/4.0/',
      }),
    ).toMatchObject({ termsUrl: 'https://creativecommons.org/licenses/by/4.0/' });
    expect(
      parseLicencePayload({
        spdxOrName: 'invalid',
        attributionRequired: 'yes',
        commercialUseAllowed: true,
        shareAlike: false,
      }),
    ).toBeNull();
  });
});
