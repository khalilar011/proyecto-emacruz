"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const utils = require("../web/schedule-utils.js");

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../web/data/distrito-2.json"), "utf8"));
const search = (query) => catalog.barrios.filter((item) => utils.normalizeText(item.nombre).includes(utils.normalizeText(query)));
assert.equal(search("Chacarrilla").length, 1);
assert.equal(search("belgica")[0].nombre, "Coop. La Belgica");
assert.ok(search("san").length > 1);
assert.equal(search("barrio inexistente xyz").length, 0);

const barrio = {
  id: "D2-B11",
  horarios: {
    lunes: { id: "D2-S001", dia_indice: 0, dia_nombre: "Lunes", inicio: "08:00", fin: "11:00", camion: "SIM-C01" },
    martes: null,
    miercoles: { id: "D2-S002", dia_indice: 2, dia_nombre: "Miércoles", inicio: "08:00", fin: "11:00", camion: "SIM-C01" },
    jueves: null,
    viernes: { id: "D2-S003", dia_indice: 4, dia_nombre: "Viernes", inicio: "08:00", fin: "11:00", camion: "SIM-C01" },
    sabado: { id: "D2-S004", dia_indice: 5, dia_nombre: "Sábado", inicio: "08:00", fin: "11:00", camion: "SIM-C01" },
    domingo: null,
  },
};

assert.equal(utils.normalizeText("Bélgica"), "belgica");
const active = utils.nextService(barrio, new Date("2026-11-02T09:00:00-04:00"));
assert.equal(active.dia_nombre, "Lunes");
assert.equal(active.en_curso, true);
const after = utils.nextService(barrio, new Date("2026-11-02T12:00:00-04:00"));
assert.equal(after.dia_nombre, "Miércoles");

const incident = {
  inicio: "2026-11-02T08:00:00-04:00",
  vence: "2026-11-02T10:00:00-04:00",
  retirada: null,
  actualizada_en: "2026-11-02T08:00:00-04:00",
  objetivos: { barrios: [], camiones: ["SIM-C01"], servicios: [] },
};
assert.equal(utils.incidentIsActive(incident, new Date("2026-11-02T09:59:59-04:00")), true);
assert.equal(utils.incidentIsActive(incident, new Date("2026-11-02T07:59:59-04:00")), false);
assert.equal(utils.incidentIsActive(incident, new Date("2026-11-02T10:00:00-04:00")), false);
assert.equal(utils.incidentApplies(incident, barrio), true);
const byBarrio = { ...incident, objetivos: { barrios: ["D2-B11"], camiones: [], servicios: [] } };
const byService = { ...incident, objetivos: { barrios: [], camiones: [], servicios: ["D2-S001"] } };
assert.equal(utils.incidentApplies(byBarrio, barrio), true);
assert.equal(utils.incidentApplies(byService, barrio), true);
incident.retirada = { fecha: "2026-11-02T09:30:00-04:00" };
assert.equal(utils.incidentIsActive(incident, new Date("2026-11-02T09:45:00-04:00")), false);

const priorityIncident = { ...byService, id: "delay", estado: "DEMORA" };
const suspensionIncident = { ...byService, id: "suspension", estado: "SERVICIO_SUSPENDIDO", actualizada_en: "2026-11-02T07:00:00-04:00" };
assert.equal(utils.activeIncident([priorityIncident, suspensionIncident], barrio, new Date("2026-11-02T09:00:00-04:00")).id, "suspension");

console.log("Pruebas JavaScript: búsqueda normalizada, próximo servicio y vigencia cumplen.");
