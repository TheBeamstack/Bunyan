/** Types for `fixture.mjs` — the throwaway protocol-test git repository. */

export interface BacklogRow {
  id: string;
  status: string;
  title: string;
  area: string;
  machine: string;
  risk: string;
  dependsOn?: string;
}

export interface Fixture {
  dir: string;
  origin: string;
  cleanup(): void;
}

export declare function makeFixture(rows?: BacklogRow[], options?: { measured?: boolean }): Fixture;

export declare const WATCHED: readonly string[];
