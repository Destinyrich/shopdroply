// scripts/seed-postgres.ts
// One-time: copies the demo data from your in-memory LocalDB (demo buyer/seller,
// admin user, listings, orders, offers, disputes, payouts...) into Postgres.
//
// Run:  node --env-file=.env.local --import tsx scripts/seed-postgres.ts
// Refuses to run if the users table already has rows (pass --force to override;
// some demo rows get random ids on each run, so forcing can create duplicates).

import { Pool } from "pg";
import { ensureSchema } from "../lib/db-postgres-adapter";
import { localAdapter } from "../lib/db-local-adapter";

const local = localAdapter as any;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
  const pool = new Pool({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });

  await ensureSchema(pool);

  const { rows } = await pool.query("SELECT count(*)::int AS n FROM users");
  if (rows[0].n > 0 && !process.argv.includes("--force")) {
    console.log("Database already has users - skipping seed. (Use --force to run anyway.)");
    await pool.end();
    return;
  }

  const maps: [string, Map<string, any> | any[]][] = [
    ["users", local.users],
    ["listings", local.listings],
    ["orders", local.orders],
    ["bids", local.bids],
    ["watchlist", local.watchlist],
    ["notifications", local.notifications],
    ["escrows", local.escrows],
    ["payments", local.payments],
    ["earnings", local.earnings],
    ["activities", local.activities],
    ["payouts", local.payouts],
    ["offers", local.offers],
    ["disputes", local.disputes],
    ["reviews", local.reviews],
    ["banners", local.banners],
    ["categories", local.categories],
  ];

  // carts are Map<userId, CartItem[]> -> flatten
  const carts: any[] = [];
  for (const items of local.carts.values()) carts.push(...items);
  maps.push(["cart_items", carts]);

  for (const [table, source] of maps) {
    const docs: any[] = Array.isArray(source) ? source : Array.from(source.values());
    let inserted = 0;
    for (const doc of docs) {
      const r = await pool.query(
        `INSERT INTO ${table} (id, data) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [doc.id, JSON.stringify(doc)],
      );
      inserted += r.rowCount ?? 0;
    }
    console.log(`${table.padEnd(14)} ${inserted}/${docs.length} inserted`);
  }

  for (const [key, value] of [
    ["admin_roles", local.adminRoles],
    ["shipping_settings", local.shippingSettings],
    ["platform_settings", local.platformSettings],
  ]) {
    await pool.query(
      `INSERT INTO kv (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [key, JSON.stringify(value)],
    );
    console.log(`kv:${key}`.padEnd(14), "ok");
  }

  await pool.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});