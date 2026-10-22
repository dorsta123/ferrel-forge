import { fileURLToPath } from "node:url";

// The repo's single .env (database, storage). Loaded once, before anything reads process.env.
if (!process.env.DATABASE_URL) process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));

export const BASE_URL = "http://localhost:3000";
