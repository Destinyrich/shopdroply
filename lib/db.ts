// lib/db.ts
// ═══════════════════════════════════════════════════════════════
// THIS IS THE ONLY FILE YOU CHANGE WHEN SWITCHING DATABASES
// ═══════════════════════════════════════════════════════════════

import { DatabaseAdapter } from "./db-interface";
import { createPostgresAdapter } from "./db-postgres-adapter";

// ─── PRODUCTION: PostgreSQL ───
export const db: DatabaseAdapter = createPostgresAdapter(process.env.DATABASE_URL!);

// ─── LOCAL / DEVELOPMENT (in-memory, resets on every restart) ───
// import { localAdapter } from "./db-local-adapter";
// export const db: DatabaseAdapter = localAdapter;

// ─── OR MONGODB ───
// import { createMongoAdapter } from "./db-mongo-adapter";
// export const db: DatabaseAdapter = createMongoAdapter(process.env.MONGODB_URI!);