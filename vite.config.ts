import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import { fileURLToPath } from 'url';

export default defineConfig(() => {
  return {
    clearScreen: false,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Separa bibliotecas pesadas em chunks próprios: melhora cache entre deploys
          // e permite que gráficos/MQTT/Supabase carreguem em paralelo ou sob demanda.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|recharts-scale|decimal\.js-light)[\\/]/.test(id)) {
              return 'charts';
            }
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'react-vendor';
            }
            if (/[\\/]node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) {
              return 'motion';
            }
            if (id.includes('@supabase')) return 'supabase';
            if (/[\\/]node_modules[\\/]mqtt[\\/]/.test(id)) return 'mqtt';
            return undefined;
          },
        },
      },
    },
    server: {
      port: 3000,
      strictPort: false,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR and internal WS server are disabled in AI Studio preview to prevent WebSocket/port 24678/5173 errors.
      hmr: false,
      ws: false as const,
      watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
    },
    preview: {
      port: 3000,
      strictPort: false,
      host: '0.0.0.0',
      allowedHosts: true as const,
    },
  };
});

