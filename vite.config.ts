/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { Buffer } from 'buffer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "dompurify": path.resolve(__dirname, "./src/lib/dompurify.ts"),
      'crypto': 'crypto-browserify',
      'buffer': 'buffer/',
    },
  },
  define: {
    'globalThis.Buffer': Buffer,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('react') && id.includes('react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('react-router')) {
            return 'react-router';
          }

          // Radix UI components - split into very small chunks to avoid large bundles
          if (id.includes('@radix-ui')) {
            if (id.includes('react-dialog') || id.includes('react-dropdown-menu') ||
                id.includes('react-popover') || id.includes('react-tooltip')) {
              return 'radix-overlays';
            }
            if (id.includes('react-select') || id.includes('react-accordion') ||
                id.includes('react-tabs') || id.includes('react-navigation-menu')) {
              return 'radix-navigation';
            }
            if (id.includes('react-checkbox') || id.includes('react-radio') ||
                id.includes('react-switch') || id.includes('react-slider') ||
                id.includes('react-progress')) {
              return 'radix-form-controls';
            }
            if (id.includes('react-separator') || id.includes('react-scroll-area') ||
                id.includes('react-aspect-ratio') || id.includes('react-collapsible')) {
              return 'radix-layout';
            }
            if (id.includes('react-toast') || id.includes('react-alert-dialog') ||
                id.includes('react-hover-card')) {
              return 'radix-feedback';
            }
            // Core primitives - split smaller
            return 'radix-core';
          }

          // Icons - split lucide icons into smaller chunks
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }

          // Data management - split further
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }

          // Forms - split libraries
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers')) {
            return 'forms';
          }
          if (id.includes('zod')) {
            return 'forms-validation';
          }

          // Heavy libraries - make these load on-demand wherever possible
          // Note: recharts, leaflet, editor are already dynamically imported
          if (id.includes('recharts')) {
            return 'charts-lib';
          }
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'maps-lib';
          }
          if (id.includes('@uiw/react-md-editor')) {
            return 'editor-lib';
          }

          // Date utilities - split date-fns more aggressively
          // This will help with the locale issue
          if (id.includes('date-fns')) {
            if (id.includes('locale')) {
              return 'date-locales';
            }
            return 'date-utils';
          }

          // UI utilities
          if (id.includes('clsx') || id.includes('class-variance-authority') ||
              id.includes('tailwind-merge') || id.includes('tailwindcss-animate')) {
            return 'ui-utils';
          }

          // Other utilities - split smaller
          if (id.includes('papaparse') || id.includes('dompurify')) {
            return 'data-utils';
          }
          if (id.includes('next-themes') || id.includes('sonner') ||
              id.includes('vaul') || id.includes('cmdk') || id.includes('input-otp')) {
            return 'ui-enhancements';
          }
          if (id.includes('embla-carousel-react') || id.includes('react-day-picker') ||
              id.includes('react-resizable-panels')) {
            return 'interactive-components';
          }

          // Force admin components into separate chunks
          if (id.includes('src/components/admin') || id.includes('src/pages/Admin')) {
            if (id.includes('ReportsDashboard') || id.includes('EnhancedReportsDashboard')) {
              return 'admin-reports';
            }
            return 'admin-core';
          }
        }
      }
    },
    // Increase chunk size warning limit to 1MB for this feature-rich application
    // Modern web applications commonly have bundles this size with many features
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts', // or path to your setup file
    css: true, // if you want to process CSS in tests
  },
}));
