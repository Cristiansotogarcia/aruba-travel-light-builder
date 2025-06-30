var _a, _b;
// src/setupTests.ts
import '@testing-library/jest-dom';
// Provide dummy Supabase env vars for tests
(_a = process.env).VITE_PUBLIC_SUPABASE_URL || (_a.VITE_PUBLIC_SUPABASE_URL = 'http://localhost');
(_b = process.env).VITE_PUBLIC_SUPABASE_ANON_KEY || (_b.VITE_PUBLIC_SUPABASE_ANON_KEY = 'anon-key');
