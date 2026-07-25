/** Entry point for the storage self-check page (`storage-check.html`). */

import { createRoot } from 'react-dom/client';

import { StorageCheckPage } from './StorageCheckPage';

const container = document.getElementById('root');
if (container === null) throw new Error('#root not found');

createRoot(container).render(<StorageCheckPage />);
