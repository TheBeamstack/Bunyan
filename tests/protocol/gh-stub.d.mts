/** Types for `gh-stub.mjs` — the shared `gh` stand-in for `agent-start.test.ts`/`agent-finish.test.ts`. */

/** The `BUNYAN_GH_CMD` value naming the stand-in a `fakeGh*` call wrote into `dir`. */
export declare function ghCmdIn(dir: string): string;

/** A `gh` stand-in reporting `login` for `gh api user`, forwarding every other subcommand to the real
 * `gh` unchanged. Returns the directory to clean up. */
export declare function fakeGhReporting(login: string): string;

export interface StubbedPR {
  number: number;
  headRefName: string;
  title: string;
}

/** Like `fakeGhReporting`, but also stubs `gh pr list`/`pr comment`/`pr checkout`. Returns the
 * directory to clean up. */
export declare function fakeGhForReview(login: string, prs: StubbedPR[]): string;
