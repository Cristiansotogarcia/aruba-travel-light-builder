// Deno global types for Supabase Edge Functions
declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }
    const env: Env;

    function serve(
      handler: (request: Request, info?: { remoteAddr: { transport: string; hostname: string; port: number } }) => Response | Promise<Response>,
      options?: {
        port?: number;
        hostname?: string;
        key?: string;
        cert?: string;
        signal?: AbortSignal;
      }
    ): Promise<void>;
  }
}

export {};
