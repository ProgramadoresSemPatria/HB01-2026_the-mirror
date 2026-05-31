import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import envService from "../services/env.service";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

const getEscapedDatabaseUrl = (rawUrl: string | undefined): string => {
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
    const hostAndDb = remainder.substring(lastAtIndex + 1);

    const colonIndex = credentials.indexOf(":");
    if (colonIndex === -1) return rawUrl;

    const username = credentials.substring(0, colonIndex);
    const password = credentials.substring(colonIndex + 1);

    // URL encode the password to safely escape special characters like '@', '#', etc.
    const escapedPassword = encodeURIComponent(password);

    return `${prefix}${username}:${escapedPassword}@${hostAndDb}`;
  } catch (err) {
    console.error("[Prisma Client Init] Error parsing DATABASE_URL:", err);
    return rawUrl || "";
  }
};

const getPrismaInstance = (): PrismaClient => {
  // Use DATABASE_URL for runtime transactions, falling back to DIRECT_URL
  const rawUrl = envService.getEnv("DATABASE_URL") || envService.getEnv("DIRECT_URL");

  if (!rawUrl) {
    throw new Error("DATABASE_URL/DIRECT_URL environment variable is required");
  }

  const connectionString = getEscapedDatabaseUrl(rawUrl);
  console.log("[Prisma Client Init] Initializing pg Pool with escaped connection string.");

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter });
};

const prisma = globalForPrisma.prisma || getPrismaInstance();

if (envService.getEnv("NODE_ENV") !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
