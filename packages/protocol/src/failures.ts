/**
 * Typed failure envelope (spec §6.4, decision D10).
 *
 * The contract: a kernel operation NEVER throws across the message boundary. Every OCCT
 * `Standard_Failure`, every invalid-result check, every bad payload comes back as a `Fail`
 * carrying one of these codes. A failed operation produces no UndoableEdit and leaves the
 * document at its last-good state.
 */

export const KERNEL_FAILURE_CODES = [
  // --- protocol / plumbing ---
  'PROTOCOL_VERSION_MISMATCH',
  'UNKNOWN_OP',
  'INVALID_PAYLOAD',
  'KERNEL_NOT_READY',

  // --- dispatcher lifecycle (spec §3: superseded results are discarded, not awaited) ---
  'CANCELLED',
  'SUPERSEDED',
  'TIMEOUT',

  // --- kernel / OCCT (spec §6.4) ---
  'OCCT_STANDARD_FAILURE',
  'INVALID_RESULT',
  'INVALID_PROFILE',
  'FILLET_RADIUS_TOO_LARGE',
  'EMPTY_BOOLEAN_RESULT',

  // --- identity / handles ---
  'HANDLE_NOT_FOUND',
  'UNRESOLVED_SUBSHAPE_REF',

  /**
   * ⚠⚠ THE GEOMETRY CACHE DOES NOT MATCH ITS RECIPE, AND SO IT IS REFUSED (D29, owner ruling
   * 2026-07-14).
   *
   * `importBrep` re-attaches identity tokens to a cached solid **by canonical order**, then **verifies
   * every one of them against a fingerprint taken at write time**. Any disagreement — a different OCCT
   * build, a re-sorted topology, a corrupted file, a hostile one — yields **this code, and never a
   * shape.**
   *
   * ⚠ **It is not an error condition; it is the cache working as designed.** The recipe is the source
   * of truth and can always rebuild, so the *correct* response is to throw the cache away and rebuild —
   * which is why a cache can never mis-name a face: it is a bet the document is always free to abandon.
   * A silently mis-attached token, by contrast, would be a window that moves to a different wall and
   * nobody ever finds out.
   */
  'CACHE_STALE',

  // --- last resort ---
  'INTERNAL',
] as const;

export type KernelFailureCode = (typeof KERNEL_FAILURE_CODES)[number];

export interface KernelFailure {
  readonly code: KernelFailureCode;
  /** Human-readable, safe to surface in a dismissible UI error (spec §6.4). */
  readonly message: string;
  /** The op that failed, when known. Kept as a plain string to avoid a cyclic import. */
  readonly op?: string;
  readonly detail?: Readonly<Record<string, unknown>>;
}

export function kernelFailure(
  code: KernelFailureCode,
  message: string,
  extra?: { op?: string; detail?: Readonly<Record<string, unknown>> },
): KernelFailure {
  return {
    code,
    message,
    ...(extra?.op !== undefined ? { op: extra.op } : {}),
    ...(extra?.detail !== undefined ? { detail: extra.detail } : {}),
  };
}

/** The Error a client rejects with, so callers can `catch (e) { if (isKernelFailureError(e)) ... }`. */
export class KernelFailureError extends Error {
  readonly failure: KernelFailure;

  constructor(failure: KernelFailure) {
    super(`[${failure.code}] ${failure.message}`);
    this.name = 'KernelFailureError';
    this.failure = failure;
  }
}

export function isKernelFailureError(value: unknown): value is KernelFailureError {
  return value instanceof KernelFailureError;
}

/**
 * Normalizes anything thrown inside the kernel into a typed failure. This is the function that
 * guarantees "no exception ever crosses the boundary" — including OCCT's Emscripten-marshalled
 * C++ exceptions, which arrive as opaque values rather than JS Errors.
 */
export function toKernelFailure(thrown: unknown, op?: string): KernelFailure {
  if (thrown instanceof KernelFailureError) {
    return thrown.failure;
  }
  if (thrown instanceof Error) {
    return kernelFailure('INTERNAL', thrown.message, {
      ...(op !== undefined ? { op } : {}),
      detail: { name: thrown.name },
    });
  }
  // OCCT/Emscripten exceptions are frequently a bare number (a pointer) or a string.
  return kernelFailure('OCCT_STANDARD_FAILURE', String(thrown), {
    ...(op !== undefined ? { op } : {}),
  });
}
