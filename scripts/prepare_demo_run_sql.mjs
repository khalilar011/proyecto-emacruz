import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeDemoDataset } from "../supabase/functions/_shared/mining-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1] || "") : null;
if (!outputPath) throw new Error("Usa --output con una ruta temporal para el SQL agregado");
const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || null : null;
};
const startDate = argument("--start");
const endDate = argument("--end");
if (Boolean(startDate) !== Boolean(endDate)) throw new Error("--start y --end deben usarse juntos");
const filters = startDate ? { startDate, endDate } : {};

const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/data/distrito-2.json"), "utf8"));
const startedAt = new Date().toISOString();
const analysis = analyzeDemoDataset({ catalog, filters, seed: 20261111, count: 1_000_000 });
const completedAt = new Date().toISOString();

assert.equal(analysis.record_count, 1_000_000);
assert.equal(analysis.transaction_count, 1_000_000);
if (startDate) assert.deepEqual(analysis.period, { start: startDate, end: endDate });
else assert.deepEqual(analysis.period, { start: "2005-01-01", end: "2026-11-19" });
assert.equal(Object.keys(analysis.charts).length, 7);
assert.ok(analysis.rules.length > 0);

const json = (value) => `$json$${JSON.stringify(value)}$json$::jsonb`;
const text = (value) => `$text$${value}$text$`;
const sql = `begin;
insert into public.mining_analysis_runs (
  mode, execution_type, source_description, period_start, period_end,
  record_count, transaction_count, indicators, chart_data, association_rules,
  findings, parameters, filters, unit_of_analysis, status, error_message,
  requested_by, started_at, completed_at
) values (
  'demo',
  'manual',
  ${text("Validación agregada de un millón de registros sintéticos reproducibles procesados por el motor del proyecto desde el entorno seguro; no se insertan en public.incidents.")},
  '${analysis.period.start}',
  '${analysis.period.end}',
  ${analysis.record_count},
  ${analysis.transaction_count},
  ${json(analysis.indicators)},
  ${json(analysis.charts)},
  ${json(analysis.rules)},
  ${json(analysis.findings)},
  ${json(analysis.parameters)},
  ${json(analysis.filters)},
  ${text(analysis.unit_of_analysis)},
  'COMPLETED',
  null,
  null,
  '${startedAt}',
  '${completedAt}'
)
returning id, status, record_count, transaction_count, period_start, period_end, started_at, completed_at;
commit;
`;

fs.writeFileSync(outputPath, sql, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({
  output: outputPath,
  recordCount: analysis.record_count,
  transactionCount: analysis.transaction_count,
  period: analysis.period,
  rules: analysis.rules.length,
  chartSeries: Object.keys(analysis.charts),
  processingDurationMs: analysis.indicators.processing_duration_ms,
}, null, 2));
