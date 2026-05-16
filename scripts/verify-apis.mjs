#!/usr/bin/env node
/**
 * Verify IranCrypto API + recap fallbacks used by the scheduler.
 * Usage: node -r dotenv/config scripts/verify-apis.mjs
 */
import { getPopular, getRecap, getExchanges } from "../src/api.js";
import { isDataValid } from "../src/util.js";

function report(label, data) {
  const valid = isDataValid(data, label);
  const iran = Array.isArray(data) ? data.filter((i) => i.has_iran).length : 0;
  console.log(`\n${label}: ${valid ? "OK" : "INVALID"} | rows=${data?.length ?? 0} | has_iran=${iran}`);
  return valid;
}

async function main() {
  if (!process.env.IRANCRYPTO_API_KEY) {
    console.error("Set IRANCRYPTO_API_KEY in .env or the environment");
    process.exit(1);
  }

  console.log("IranCrypto API verification\n===========================");

  const popular = await getPopular();
  report("popular (telegram/twitter)", popular);

  const recapWeekly = await getRecap("coin", "weekly");
  const recapWeeklyOk = report("recap coin weekly", recapWeekly);

  if (!recapWeeklyOk && report("popular fallback for weekly IG", popular)) {
    console.log("→ Scheduler would use popular fallback for weekly Instagram");
  }

  const recapMonthly = await getRecap("exchange", "monthly");
  const recapMonthlyOk = report("recap exchange monthly", recapMonthly);

  const exchanges = await getExchanges();
  if (!recapMonthlyOk && report("exchanges fallback for monthly IG", exchanges)) {
    console.log("→ Scheduler would use exchanges fallback for monthly Instagram");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
