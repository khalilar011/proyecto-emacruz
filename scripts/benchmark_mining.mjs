import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { analyzeDemoDataset } from "../supabase/functions/_shared/mining-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/data/distrito-2.json"), "utf8"));
const started = performance.now();
const result = analyzeDemoDataset({ catalog, seed: 20261111, count: 1_000_000 });
const elapsedMs = performance.now() - started;
const maxRssKiB = process.resourceUsage().maxRSS;

assert.equal(result.record_count, 1_000_000);
assert.equal(result.transaction_count, 1_000_000);
assert.equal(result.indicators.synthetic_unique_ids, 1_000_000);
assert.deepEqual(result.period, { start: "2026-01-05", end: "2026-07-05" });
assert.ok(result.rules.length > 0);

console.log(JSON.stringify({
  seed: result.indicators.synthetic_seed,
  generatedRecords: result.indicators.synthetic_records_generated,
  analyzedTransactions: result.transaction_count,
  compressedTransactionProfiles: result.indicators.compressed_transaction_profiles,
  rules: result.rule_count,
  period: result.period,
  elapsedMs: Math.round(elapsedMs * 100) / 100,
  maxRssMiB: Math.round((maxRssKiB / 1024) * 100) / 100,
}, null, 2));
