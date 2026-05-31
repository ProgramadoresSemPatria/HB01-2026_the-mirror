import { defineConfig } from "prisma/config";
import "dotenv/config";

const getEscapedDatabaseUrl = (): string => {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return "";

  try {
    if (!rawUrl.startsWith("postgresql://") && !rawUrl.startsWith("postgres://")) {
      return rawUrl;
    }

    const prefix = rawUrl.startsWith("postgresql://") ? "postgresql://" : "postgres://";
    const remainder = rawUrl.substring(prefix.length);

    // Find the last '@' separating credentials from host
    const lastAtIndex = remainder.lastIndexOf("@");
    if (lastAtIndex === -1) return rawUrl;

    const credentials = remainder.substring(0, lastAtIndex);
    let hostAndDb = remainder.substring(lastAtIndex + 1);

    // Auto-swap port from 6543 (transaction pooling) to 5432 (direct/session mode for migrations)
    hostAndDb = hostAndDb.replace(":6543", ":5432");
    // Strip pgbouncer query parameter
    hostAndDb = hostAndDb.split("?")[0];

    const colonIndex = credentials.indexOf(":");
    if (colonIndex === -1) return rawUrl;

    const username = credentials.substring(0, colonIndex);
    const password = credentials.substring(colonIndex + 1);

    // URL encode the password to safely escape special characters like '@', '#', etc.
    const escapedPassword = encodeURIComponent(password);

    const connectionString = `${prefix}${username}:${escapedPassword}@${hostAndDb}`;
    return connectionString;
  } catch (err) {
    console.error("[Prisma Config] Error parsing DATABASE_URL:", err);
    return rawUrl;
  }
};

const connectionUrl = getEscapedDatabaseUrl();
console.log("[Prisma Config] Successfully parsed and auto-routed to session mode port 5432.");

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: connectionUrl,
  },
});
