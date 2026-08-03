declare module "@supabase/ssr" {
  export type CookieOptions = {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
  };

  export type CookieRecord = {
    name: string;
    value: string;
    options?: CookieOptions;
  };

  export function createBrowserClient(url: string, key: string): any;
  export function createServerClient(
    url: string,
    key: string,
    options: {
      cookies: {
        getAll(): Array<{ name: string; value: string }>;
        setAll(cookiesToSet: CookieRecord[]): void;
      };
    },
  ): any;
}

declare module "@supabase/supabase-js" {
  export function createClient(url: string, key: string, options?: Record<string, unknown>): any;
}
