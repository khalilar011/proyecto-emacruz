"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const hash = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");

const protectedHashes = {
  "web/app.js": "4246ec607a47aaa42a5ffde4bb37c60f814b691b66c6640eaf25944e60f35b82",
  "web/incidents.js": "3eee6d2bd7d618c6e3ada77a4bb8dd2062b9bf1adfaf331f34a5ac265be95ed0",
  "web/map-viewer.js": "8ef166c23919135fa2bd8300803304d472fd931161b598568e2b0f5bfc42e90f",
  "web/schedule-utils.js": "eed8abc0c9c90c869ddf75dbefee5395f3e8939ccd19eb59f2a1a9f0404cca2e",
  "web/supabase-data.js": "7c976b949416f5b8a5f95019491e6950307143851180fc3626c08dbce7fc6000",
  "web/admin/admin-core.js": "66794dc48635fa40a47e5c645c578ee959be00881ae62cc50abdf2aaa3ed8576",
  "web/admin/admin.js": "86c8e445e32fbd3d0a39549176da52296cc729dc8f822b6a01468fd37175841f",
  "web/config.js": "ef8bad501d1d4c47e996baf2e53e92103b2f966c08f45d817aacae884f678c38",
  "supabase/functions/mining-analysis/index.ts": "4c94be55a18b334e8e2a02d332b37afcdeef1ae4d4d45b3ab079ffb6122fe274",
  "supabase/functions/_shared/mining-engine.mjs": "762fa333469be3746ed9fe92c01626f79bbfb5a1a1f3035d9404bd63638d6669",
  ".github/workflows/mining-weekly.yml": "cdf4bb490ebf92c944b1056532c96f95f76f1be9022c4cf23143669805630396",
  "supabase/migrations/0001_alerta_ruta_schema.sql": "0b61155b47bdc01b2a83f6ff3b944adf7e279d2a434d59f23be932d261017087",
  "supabase/migrations/0002_catalog.sql": "b70bcc1737ebb74cb61c8969e9687b3c1e8257b2d58b2bf4c35d10db6accffb3",
  "supabase/migrations/0003_mining_analysis.sql": "c50504e92a4f8c22a096ff645a6e065ad8d17075594b24b4a1ab80b063069b14",
};

for (const [relativePath, expected] of Object.entries(protectedHashes)) {
  assert.equal(hash(relativePath), expected, `El rediseño no debe modificar ${relativePath}`);
}

const pages = [
  ["web/index.html", "theme.js", "assets/brand/favicon.png", "assets/brand/alerta-ruta-mark.webp"],
  ["web/admin/index.html", "../theme.js", "../assets/brand/favicon.png", "../assets/brand/alerta-ruta-mark.webp"],
  ["web/admin/mineria/index.html", "../../theme.js", "../../assets/brand/favicon.png", "../../assets/brand/alerta-ruta-mark.webp"],
];

for (const [relativePath, themePath, faviconPath, logoPath] of pages) {
  const html = read(relativePath);
  assert.match(html, new RegExp(`<script src="${themePath.replaceAll(".", "\\.")}"></script>`));
  assert.ok(html.includes(`href="${faviconPath}"`), `Falta favicon en ${relativePath}`);
  assert.ok(html.includes(`src="${logoPath}"`), `Falta logo en ${relativePath}`);
  assert.match(html, /data-theme-toggle/);
}

const requiredPublicIds = ["barrio-count", "barrio-search", "barrio-select", "search-status", "result", "service-status", "open-map", "main-map", "map-tabs", "map-dialog", "dialog-image"];
const requiredAdminIds = ["login-form", "incident-form", "target-type", "target-id", "incident-state", "reason-code", "publish-button", "status-filter", "alerts-body", "logout"];
const requiredMiningIds = ["refresh-analysis", "data-mode", "period-start", "period-end", "neighborhood-filter", "truck-filter", "neighborhood-chart", "timeline-chart", "rules-list", "findings-list", "logout"];

for (const [relativePath, ids] of [["web/index.html", requiredPublicIds], ["web/admin/index.html", requiredAdminIds], ["web/admin/mineria/index.html", requiredMiningIds]]) {
  const html = read(relativePath);
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `Falta #${id} en ${relativePath}`);
}

for (const asset of [
  "web/assets/brand/alerta-ruta-mark.webp",
  "web/assets/brand/alerta-ruta-lockup.webp",
  "web/assets/brand/favicon.png",
  "web/assets/illustrations/santa-cruz-smart-city.webp",
  "web/assets/illustrations/santa-cruz-smart-city-960.webp",
]) assert.ok(fs.statSync(path.join(root, asset)).size > 0, `Recurso vacío: ${asset}`);

const controls = [];
const listeners = {};
const storage = new Map();
const meta = { content: "" };
const systemPreference = { matches: true, addEventListener() {} };
const documentElement = { dataset: {}, style: {} };
const button = {
  dataset: {},
  attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; },
  addEventListener(name, callback) { listeners[`button:${name}`] = callback; },
};
controls.push(button);

const context = {
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  document: {
    documentElement,
    querySelector(selector) { return selector === 'meta[name="theme-color"]' ? meta : null; },
    querySelectorAll(selector) { return selector === "[data-theme-toggle]" ? controls : []; },
    addEventListener(name, callback) { listeners[`document:${name}`] = callback; },
  },
  window: {
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    matchMedia: () => systemPreference,
    dispatchEvent(event) { listeners[`window:${event.type}`]?.(event); },
  },
};
context.window.window = context.window;
context.window.document = context.document;
context.window.CustomEvent = context.CustomEvent;

vm.runInNewContext(read("web/theme.js"), context, { filename: "web/theme.js" });
assert.equal(documentElement.dataset.theme, "dark", "La primera visita debe respetar el tema oscuro del sistema");
assert.equal(meta.content, "#0B1720");
listeners["document:DOMContentLoaded"]();
listeners["button:click"]();
assert.equal(documentElement.dataset.theme, "light", "El selector debe cambiar el tema inmediatamente");
assert.equal(storage.get("alerta-ruta-theme"), "light", "El selector debe persistir la preferencia");
assert.equal(button.attributes["aria-pressed"], "false");

console.log("Regresión visual validada: módulos protegidos intactos, identidad local y tema persistente en las tres rutas.");
