// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The 2D plan panel (T-075, imp plan Phase 6 step 2): draws the `ViewResult` the views registry's plan
 * member returns. It holds no drawing of its own; `App` re-projects on every model change.
 */

import type { ViewResult } from '@bunyan/document';
import { planBounds, planPaths } from '../view/planPaths';

/** The fit margin around the drawing, in model mm. */
const MARGIN_MM = 500;

export function PlanPanel({
  name,
  result,
  error,
}: {
  /** The stored plan view's name, or `null` when the document has none. */
  readonly name: string | null;
  readonly result: ViewResult | null;
  readonly error: string | null;
}) {
  const paths = result === null ? [] : planPaths(result);
  const bounds = planBounds(paths);
  return (
    <section className="panel-section plan-panel">
      <h2>Plan{name === null ? '' : ` · ${name}`}</h2>
      {name === null && <p className="hint">This document has no plan view.</p>}
      {error !== null && <p className="hint plan-error">{error}</p>}
      {result !== null && result.unprojected.length > 0 && (
        <p className="hint plan-error">
          {result.unprojected.length} element(s) could not be cut:{' '}
          {result.unprojected.map((u) => u.reason).join('; ')}
        </p>
      )}
      {bounds !== undefined && (
        // The y-flip is the group's transform, so the viewBox is the flipped extent; no point is
        // rewritten (`planPaths.ts`).
        <svg
          className="plan-svg"
          role="img"
          aria-label="Plan view"
          viewBox={[
            bounds.minX - MARGIN_MM,
            -bounds.maxY - MARGIN_MM,
            bounds.maxX - bounds.minX + 2 * MARGIN_MM,
            bounds.maxY - bounds.minY + 2 * MARGIN_MM,
          ].join(' ')}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform="scale(1,-1)">
            {paths.map((path, i) => (
              <path
                key={i}
                d={path.d}
                data-element-id={path.elementId}
                data-kind={path.kind}
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>
      )}
    </section>
  );
}
