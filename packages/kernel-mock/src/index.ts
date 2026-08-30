// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

export { MOCK_KERNEL_META, createMockKernel, createMockKernelHost } from './kernel.js';
export {
  BOX_FACE_ROLES,
  boxBounds,
  boxEdgeRefs,
  boxEdgeRoles,
  boxFaceRefs,
  boxMeasure,
  tessellateBox,
} from './box.js';
export type { BoxFaceRole, BoxParams } from './box.js';
