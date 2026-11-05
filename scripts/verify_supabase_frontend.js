"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const incidents = require("../web/incidents.js");
const dataSource = require("../web/supabase-data.js");

const root = path.resolve(__dirname, "..");
const configText = fs.readFileSync(path.join(root, "web/config.js"), "utf8");
const url = configText.match(/supabaseUrl:\s*"([^"]+)"/)?.[1];
const key = configText.match(/supabasePublishableKey:\s*"([^"]+)"/)?.[1];
assert.match(url || "", /^https:\/\/.+\.supabase\.co$/);
assert.match(key || "", /^sb_publishable_/);

async function main() {
  const endpoint = `${url}/rest/v1/incidents?select=${encodeURIComponent(dataSource.PUBLIC_COLUMNS)}`;
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.equal(response.status, 200);
  const rows = await response.json();
  assert.ok(rows.length > 0, "Se esperaba al menos una incidencia pública vigente");

  const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/data/distrito-2.json"), "utf8"));
  const normalized = rows.map(incidents.normalizeRow);
  const affected = catalog.barrios.filter((barrio) => incidents.statusForBarrio(normalized, barrio, new Date()));
  assert.ok(affected.length > 0, "Ningún barrio del catálogo recibió la incidencia pública");
  for (const barrio of affected) {
    const status = incidents.statusForBarrio(normalized, barrio, new Date());
    assert.ok(["DEMORA", "SERVICIO_SUSPENDIDO"].includes(status.estado));
  }
  const names = affected.map((item) => `${item.nombre} (UV ${item.uv})`).join(", ");
  console.log(`Frontend conectado: ${rows.length} incidencia(s) pública(s); barrios afectados: ${names}.`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
