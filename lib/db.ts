// lib/db.ts
// ═══════════════════════════════════════════════════════════════
// THIS IS THE ONLY FILE YOU CHANGE WHEN SWITCHING TO PRODUCTION
// ═══════════════════════════════════════════════════════════════

import { DatabaseAdapter } from "./db-interface";
import { localAdapter } from "./db-local-adapter";

// ─── LOCAL / DEVELOPMENT ───
export const db: DatabaseAdapter = localAdapter;

// ─── PRODUCTION (uncomment when ready) ───
// import { createPostgresAdapter } from "./db-postgres-adapter";
// export const db: DatabaseAdapter = createPostgresAdapter(process.env.DATABASE_URL!);

// ─── OR MONGODB (uncomment when ready) ───
// import { createMongoAdapter } from "./db-mongo-adapter";
// export const db: DatabaseAdapter = createMongoAdapter(process.env.MONGODB_URI!);