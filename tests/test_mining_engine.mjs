import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  analyzeIncidents,
  apriori,
  createDemoIncidents,
  durationRange,
} from "../supabase/functions/_shared/mining-engine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../web/data/distrito-2.json"), "utf8"));

const known = apriori([
  ["A", "B"],
  ["A", "B"],
  ["A", "B"],
  ["C"],
], {
  minSupport: 0.5,
  minConfidence: 0.9,
  minLift: 1,
  minimumTransactions: 2,
  maxItemsetSize: 2,
  maxRules: 10,
});
const aToB = known.rules.find((rule) => rule.antecedent[0] === "A" && rule.consequent[0] === "B");
assert.ok(aToB, "Apriori debe producir A → B");
assert.equal(aToB.support_count, 3);
assert.equal(aToB.support, 0.75);
assert.equal(aToB.confidence, 1);
assert.equal(aToB.lift, 4 / 3);

const insufficient = apriori([["A", "B"]], { minimumTransactions: 2 });
assert.equal(insufficient.insufficientData, true);
assert.deepEqual(insufficient.rules, []);
assert.equal(durationRange(15), "1-15");
assert.equal(durationRange(30), "16-30");
assert.equal(durationRange(60), "31-60");
assert.equal(durationRange(120), "61-120");
assert.equal(durationRange(121), "MAS_DE_120");

const demoOne = createDemoIncidents(catalog, { seed: 20261111, count: 180 });
const demoTwo = createDemoIncidents(catalog, { seed: 20261111, count: 180 });
assert.equal(demoOne.incidents.length, 180);
assert.deepEqual(demoOne, demoTwo, "La semilla fija debe producir exactamente el mismo dataset");
assert.equal(new Set(demoOne.incidents.map((row) => row.id)).size, 180);
assert.ok(demoOne.incidents.every((row) => row.is_simulation));

const demoAnalysis = analyzeIncidents({
  incidents: demoOne.incidents,
  catalog,
  mode: "demo",
  filters: { startDate: demoOne.period.start, endDate: demoOne.period.end },
  parameters: { minSupport: 0.08, minConfidence: 0.55, minLift: 1.05 },
});
assert.equal(demoAnalysis.indicators.total_incidents, 180);
assert.equal(demoAnalysis.transaction_count, 180);
assert.ok(demoAnalysis.rule_count > 0, "La demostración debe revelar asociaciones calculadas");
assert.ok(demoAnalysis.rules.some((rule) => (
  [...rule.antecedent, ...rule.consequent].includes("CAMION=SIM-C01")
  && [...rule.antecedent, ...rule.consequent].includes("MOTIVO=FALLA_MECANICA")
)), "Apriori debe recuperar la asociación sintética documentada de SIM-C01 y falla mecánica");

const duplicate = {
  id: "INC-1",
  state: "DEMORA",
  reason_code: "LLUVIA",
  estimated_delay_minutes: 45,
  starts_at: "2026-01-05T08:00:00-04:00",
  expires_at: "2026-01-05T18:00:00-04:00",
  affected_service_ids: ["D2-S001", "D2-S002"],
  affected_neighborhood_ids: ["D2-B09", "D2-B18"],
  affected_truck_ids: ["SIM-C01"],
  updated_at: "2026-01-05T08:00:00-04:00",
};
const editedVersion = { ...duplicate, estimated_delay_minutes: 60, updated_at: "2026-01-05T09:00:00-04:00" };
const deduplicated = analyzeIncidents({
  incidents: [duplicate, editedVersion],
  catalog,
  filters: { startDate: "2026-01-05", endDate: "2026-01-05" },
  parameters: { minimumTransactions: 2 },
});
assert.equal(deduplicated.indicators.total_incidents, 1, "Una edición no debe duplicar la incidencia");
assert.equal(deduplicated.indicators.affected_neighborhoods, 2, "La misma incidencia cuenta en cada barrio afectado");
assert.equal(deduplicated.indicators.affected_programmed_service_occurrences, 2);
assert.equal(deduplicated.charts.neighborhoods.find((row) => row.id === "D2-B09").count, 1);
assert.equal(deduplicated.charts.neighborhoods.find((row) => row.id === "D2-B18").count, 1);
assert.equal(deduplicated.indicators.average_estimated_delay_minutes, 60, "Se usa la versión actual de la incidencia");

console.log("Minería validada: Apriori, soporte, confianza, lift, semilla fija y no duplicación cumplen.");
