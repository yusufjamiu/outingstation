import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['canvg', 'jspdf', 'html2canvas']
  },
  build: {
    // ✅ NEW — splits big third-party libraries into their own chunks
    // instead of all landing in the single main JS file. Route-level
    // code-splitting (App.jsx's React.lazy() conversion) handles YOUR
    // page code; this handles vendor code, since e.g. Firebase and the
    // PDF/canvas libs (jspdf/html2canvas/canvg — likely only used on a
    // ticket or export page) are large enough on their own to matter.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg')) {
            return 'vendor-pdf';
          }
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('recharts') || id.includes('chart.js') || id.includes('d3')) {
            return 'vendor-charts';
          }
          if (id.includes('lucide-react') || id.includes('react-icons')) {
            return 'vendor-icons';
          }
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';

          // Everything else in node_modules — smaller, shared utility
          // libs — grouped into one general vendor chunk.
          return 'vendor';
        },
      },
    },
    // Raised from the 500kB default now that intentional vendor chunks
    // (e.g. vendor-firebase) are expected to land a bit above that on
    // their own — this just stops the warning from firing on chunks
    // that were deliberately split out, not silencing a real problem.
    chunkSizeWarningLimit: 700,
  },
})