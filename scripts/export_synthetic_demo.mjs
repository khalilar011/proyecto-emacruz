import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { demoIncidentSequence } from "../supabase/functions/_shared/mining-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/data/distrito-2.json"), "utf8"));
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1] || "") : null;
if (outputIndex >= 0 && !process.argv[outputIndex + 1]) throw new Error("--output requiere una ruta NDJSON");

const count = 1_000_000;
const seed = 20261111;
const expectedStart = "2005-01-01";
const expectedEnd = "2026-11-19";
const hash = createHash("sha256");
const output = outputPath ? fs.createWriteStream(outputPath, { encoding: "utf8" }) : null;
let generated = 0;
let firstDate = null;
let lastDate = null;

for (const row of demoIncidentSequence(catalog, { count, seed })) {
  generated += 1;
  assert.equal(row.id, `DEMO-${String(generated).padStart(7, "0")}`);
  assert.ok(row.analysis_date >= expectedStart && row.analysis_date <= expectedEnd);
  assert.ok(row.affected_service_ids.length > 0);
  assert.ok(row.affected_neighborhood_ids.length > 0);
  assert.ok(row.affected_truck_ids.length > 0);
  if (!firstDate || row.analysis_date < firstDate) firstDate = row.analysis_date;
  if (!lastDate || row.analysis_date > lastDate) lastDate = row.analysis_date;
  const exported = {
    id: row.id,
    fecha: row.analysis_date,
    barrios: row.affected_neighborhood_ids,
    camiones: row.affected_truck_ids,
    servicios: row.affected_service_ids,
    motivo: row.reason_code,
    estado: row.state,
    demora_estimada_minutos: row.estimated_delay_minutes,
  };
  const line = `${JSON.stringify(exported)}\n`;
  hash.update(line);
  if (output && !output.write(line)) await once(output, "drain");
}

if (output) {
  output.end();
  await once(output, "finish");
}

assert.equal(generated, count);
assert.equal(firstDate, expectedStart);
assert.equal(lastDate, expectedEnd);

console.log(JSON.stringify({
  seed,
  generated,
  firstDate,
  lastDate,
  firstId: "DEMO-0000001",
  lastId: "DEMO-1000000",
  sha256: hash.digest("hex"),
  output: outputPath,
}, null, 2));
