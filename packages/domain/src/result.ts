export type Result<Value, Error> =
  Readonly<{ ok: true; value: Value }> | Readonly<{ ok: false; errors: readonly Error[] }>;

export function success<Value>(value: Value): Result<Value, never> {
  return { ok: true, value };
}

export function failure<Error>(errors: readonly Error[]): Result<never, Error> {
  return { ok: false, errors };
}
