import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const admin = read("web/admin/index.html");
const publicPage = read("web/index.html");
const miningPage = read("web/admin/mineria/index.html");
const miningFrontend = read("web/admin/mineria/mining.js");
const edgeFunction = read("supabase/functions/mining-analysis/index.ts");
const migration = read("supabase/migrations/0003_mining_analysis.sql");
const workflow = read(".github/workflows/mining-weekly.yml");
const config = read("supabase/config.toml");

const ids = [...miningPage.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "El dashboard no debe repetir IDs HTML");
for (const match of miningPage.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const resource = match[1];
  if (/^(?:https?:|#)/.test(resource)) continue;
  const resolved = path.resolve(root, "web/admin/mineria", resource.split("?")[0]);
  assert.ok(fs.existsSync(resolved), `Recurso local inexistente: ${resource}`);
}

assert.match(admin, /href="mineria\/"[^>]*>Minería de datos/);
assert.doesNotMatch(publicPage, /admin\/mineria|Minería de datos/);
assert.match(miningPage, /Gestión de alertas/);
assert.match(miningPage, /DATOS SINTÉTICOS — DEMOSTRACIÓN ACADÉMICA/);
assert.match(miningPage, /Historial registrado del prototipo/);
assert.match(miningPage, /Actualizar análisis/);
assert.equal((miningPage.match(/<canvas /g) || []).length, 7);
assert.match(miningPage, /Soporte mínimo/);
assert.match(miningPage, /Confianza mínima/);
assert.match(miningPage, /Lift mínimo/);

assert.match(miningFrontend, /adminCore\.membership/);
assert.match(miningFrontend, /from\("mining_analysis_runs"\)/);
assert.match(miningFrontend, /client\.functions\.invoke\("mining-analysis"/);
assert.doesNotMatch(miningFrontend, /sb_secret_|service_role/);
assert.doesNotMatch(miningPage, /sb_secret_|service_role/);

assert.match(edgeFunction, /analyzeIncidents/);
assert.match(edgeFunction, /createDemoIncidents/);
assert.match(edgeFunction, /SUPABASE_SECRET_KEYS/);
assert.match(edgeFunction, /MINING_SCHEDULE_SECRET/);
assert.match(edgeFunction, /admin_users/);
assert.match(edgeFunction, /status: "COMPLETED"/);
assert.doesNotMatch(edgeFunction, /sb_secret_[A-Za-z0-9_-]+/);

assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on public\.mining_analysis_runs from public, anon, authenticated/);
assert.match(migration, /to authenticated\s+using \(public\.is_alerta_ruta_admin\(\)\)/);
assert.match(migration, /where status = 'RUNNING'/);

assert.match(workflow, /cron: "0 7 \* \* 1"/);
assert.match(workflow, /x-schedule-secret/);
assert.match(workflow, /\{"mode":"history"\}/);
assert.match(config, /\[functions\.mining-analysis\]\s+verify_jwt = false/);

console.log("Integración de minería validada: navegación privada, RLS, motor único, persistencia y cron cumplen estructuralmente.");
