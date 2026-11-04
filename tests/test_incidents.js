"use strict";

const assert = require("node:assert/strict");
const incidents = require("../web/incidents.js");

const services = [
  { id: "D2-S001", barrio_id: "D2-B01", camion: "SIM-C01", dia_indice: 0, dia: "lunes", inicio: "08:00", fin: "11:00" },
  { id: "D2-S002", barrio_id: "D2-B02", camion: "SIM-C01", dia_indice: 2, dia: "miercoles", inicio: "08:00", fin: "11:00" },
];
assert.equal(incidents.serviceOccursInWindow(services[0], "2026-11-02T08:30:00-04:00", "2026-11-02T10:00:00-04:00"), true);
assert.equal(incidents.serviceOccursInWindow(services[1], "2026-11-02T08:30:00-04:00", "2026-11-02T10:00:00-04:00"), false);
const mondayScope = incidents.buildScope(services, "truck", "SIM-C01", [], "2026-11-02T08:30:00-04:00", "2026-11-02T10:00:00-04:00");
assert.deepEqual(mondayScope.servicios, ["D2-S001"]);
assert.deepEqual(mondayScope.barrios, ["D2-B01"]);
const restricted = incidents.buildScope(services, "truck", "SIM-C01", ["D2-B02"], "2026-11-02T00:00:00-04:00", "2026-11-05T00:00:00-04:00");
assert.deepEqual(restricted.servicios, ["D2-S002"]);

const barrio = { id: "D2-B01", horarios: { lunes: services[0] } };
const base = {
  inicio: "2026-11-02T08:00:00-04:00", vence: "2026-11-02T11:00:00-04:00",
  actualizada_en: "2026-11-02T08:00:00-04:00", retirada: null,
  objetivos: { servicios: ["D2-S001"], barrios: ["D2-B01"], camiones: ["SIM-C01"] },
};
const delay = { ...base, id: "delay", estado: "DEMORA", motivo: "<img src=x onerror=alert(1)>" };
const suspension = { ...base, id: "stop", estado: "SERVICIO_SUSPENDIDO", actualizada_en: "2026-11-02T07:00:00-04:00" };
assert.equal(incidents.statusForBarrio([delay, suspension], barrio, new Date("2026-11-02T09:00:00-04:00")).id, "stop");
assert.equal(incidents.statusForBarrio([delay], { id: "D2-B02", horarios: { miercoles: services[1] } }, new Date("2026-11-02T09:00:00-04:00")), null);
assert.equal(incidents.classify({ ...base, retirada: { fecha: base.inicio } }, new Date("2026-11-02T09:00:00-04:00")), "RETIRADA");
assert.equal(delay.motivo, "<img src=x onerror=alert(1)>");

console.log("Pruebas de incidencias: alcance temporal, prioridad y clasificación cumplen.");
