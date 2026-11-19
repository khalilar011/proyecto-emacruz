"use strict";

const assert = require("node:assert/strict");
const view = require("../web/admin/mineria/mining-view.js");

const manual = view.metadata({
  record_count: 1_000_000,
  period_start: "2026-01-05",
  period_end: "2026-07-05",
  started_at: "2026-11-19T19:30:00Z",
  completed_at: "2026-11-19T19:31:00Z",
  execution_type: "manual",
});
assert.deepEqual(manual, {
  periodStatus: "Registros incluidos",
  periodStart: "05/01/2026",
  periodEnd: "05/07/2026",
  executionAt: "19/11/2026 15:31",
  startedAt: "19/11/2026 15:30",
  executionType: "Actualización manual",
});

const scheduled = view.metadata({
  record_count: 5,
  period_start: "2026-11-01",
  period_end: "2026-11-08",
  started_at: "2026-11-09T07:00:00Z",
  completed_at: "2026-11-09T07:00:30Z",
  execution_type: "scheduled",
});
assert.equal(scheduled.executionAt, "09/11/2026 03:00");
assert.equal(scheduled.executionType, "Actualización automática semanal");

const empty = view.metadata({
  record_count: 0,
  period_start: null,
  period_end: null,
  started_at: "2026-11-19T19:30:00Z",
  completed_at: "2026-11-19T19:30:01Z",
  execution_type: "manual",
});
assert.equal(empty.periodStatus, "Sin registros para el periodo");
assert.equal(empty.periodStart, "—");
assert.equal(empty.periodEnd, "—");

console.log("Vista de análisis validada: periodo, ejecución manual/automática y zona horaria cumplen.");
