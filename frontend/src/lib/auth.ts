import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const database = new Pool({
  connectionString: databaseUrl,
});

function getTrustedOrigins(): string[] {
  const origins: string[] = [];

  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  // Add the known production URL
  origins.push("https://simba-frontend-two.vercel.app");

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000");
  }

  return origins;
}

export const auth = betterAuth({
  database,
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  plugins: [
    organization(),
  ],
});

const shouldRunMigrations =
  process.env.NODE_ENV !== "production" &&
  process.env.BETTER_AUTH_AUTO_MIGRATE !== "false";

let migrationsPromise: Promise<void> | null = null;

export const ensureAuthMigrations = async (): Promise<void> => {
  if (!shouldRunMigrations) {
    return;
  }

  if (!migrationsPromise) {
    migrationsPromise = auth.$context.then(async (context) => {
      const contextWithMigrations = context as {
        runMigrations?: () => Promise<void>;
      };

      if (typeof contextWithMigrations.runMigrations === "function") {
        await contextWithMigrations.runMigrations();
      }
    });
  }

  await migrationsPromise;
};

export type Session = typeof auth.$Infer.Session;
