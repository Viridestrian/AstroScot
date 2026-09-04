import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    react(),
    {
      name: 'copy-msa-icon',
      generateBundle() {
        const source = readFileSync(new URL('../../MSA-icon.PNG', import.meta.url));
        this.emitFile({ type: 'asset', fileName: 'MSA-icon.PNG', source });
      },
    },
  ],
});
