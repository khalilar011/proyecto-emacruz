"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const incidentUtils = require("../web/incidents.js");
global.AlertaRutaIncidents = incidentUtils;
const mapViewer = require("../web/map-viewer.js");
const dataSource = require("../web/supabase-data.js");
const adminCore = require("../web/admin/admin-core.js");

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../web/data/distrito-2.json"), "utf8"));
assert.equal(mapViewer.validCatalog(catalog.mapas), true);
assert.deepEqual(catalog.mapas.map((item) => item.id), ["barrios", "plano", "uv"]);
assert.equal(mapViewer.nextZoom(1, 0.25), 1.25);
assert.equal(mapViewer.nextZoom(2.9, 0.25), 3);
assert.equal(mapViewer.nextZoom(0.8, -0.25), 0.75);

const nextWindow = incidentUtils.nextServiceWindow(
  catalog.servicios, "truck", "SIM-C01", [], new Date("2026-11-04T19:00:00-04:00"),
);
assert.equal(nextWindow.serviceId, "D2-S041");
assert.equal(nextWindow.startsAt.toISOString(), "2026-11-05T15:30:00.000Z");
assert.equal(nextWindow.expiresAt.toISOString(), "2026-11-05T18:30:00.000Z");

assert.equal(adminCore.isConfigured({}, { createClient() {} }), false);
assert.equal(adminCore.isConfigured({ supabaseUrl: "https://example.supabase.co", supabasePublishableKey: "x".repeat(30) }, { createClient() {} }), true);
assert.equal(
  adminCore.serviceLabel(catalog.servicios[0], catalog.barrios.find((item) => item.id === catalog.servicios[0].barrio_id)),
  "Santa Clara · UV 15 · Lunes 08:00–11:00 · SIM-C01",
);
function membershipClient(data, error = null) {
  return { from(table) {
    assert.equal(table, "admin_users");
    return { select() { return { eq() { return { async maybeSingle() { return { data, error }; } }; } }; } };
  } };
}
(async () => {
  assert.equal((await adminCore.membership(membershipClient({ user_id: "admin", display_name: "Admin" }), "admin")).authorized, true);
  assert.equal((await adminCore.membership(membershipClient(null), "stranger")).authorized, false);
  const calls = [];
  const rpcClient = {
    auth: {
      async signInWithPassword(credentials) { calls.push(["signIn", credentials]); return { data: {}, error: null }; },
      async signOut() { calls.push(["signOut", {}]); return { error: null }; },
    },
    async rpc(name, params) { calls.push([name, params]); return { data: {}, error: null }; },
  };
  await adminCore.signIn(rpcClient, "admin@example.test", "not-a-real-password");
  await adminCore.signOut(rpcClient);
  await adminCore.saveIncident(rpcClient, "", { p_state: "DEMORA" });
  await adminCore.saveIncident(rpcClient, "uuid", { p_state: "DEMORA" });
  await adminCore.retireIncident(rpcClient, "uuid");
  assert.deepEqual(calls.map((item) => item[0]), ["signIn", "signOut", "create_alerta_ruta_incident", "update_alerta_ruta_incident", "retire_alerta_ruta_incident"]);

  const publicRow = {
    id: "uuid", state: "DEMORA", reason_code: "LLUVIA", reason_detail: "Lluvia",
    estimated_delay_minutes: 45, starts_at: "2026-11-02T12:00:00Z", expires_at: "2026-11-02T15:00:00Z",
    primary_target_type: "service", primary_target_id: "D2-S001", affected_service_ids: ["D2-S001"],
    affected_neighborhood_ids: ["D2-B01"], affected_truck_ids: ["SIM-C01"],
    published_at: "2026-11-02T12:00:00Z", updated_at: "2026-11-02T12:00:00Z", is_simulation: true,
  };
  const fakePublicClient = { from(table) {
    assert.equal(table, "incidents");
    return { select(columns) {
      assert.equal(columns, dataSource.PUBLIC_COLUMNS);
      return { async order() { return { data: [publicRow], error: null }; } };
    } };
  } };
  const online = await dataSource.loadPublic(fakePublicClient);
  assert.equal(online.mode, "supabase");
  assert.deepEqual(online.incidents[0].objetivos.servicios, ["D2-S001"]);

  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, async json() { return { incidencias: [], ultima_actualizacion: null }; } });
  const fallback = await dataSource.loadFallback();
  global.fetch = originalFetch;
  assert.equal(fallback.mode, "json");
  assert.deepEqual(fallback.incidents, []);
  console.log("Pruebas web: visor simple, valores del panel, Supabase, fallback y autorización cumplen.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
