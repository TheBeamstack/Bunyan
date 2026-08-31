// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-003 — the in-app open-source licences screen.
 *
 * ⚠ WHY IT EXISTS: the OCCT LGPL exception (`NOTICE` §1) grants relief on ONE condition — a prominent
 * notice, in supporting documentation, that Bunyan makes use of OCCT. This screen is where that condition
 * is discharged for a running app, not only for someone reading the repo. `NOTICE` is rendered in full,
 * never summarised, and every `licenses/*.txt` follows below it — `licenseTexts.ts` sources both directly
 * from the repo-root files (headless-verified there), so there is nothing here to keep in sync by hand.
 *
 * A plain modal (the same `modal-backdrop`/`modal` shape `Ribbon`'s `CommandDialog` uses), reachable from
 * a header button — `App` owns the open/closed boolean, this component owns nothing.
 */

import { NOTICE_TEXT, LICENSE_TEXTS } from './licenseTexts';

export function LicensesScreen({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-label="Open-source licences"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h3>Open-source licences</h3>
        </header>
        <p className="modal-desc">
          Bunyan is AGPL-3.0-only plus a commercial licence (D15). This screen reproduces{' '}
          <code>NOTICE</code> and every third-party licence text this build redistributes, in full.
        </p>

        <section className="license-section">
          <h4>NOTICE</h4>
          <pre className="license-text">{NOTICE_TEXT}</pre>
        </section>

        {LICENSE_TEXTS.map((license) => (
          <section key={license.fileName} className="license-section">
            <h4>
              <code>licenses/{license.fileName}</code>
            </h4>
            <pre className="license-text">{license.text}</pre>
          </section>
        ))}

        <footer className="modal-footer">
          <button type="button" className="ribbon-button primary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
