/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins: Plugin[] = [react() as unknown as Plugin];

  if (mode === 'development') {
    plugins.push(componentTagger() as unknown as Plugin);
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "dompurify": path.resolve(__dirname, "./src/lib/dompurify.ts"),
      },
    },
    build: {
      modulePreload: {
        resolveDependencies: (url: string, deps: string[], context: { hostType: string }) => {
          if (context.hostType === "html") {
            return deps.filter(
              (dep: string) =>
                !/admin-(core|reports)/.test(dep) &&
                !/editor-lib/.test(dep) &&
                !/charts-lib/.test(dep) &&
                !/maps-lib/.test(dep)
            );
          }
          return deps;
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            const normalizedId = id.replace(/\\/g, "/");
            const isNodeModule = normalizedId.includes("/node_modules/");
            
            // React core - bundle with Radix to avoid forwardRef issues
            if (
              isNodeModule &&
              (normalizedId.includes("/node_modules/react/") ||
                normalizedId.includes("/node_modules/react-dom/") ||
                normalizedId.includes("/node_modules/react-is/") ||
                normalizedId.includes("/node_modules/scheduler/"))
            ) {
              return "react-vendor";
            }
            if (normalizedId.includes('react-router')) {
              return 'react-router';
            }

            // Radix UI - bundle ALL radix packages with React vendor
            if (normalizedId.includes('@radix-ui')) {
              return 'radix-ui';
            }

            // Icons - split lucide icons into smaller chunks
            if (normalizedId.includes('lucide-react')) {
              return 'lucide-icons';
            }

            // Recharts - charting library is heavy
            if (normalizedId.includes('recharts')) {
              return 'recharts-vendor';
            }

            // Leaflet/React-Leaflet - map libraries
            if (normalizedId.includes('leaflet') || normalizedId.includes('react-leaflet')) {
              return 'maps-lib';
            }

            // MD Editor - rich text editor
            if (normalizedId.includes('@uiw/react-md-editor') || normalizedId.includes('@mdxeditor')) {
              return 'md-editor';
            }

            // DnD Kit - drag and drop
            if (normalizedId.includes('@dnd-kit')) {
              return 'dnd-kit';
            }

            // Data management - split further
            if (normalizedId.includes('@tanstack/react-query')) {
              return 'react-query';
            }
            if (normalizedId.includes('@supabase/supabase-js')) {
              return 'supabase';
            }

            // Forms - split libraries
            if (normalizedId.includes('react-hook-form') || normalizedId.includes('@hookform/resolvers')) {
              return 'forms';
            }
            if (normalizedId.includes('zod')) {
              return 'forms-validation';
            }

            // Date utilities - split date-fns more aggressively
            if (normalizedId.includes('date-fns')) {
              if (normalizedId.includes('locale')) {
                return 'date-locales';
              }
              return 'date-utils';
            }

            // UI utilities
            if (normalizedId.includes('clsx') || normalizedId.includes('class-variance-authority') ||
                normalizedId.includes('tailwind-merge') || normalizedId.includes('tailwindcss-animate')) {
              return 'ui-utils';
            }

            // Other utilities - split smaller
            if (normalizedId.includes('papaparse') || normalizedId.includes('dompurify')) {
              return 'data-utils';
            }
            if (normalizedId.includes('next-themes') || normalizedId.includes('sonner') ||
                normalizedId.includes('vaul') || normalizedId.includes('cmdk') || normalizedId.includes('input-otp')) {
              return 'ui-enhancements';
            }
            if (normalizedId.includes('embla-carousel-react') || normalizedId.includes('react-day-picker') ||
                normalizedId.includes('react-resizable-panels')) {
              return 'interactive-components';
            }

            // Force admin components into separate chunks
            if (normalizedId.includes('src/components/admin') || normalizedId.includes('src/pages/Admin')) {
              if (normalizedId.includes('ReportsDashboard') || normalizedId.includes('EnhancedReportsDashboard')) {
                return 'admin-reports';
              }
              return 'admin-core';
            }
          }
        }
      },
      chunkSizeWarningLimit: 5000,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: true,
    },
  };
});
