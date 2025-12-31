// lib/db.ts
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing NEON_DATABASE_URL env variable");
}

export const db = neon(connectionString);