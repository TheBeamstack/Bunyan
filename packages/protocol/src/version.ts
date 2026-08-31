// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The protocol version carried by every request and response.
 *
 * Bumped only by the Architect. It freezes at the end of P3 (decision D13); after that,
 * any change to the wire shape is a breaking change requiring sign-off, because the whole
 * point of this seam is that a future server-side or native kernel can implement it unchanged.
 */
export const PROTOCOL_VERSION = 1;

/** A client and a kernel can talk only if they agree on the major protocol version. */
export function isCompatibleProtocol(theirVersion: number): boolean {
  return theirVersion === PROTOCOL_VERSION;
}
