"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const simulation = require("../web/simulacion/simulacion.js");

const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/data/distrito-2.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "web/simulacion/index.html"), "utf8");
const publicHtml = fs.readFileSync(path.join(root, "web/index.html"), "utf8");

const services = simulation.validateCatalog(catalog);
assert.deepEqual(services.map((service) => [service.name, service.truck, service.day, service.start, service.end, service.serviceId]), [
  ["Santa Clara", "SIM-C01", "sabado", "08:00", "11:00", "D2-S067"],
  ["La Santa Cruz", "SIM-C01", "sabado", "11:30", "14:30", "D2-S068"],
  ["Fleig", "SIM-C01", "sabado", "15:00", "18:00", "D2-S069"],
]);

const invalidCatalog = structuredClone(catalog);
invalidCatalog.barrios.find((item) => item.nombre === "Fleig").horarios.sabado.camion = "SIM-C99";
assert.throws(() => simulation.validateCatalog(invalidCatalog), /Fleig/);

const firstPlan = simulation.buildPlan();
const repeatedPlan = simulation.buildPlan();
assert.deepEqual(firstPlan, repeatedPlan, "La semilla fija debe producir los mismos eventos");
assert.equal(firstPlan.seed, 20261123);
assert.equal(firstPlan.events.filter((event) => event.kind === "collection").length, 3);
assert.equal(firstPlan.events.filter((event) => event.kind === "delay").length, 2);

let previousEnd = 0;
firstPlan.events.forEach((event) => {
  assert.equal(event.startMinute, previousEnd, `El evento ${event.id} debe iniciar donde terminó el anterior`);
  assert.equal(event.endMinute - event.startMinute, event.duration);
  previousEnd = event.endMinute;
});
assert.equal(previousEnd, firstPlan.totalDuration);

for (const event of firstPlan.events.filter((item) => item.kind === "collection")) {
  assert.ok(event.duration >= 18 && event.duration <= 32, `Recolección fuera del rango triangular: ${event.duration}`);
}
for (const legIndex of [0, 1]) {
  const travel = firstPlan.events.filter((item) => item.kind === "travel" && item.legIndex === legIndex).reduce((sum, item) => sum + item.duration, 0);
  assert.ok(travel >= 20 && travel <= 38, `Desplazamiento fuera del rango triangular: ${travel}`);
}
for (const event of firstPlan.events.filter((item) => item.kind === "delay")) {
  assert.ok(event.duration >= 4 && event.duration <= 12, `Demora fuera del rango uniforme: ${event.duration}`);
}

const finalMetrics = simulation.metricsAt(firstPlan, firstPlan.totalDuration);
assert.deepEqual(finalMetrics, { total: 149, travel: 61, collection: 77, delay: 11, completedStops: 3 });
assert.equal(finalMetrics.total, finalMetrics.travel + finalMetrics.collection + finalMetrics.delay);
assert.equal(simulation.formatClock(firstPlan.totalDuration), "10:29");
assert.equal(simulation.stateAt(firstPlan, firstPlan.totalDuration, false).title, "Recorrido completado");

const firstTravel = firstPlan.events.find((event) => event.id === "travel-0-a");
const beforeTravel = simulation.positionAt(firstPlan, firstTravel.startMinute);
const duringTravel = simulation.positionAt(firstPlan, firstTravel.startMinute + (firstTravel.duration / 2));
const afterFirstHalf = simulation.positionAt(firstPlan, firstTravel.endMinute);
assert.notDeepEqual(duringTravel, beforeTravel, "El camión debe abandonar Santa Clara progresivamente");
assert.notDeepEqual(duringTravel, afterFirstHalf, "El camión no debe saltar al punto medio del tramo");

const delay = firstPlan.events.find((event) => event.id === "delay-0");
assert.deepEqual(simulation.positionAt(firstPlan, delay.startMinute + 1), simulation.positionAt(firstPlan, delay.endMinute - 1), "La posición debe permanecer fija durante una demora");
assert.equal(simulation.stateAt(firstPlan, delay.startMinute + 1, true).status, "En tránsito");

const engine = new simulation.SimulationEngine(firstPlan);
assert.equal(simulation.stateAt(engine.plan, engine.elapsedMinutes, engine.running).status, "Pausado");
engine.start();
engine.advance(2);
assert.equal(engine.elapsedMinutes, 20);
assert.equal(simulation.stateAt(engine.plan, engine.elapsedMinutes, engine.running).status, "Recolectando");
engine.pause();
engine.advance(20);
assert.equal(engine.elapsedMinutes, 20, "Pausar debe congelar el reloj");
engine.setSpeed("fast");
engine.start();
engine.advance(.5);
assert.equal(engine.elapsedMinutes, 40, "La velocidad rápida debe aplicar 40 minutos simulados por segundo");
engine.advance(10);
assert.equal(engine.elapsedMinutes, firstPlan.totalDuration);
assert.equal(engine.running, false);
engine.reset();
assert.equal(engine.elapsedMinutes, 0);
assert.equal(engine.speed, "fast", "Reiniciar conserva la preferencia de velocidad sin alterar el plan");
assert.deepEqual(engine.plan, firstPlan);
assert.throws(() => engine.setSpeed("turbo"), /no válida/);

assert.match(html, /SIMULACIÓN ACADÉMICA · RECORRIDO ILUSTRATIVO/);
assert.match(html, /No es seguimiento GPS real/);
assert.match(html, /T\(18, 24, 32\)/);
assert.match(html, /T\(20, 28, 38\)/);
assert.match(html, /Semilla fija: 20261123/);
assert.match(publicHtml, /href="simulacion\/">Simulación de ruta/);

console.log("Simulación de ruta: catálogo, eventos, controles, movimiento y métricas cumplen.");
