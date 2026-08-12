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

          // ✅ FIXED — was matching on loose substrings like
          // id.includes('/react/'), which also matched unrelated
          // packages that happen to have "/react/" somewhere in their
          // internal file path. That put files claimed by two different
          // chunk rules, and those chunks ended up importing from each
          // other (the "Circular chunk: vendor -> vendor-react ->
          // vendor" warning). Extracting the actual top-level package
          // name and matching on that exactly avoids the overlap.
          const afterNodeModules = id.split('node_modules/').pop();
          const segments = afterNodeModules.split('/');
          const pkg = segments[0].startsWith('@')
            ? `${segments[0]}/${segments[1]}`
            : segments[0];

          if (pkg === 'firebase' || pkg.startsWith('@firebase')) return 'vendor-firebase';
          if (['jspdf', 'html2canvas', 'canvg'].includes(pkg)) return 'vendor-pdf';
          if (pkg.startsWith('react-router')) return 'vendor-router';
          if (pkg === 'recharts' || pkg === 'chart.js' || pkg === 'd3') return 'vendor-charts';
          if (pkg === 'lucide-react' || pkg.startsWith('react-icons')) return 'vendor-icons';
          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') return 'vendor-react';

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