/**
 * Entry point for the scale harness page (`scale.html`, plan P4 step 9b).
 *
 * ⚠ Deliberately NOT wrapped in `<StrictMode>`. StrictMode double-invokes mount effects to surface impure
 * setup — but the scale measurement boots a 14 MB kernel and builds thousands of meshes, and running it
 * twice would double the box's memory pressure and confuse the numbers. The measurement must run once.
 */

import { createRoot } from 'react-dom/client';

import { ScalePage } from './ScalePage';

const container = document.getElementById('root');
if (container === null) throw new Error('#root not found');

createRoot(container).render(<ScalePage />);
