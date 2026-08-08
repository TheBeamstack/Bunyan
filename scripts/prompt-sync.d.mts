/**
 * Types for `prompt-sync.mjs`.
 *
 * ⚠ Same reason as `frozen-surface.d.mts`: the implementation stays plain Node ESM so the gate can run
 * with `node scripts/…` and no build step. The declarations live here so `tests/prompt-sync.test.ts`
 * still typechecks under `strict`.
 */

/** The prompt files the gate governs. ⚠ `Amer_Prompt.md` is Amer's to add — see the `.mjs` header. */
export declare const GATED: readonly string[];

/**
 * `skipped` is set when the comparison is not yet meaningful — the branch does not author the file, or
 * loop step 10(a) has not pushed it to main yet. `ok: false` carries the drift and is the defect.
 */
export type PromptSyncVerdict =
  | { ok: true; skipped?: string; file?: undefined; main?: undefined; drift?: undefined }
  | { ok: false; skipped?: undefined; file: string; main: string; drift: string };

/** Does `ref` resolve to a commit in this repository? */
export declare function resolves(ref: string, cwd?: string): boolean;

/** `BASE_REF` in CI, `origin/main` locally, `undefined` when neither is available (a skip). */
export declare function mainRef(env?: NodeJS.ProcessEnv, cwd?: string): string | undefined;

/**
 * The PR's real head SHA (`HEAD_REF`) or `HEAD`. ⚠ On a `pull_request` event CI checks out a MERGE
 * commit, which contains main — so using `HEAD` there disables the gate. Throws on an unresolvable ref.
 */
export declare function headRef(env?: NodeJS.ProcessEnv, cwd?: string): string;

/** The verdict for ONE file. See the `.mjs` header for the three questions it asks, in order. */
export declare function promptSync(
  file: string,
  options?: { main?: string | undefined; head?: string; cwd?: string },
): PromptSyncVerdict;

/** The message a failure prints — it names the fix, because the cause is invisible in the symptom. */
export declare function explain(verdict: PromptSyncVerdict): string;
