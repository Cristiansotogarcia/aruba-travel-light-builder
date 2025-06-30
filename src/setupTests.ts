// src/setupTests.ts
import '@testing-library/jest-dom';

// Provide dummy Supabase env vars for tests
process.env.VITE_PUBLIC_SUPABASE_URL ||= 'http://localhost';
process.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||= 'anon-key';
