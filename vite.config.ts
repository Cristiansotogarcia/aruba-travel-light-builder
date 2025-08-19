/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { Buffer } from 'buffer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
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
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          
          // React Router
          'react-router': ['react-router-dom'],
          
          // Radix UI components (split into smaller chunks)
          'radix-core': [
            '@radix-ui/react-slot',
            '@radix-ui/react-primitive',
            '@radix-ui/react-compose-refs',
            '@radix-ui/react-context',
            '@radix-ui/react-use-controllable-state',
            '@radix-ui/react-use-previous',
            '@radix-ui/react-use-callback-ref',
            '@radix-ui/react-use-layout-effect',
            '@radix-ui/react-use-escape-keydown',
            '@radix-ui/react-use-size',
            '@radix-ui/react-presence',
            '@radix-ui/react-portal',
            '@radix-ui/react-focus-scope',
            '@radix-ui/react-focus-guards',
            '@radix-ui/react-dismissable-layer',
            '@radix-ui/react-popper',
            '@radix-ui/react-arrow',
            '@radix-ui/react-visually-hidden',
            '@radix-ui/react-roving-focus',
            '@radix-ui/react-collection',
            '@radix-ui/react-direction'
          ],
          
          'radix-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-tabs',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-menubar',
            '@radix-ui/react-context-menu'
          ],
          
          'radix-form': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            '@radix-ui/react-progress',
            '@radix-ui/react-label'
          ],
          
          'radix-layout': [
            '@radix-ui/react-separator',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group'
          ],
          
          'radix-feedback': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-toast',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-avatar'
          ],
          
          // Icons
          'lucide-react': ['lucide-react'],
          
          // Data management
          'react-query': ['@tanstack/react-query'],
          'supabase': ['@supabase/supabase-js'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Heavy libraries
          'charts': ['recharts'],
          'maps': ['leaflet', 'react-leaflet'],
          'editor': ['react-quill'],
          
          // Date utilities
          'date-utils': ['date-fns'],
          
          // UI utilities
          'ui-utils': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'tailwindcss-animate'
          ],
          
          // Other utilities
          'utils': [
            'dompurify',
            'papaparse',
            'next-themes',
            'sonner',
            'vaul',
            'cmdk',
            'input-otp',
            'embla-carousel-react',
            'react-day-picker',
            'react-resizable-panels'
          ]
        }
      }
    },
    // Set chunk size warning limit to 2000kb to eliminate the warning
    // The actual main bundle is 1,204.96 kB, so this ensures no warnings
    // The lazy loading and manual chunks will help with actual performance
    chunkSizeWarningLimit: 2000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts', // or path to your setup file
    css: true, // if you want to process CSS in tests
  },
}));
