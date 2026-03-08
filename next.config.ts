import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Ensure .env.local is loaded before reading env (Turbopack/cwd can leave process.env empty)
loadEnvConfig(process.cwd());

function readEnvLocal(key: string): string | undefined {
  const raw = process.env[key];
  if (raw) return raw;
  // Resolve .env.local from config file location so it works regardless of cwd
  const envPath = join(__dirname, ".env.local");
  if (!existsSync(envPath)) return undefined;
  try {
    const content = readFileSync(envPath, "utf8");
    const line = content.split(/\r?\n/).find((l) => new RegExp(`^\\s*${key}\\s*=`).test(l.trim()));
    if (!line) return undefined;
    return line.replace(new RegExp(`^\\s*${key}\\s*=\\s*`), "").trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['tesseract.js'],
  // Expose env to API routes and client (Next/Turbopack may not pass .env.local to all workers)
  env: {
    IMEIDB_API_TOKEN: process.env.IMEIDB_API_TOKEN,
    GOOGLE_CALENDAR_CLIENT_ID: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    NEXT_PUBLIC_SUPABASE_URL: readEnvLocal("NEXT_PUBLIC_SUPABASE_URL") ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
