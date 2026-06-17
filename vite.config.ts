import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true
  },
  // better-sqlite3 is a native module — keep it external instead of bundling.
  ssr: { external: ['better-sqlite3'] },
  optimizeDeps: { exclude: ['better-sqlite3'] }
});
