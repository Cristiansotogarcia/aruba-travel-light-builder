/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
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
        },
    },
    build: {
        modulePreload: {
            resolveDependencies: (url, deps, { hostType }) => {
                if (hostType === "html") {
                    return deps.filter((dep) => !/admin-(core|reports)/.test(dep)
                        && !/editor-lib/.test(dep)
                        && !/charts-lib/.test(dep)
                        && !/maps-lib/.test(dep));
                }
                return deps;
            },
        },
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    const normalizedId = id.replace(/\\/g, "/");
                    const isNodeModule = normalizedId.includes("/node_modules/");
                    // React core (avoid circular chunking)
                    if (isNodeModule &&
                        (normalizedId.includes("/node_modules/react/") ||
                            normalizedId.includes("/node_modules/react-dom/") ||
                            normalizedId.includes("/node_modules/react-is/") ||
                            normalizedId.includes("/node_modules/scheduler/"))) {
                        return "react-vendor";
                    }
                    if (normalizedId.includes("react-router")) {
                        return "react-router";
                    }
                    // Radix UI components - split into very small chunks to avoid large bundles
                    if (normalizedId.includes("@radix-ui")) {
                        if (normalizedId.includes("react-dialog") || normalizedId.includes("react-dropdown-menu")
                            || normalizedId.includes("react-popover") || normalizedId.includes("react-tooltip")) {
                            return "radix-overlays";
                        }
                        if (normalizedId.includes("react-select") || normalizedId.includes("react-accordion")
                            || normalizedId.includes("react-tabs") || normalizedId.includes("react-navigation-menu")) {
                            return "radix-navigation";
                        }
                        if (normalizedId.includes("react-checkbox") || normalizedId.includes("react-radio")
                            || normalizedId.includes("react-switch") || normalizedId.includes("react-slider")
                            || normalizedId.includes("react-progress")) {
                            return "radix-form-controls";
                        }
                        if (normalizedId.includes("react-separator") || normalizedId.includes("react-scroll-area")
                            || normalizedId.includes("react-aspect-ratio") || normalizedId.includes("react-collapsible")) {
                            return "radix-layout";
                        }
                        if (normalizedId.includes("react-toast") || normalizedId.includes("react-alert-dialog")
                            || normalizedId.includes("react-hover-card")) {
                            return "radix-feedback";
                        }
                        // Core primitives - split smaller
                        return "radix-core";
                    }
                    // Icons - split lucide icons into smaller chunks
                    if (normalizedId.includes("lucide-react")) {
                        return "lucide-icons";
                    }
                    // Data management - split further
                    if (normalizedId.includes("@tanstack/react-query")) {
                        return "react-query";
                    }
                    if (normalizedId.includes("@supabase/supabase-js")) {
                        return "supabase";
                    }
                    // Forms - split libraries
                    if (normalizedId.includes("react-hook-form") || normalizedId.includes("@hookform/resolvers")) {
                        return "forms";
                    }
                    if (normalizedId.includes("zod")) {
                        return "forms-validation";
                    }
                    // Heavy libraries are already dynamically imported; let Rollup decide chunking.
                    // Date utilities - split date-fns more aggressively
                    // This will help with the locale issue
                    if (normalizedId.includes("date-fns")) {
                        if (normalizedId.includes("locale")) {
                            return "date-locales";
                        }
                        return "date-utils";
                    }
                    // UI utilities
                    if (normalizedId.includes("clsx") || normalizedId.includes("class-variance-authority")
                        || normalizedId.includes("tailwind-merge") || normalizedId.includes("tailwindcss-animate")) {
                        return "ui-utils";
                    }
                    // Other utilities - split smaller
                    if (normalizedId.includes("papaparse") || normalizedId.includes("dompurify")) {
                        return "data-utils";
                    }
                    if (normalizedId.includes("next-themes") || normalizedId.includes("sonner")
                        || normalizedId.includes("vaul") || normalizedId.includes("cmdk") || normalizedId.includes("input-otp")) {
                        return "ui-enhancements";
                    }
                    if (normalizedId.includes("embla-carousel-react") || normalizedId.includes("react-day-picker")
                        || normalizedId.includes("react-resizable-panels")) {
                        return "interactive-components";
                    }
                    // Force admin components into separate chunks
                    if (normalizedId.includes("src/components/admin") || normalizedId.includes("src/pages/Admin")) {
                        if (normalizedId.includes("ReportsDashboard") || normalizedId.includes("EnhancedReportsDashboard")) {
                            return "admin-reports";
                        }
                        return "admin-core";
                    }
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts', // or path to your setup file
        css: true, // if you want to process CSS in tests
    },
}));
