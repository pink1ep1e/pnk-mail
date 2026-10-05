/**
 * Seed / refresh verified sender domains.
 * Usage: npx tsx scripts/seed-verified-domains.ts
 */
import { seedVerifiedDomains } from "../lib/verified-domains";

async function main() {
  const n = await seedVerifiedDomains();
  console.log(`Verified domains upserted: ${n}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
