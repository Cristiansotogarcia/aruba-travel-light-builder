// Deno global types for Supabase Edge Functions
declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }
    const env: Env;
  }

  // Standard global objects that should be available in Deno
  const JSON: {
    parse(text: string): any;
    stringify(value: any): string;
  };

  const Object: {
    fromEntries<T = any>(entries: Iterable<readonly [PropertyKey, T]>): { [k: string]: T };
  };

  class Error {
    name: string;
    message: string;
    constructor(message?: string);
  }

  interface Headers {
    entries(): IterableIterator<[string, string]>;
    get(name: string): string | null;
  }

  interface Request {
    method: string;
    url: string;
    headers: Headers;
  }

  interface Response {
    ok: boolean;
    status: number;
    statusText: string;
    json(): Promise<any>;
  }

  interface ResponseInit {
    status?: number;
    statusText?: string;
    headers?: HeadersInit;
  }

  type HeadersInit = Record<string, string> | [string, string][] | Headers;

  const Response: {
    new(body?: BodyInit | null, init?: ResponseInit): Response;
  };

  const URL: {
    new(url: string, base?: string | URL): URL;
  };

  interface URL {
    searchParams: URLSearchParams;
  }

  const URLSearchParams: {
    new(init?: string | string[][] | Record<string, string>): URLSearchParams;
  };

  interface URLSearchParams {
    get(name: string): string | null;
    toString(): string;
  }

  function fetch(input: string | Request, init?: RequestInit): Promise<Response>;

  interface RequestInit {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit;
  }

  type BodyInit = string | ArrayBuffer | ArrayBufferView | Blob | FormData | URLSearchParams;

  const console: {
    log(...args: any[]): void;
    error(...args: any[]): void;
  };
}

export {};
