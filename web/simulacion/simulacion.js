(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlertaRutaSimulation = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SEED = 20261123;
  const START_MINUTES = 8 * 60;
  const SPEEDS = Object.freeze({ normal: 10, fast: 40 });
  const EXPECTED_SERVICES = Object.freeze([
    Object.freeze({ name: "Santa Clara", truck: "SIM-C01", day: "sabado", start: "08:00", end: "11:00", serviceId: "D2-S067" }),
    Object.freeze({ name: "La Santa Cruz", truck: "SIM-C01", day: "sabado", start: "11:30", end: "14:30", serviceId: "D2-S068" }),
    Object.freeze({ name: "Fleig", truck: "SIM-C01", day: "sabado", start: "15:00", end: "18:00", serviceId: "D2-S069" }),
  ]);
  const LEG_GEOMETRY = Object.freeze([
    Object.freeze([{ x: 120, y: 275 }, { x: 230, y: 120 }, { x: 340, y: 120 }, { x: 460, y: 120 }]),
    Object.freeze([{ x: 460, y: 120 }, { x: 580, y: 120 }, { x: 675, y: 320 }, { x: 790, y: 270 }]),
  ]);
  const STOP_POINTS = Object.freeze([{ x: 120, y: 275 }, { x: 460, y: 120 }, { x: 790, y: 270 }]);

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value = (value + 0x6D2B79F5) | 0;
      let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function triangular(random, minimum, mode, maximum) {
    const sample = random();
    const split = (mode - minimum) / (maximum - minimum);
    if (sample < split) return minimum + Math.sqrt(sample * (maximum - minimum) * (mode - minimum));
    return maximum - Math.sqrt((1 - sample) * (maximum - minimum) * (maximum - mode));
  }

  function uniformInteger(random, minimum, maximum) {
    return minimum + Math.floor(random() * (maximum - minimum + 1));
  }

  function extractSaturdayServices(catalog) {
    if (!catalog || !Array.isArray(catalog.barrios)) throw new Error("El catálogo no contiene la lista de barrios esperada.");
    return EXPECTED_SERVICES.map((expected) => {
      const neighborhood = catalog.barrios.find((item) => item.nombre === expected.name);
      const service = neighborhood && neighborhood.horarios && neighborhood.horarios.sabado;
      if (!service) throw new Error(`Falta el servicio sabatino de ${expected.name}.`);
      return {
        name: neighborhood.nombre,
        neighborhoodId: neighborhood.id,
        serviceId: service.id,
        truck: service.camion,
        day: service.dia,
        start: service.inicio,
        end: service.fin,
      };
    });
  }

  function validateCatalog(catalog) {
    const services = extractSaturdayServices(catalog);
    services.forEach((service, index) => {
      const expected = EXPECTED_SERVICES[index];
      const valid = service.name === expected.name
        && service.truck === expected.truck
        && service.day === expected.day
        && service.start === expected.start
        && service.end === expected.end
        && service.serviceId === expected.serviceId;
      if (!valid) throw new Error(`El servicio ${index + 1} no coincide con ${expected.name}, ${expected.start}–${expected.end}, ${expected.truck}.`);
    });
    return services;
  }

  function buildPlan(seed = SEED) {
    const random = seededRandom(seed);
    const events = [];
    let cursor = 0;
    function append(event) {
      const complete = Object.assign({}, event, { startMinute: cursor, endMinute: cursor + event.duration });
      cursor = complete.endMinute;
      events.push(Object.freeze(complete));
    }

    EXPECTED_SERVICES.forEach((stop, stopIndex) => {
      append({ id: `collection-${stopIndex}`, kind: "collection", stopIndex, duration: Math.round(triangular(random, 18, 24, 32)) });
      if (stopIndex === EXPECTED_SERVICES.length - 1) return;

      const travelDuration = Math.round(triangular(random, 20, 28, 38));
      const firstHalf = Math.floor(travelDuration / 2);
      append({ id: `travel-${stopIndex}-a`, kind: "travel", legIndex: stopIndex, fromProgress: 0, toProgress: .5, duration: firstHalf });
      if (random() < .5) {
        append({ id: `delay-${stopIndex}`, kind: "delay", legIndex: stopIndex, routeProgress: .5, duration: uniformInteger(random, 4, 12) });
      }
      append({ id: `travel-${stopIndex}-b`, kind: "travel", legIndex: stopIndex, fromProgress: .5, toProgress: 1, duration: travelDuration - firstHalf });
    });

    return Object.freeze({ seed, events: Object.freeze(events), totalDuration: cursor });
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function activeEvent(plan, elapsedMinutes) {
    const elapsed = clamp(elapsedMinutes, 0, plan.totalDuration);
    return plan.events.find((event) => elapsed >= event.startMinute && elapsed < event.endMinute) || null;
  }

  function metricsAt(plan, elapsedMinutes) {
    const elapsed = clamp(elapsedMinutes, 0, plan.totalDuration);
    const totals = { total: 0, travel: 0, collection: 0, delay: 0, completedStops: 0 };
    plan.events.forEach((event) => {
      const consumed = clamp(elapsed - event.startMinute, 0, event.duration);
      totals.total += consumed;
      if (event.kind === "travel") totals.travel += consumed;
      if (event.kind === "collection") totals.collection += consumed;
      if (event.kind === "delay") totals.delay += consumed;
      if (event.kind === "collection" && elapsed >= event.endMinute) totals.completedStops += 1;
    });
    return totals;
  }

  function stateAt(plan, elapsedMinutes, running) {
    const elapsed = clamp(elapsedMinutes, 0, plan.totalDuration);
    if (elapsed >= plan.totalDuration) {
      return { status: "Completado", type: "completed", title: "Recorrido completado", detail: "Las tres recolecciones simuladas finalizaron.", next: "Fin del recorrido", activeStop: 2, event: null };
    }
    const event = activeEvent(plan, elapsed);
    if (!running) {
      const initial = elapsed === 0;
      return { status: "Pausado", type: "paused", title: initial ? "Listo en Santa Clara" : "Simulación pausada", detail: initial ? "El camión espera el inicio de la primera recolección." : "El reloj y la posición permanecen detenidos.", next: nextDestination(event), activeStop: activeStopIndex(event), event };
    }
    if (event.kind === "collection") {
      const stop = EXPECTED_SERVICES[event.stopIndex];
      return { status: "Recolectando", type: "collecting", title: `Recolectando en ${stop.name}`, detail: `Detención académica de ${event.duration} minutos simulados.`, next: event.stopIndex < 2 ? EXPECTED_SERVICES[event.stopIndex + 1].name : "Fin del recorrido", activeStop: event.stopIndex, event };
    }
    if (event.kind === "delay") {
      return { status: "En tránsito", type: "delay", title: "Demora simulada", detail: `Evento de demora de ${event.duration} minutos en el tramo.`, next: EXPECTED_SERVICES[event.legIndex + 1].name, activeStop: event.legIndex + 1, event };
    }
    return { status: "En tránsito", type: "transit", title: `En tránsito hacia ${EXPECTED_SERVICES[event.legIndex + 1].name}`, detail: "El camión avanza por una trayectoria ilustrativa sin escala.", next: EXPECTED_SERVICES[event.legIndex + 1].name, activeStop: event.legIndex + 1, event };
  }

  function nextDestination(event) {
    if (!event) return "Fin del recorrido";
    if (event.kind === "collection") return event.stopIndex < 2 ? EXPECTED_SERVICES[event.stopIndex + 1].name : "Fin del recorrido";
    return EXPECTED_SERVICES[event.legIndex + 1].name;
  }

  function activeStopIndex(event) {
    if (!event) return 2;
    return event.kind === "collection" ? event.stopIndex : event.legIndex + 1;
  }

  function cubicPoint(points, progress) {
    const t = clamp(progress, 0, 1);
    const inverse = 1 - t;
    const a = inverse * inverse * inverse;
    const b = 3 * inverse * inverse * t;
    const c = 3 * inverse * t * t;
    const d = t * t * t;
    return {
      x: (a * points[0].x) + (b * points[1].x) + (c * points[2].x) + (d * points[3].x),
      y: (a * points[0].y) + (b * points[1].y) + (c * points[2].y) + (d * points[3].y),
    };
  }

  function positionAt(plan, elapsedMinutes) {
    const elapsed = clamp(elapsedMinutes, 0, plan.totalDuration);
    if (elapsed >= plan.totalDuration) return STOP_POINTS[2];
    const event = activeEvent(plan, elapsed);
    if (!event) return STOP_POINTS[0];
    if (event.kind === "collection") return STOP_POINTS[event.stopIndex];
    if (event.kind === "delay") return cubicPoint(LEG_GEOMETRY[event.legIndex], event.routeProgress);
    const eventProgress = event.duration === 0 ? 1 : (elapsed - event.startMinute) / event.duration;
    const routeProgress = event.fromProgress + ((event.toProgress - event.fromProgress) * eventProgress);
    return cubicPoint(LEG_GEOMETRY[event.legIndex], routeProgress);
  }

  function formatClock(minutesFromStart) {
    const absolute = START_MINUTES + Math.floor(minutesFromStart + 1e-9);
    const hours = Math.floor(absolute / 60) % 24;
    const minutes = absolute % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  class SimulationEngine {
    constructor(plan = buildPlan()) {
      this.plan = plan;
      this.elapsedMinutes = 0;
      this.running = false;
      this.speed = "normal";
    }

    start() {
      if (this.elapsedMinutes >= this.plan.totalDuration) return false;
      this.running = true;
      return true;
    }

    pause() {
      this.running = false;
    }

    reset() {
      this.elapsedMinutes = 0;
      this.running = false;
    }

    setSpeed(speed) {
      if (!Object.prototype.hasOwnProperty.call(SPEEDS, speed)) throw new Error(`Velocidad no válida: ${speed}`);
      this.speed = speed;
    }

    advance(realSeconds) {
      if (!this.running || realSeconds <= 0) return this.elapsedMinutes;
      this.elapsedMinutes = Math.min(this.plan.totalDuration, this.elapsedMinutes + (realSeconds * SPEEDS[this.speed]));
      if (this.elapsedMinutes >= this.plan.totalDuration) this.running = false;
      return this.elapsedMinutes;
    }
  }

  function displayMinutes(value) {
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} min`;
  }

  function boot(documentObject, windowObject) {
    const startButton = documentObject.querySelector("#start-simulation");
    if (!startButton) return;
    const pauseButton = documentObject.querySelector("#pause-simulation");
    const resetButton = documentObject.querySelector("#reset-simulation");
    const speedFieldset = documentObject.querySelector(".speed-control");
    const speedButtons = Array.from(documentObject.querySelectorAll("[data-speed]"));
    const routeStage = documentObject.querySelector(".route-stage");
    const routeMap = documentObject.querySelector("#route-map");
    const errorPanel = documentObject.querySelector("#simulation-error");
    const errorMessage = documentObject.querySelector("#simulation-error-message");
    const engine = new SimulationEngine();
    let frameId = 0;
    let previousTimestamp = null;

    function setControlsReady() {
      startButton.disabled = false;
      resetButton.disabled = false;
      speedFieldset.disabled = false;
    }

    function updateStops(state, metrics) {
      documentObject.querySelectorAll("[data-stop], [data-stop-card]").forEach((element) => {
        const index = Number(element.dataset.stop ?? element.dataset.stopCard);
        const completed = index < metrics.completedStops;
        element.classList.toggle("is-completed", completed);
        element.classList.toggle("is-current", !completed && index === state.activeStop);
        element.classList.toggle("is-pending", !completed && index !== state.activeStop);
        const label = element.querySelector(".stop-status");
        if (label) label.textContent = completed ? "Completada" : (index === state.activeStop ? "Actual" : "Pendiente");
      });
    }

    function render() {
      const state = stateAt(engine.plan, engine.elapsedMinutes, engine.running);
      const metrics = metricsAt(engine.plan, engine.elapsedMinutes);
      const position = positionAt(engine.plan, engine.elapsedMinutes);
      const badge = documentObject.querySelector("#state-badge");
      badge.textContent = state.status;
      badge.className = `state-badge is-${state.type}`;
      documentObject.querySelector("#control-title").textContent = state.title;
      documentObject.querySelector("#state-detail").textContent = state.detail;
      documentObject.querySelector("#next-destination").textContent = state.next;
      documentObject.querySelector("#simulation-clock").textContent = formatClock(engine.elapsedMinutes);
      documentObject.querySelector("#simulation-clock").setAttribute("datetime", formatClock(engine.elapsedMinutes));
      const truck = documentObject.querySelector("#route-truck");
      truck.setAttribute("transform", `translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`);
      if (routeStage.scrollWidth > routeStage.clientWidth) {
        const horizontalScale = routeMap.getBoundingClientRect().width / 900;
        const maximumScroll = routeStage.scrollWidth - routeStage.clientWidth;
        routeStage.scrollLeft = clamp((position.x * horizontalScale) - (routeStage.clientWidth / 2), 0, maximumScroll);
      }
      truck.classList.toggle("is-collecting", state.type === "collecting");
      truck.classList.toggle("is-delayed", state.type === "delay");
      updateStops(state, metrics);
      documentObject.querySelector("#metric-total").textContent = displayMinutes(metrics.total);
      documentObject.querySelector("#metric-travel").textContent = displayMinutes(metrics.travel);
      documentObject.querySelector("#metric-collection").textContent = displayMinutes(metrics.collection);
      documentObject.querySelector("#metric-delay").textContent = displayMinutes(metrics.delay);
      documentObject.querySelector("#metric-stops").textContent = `${metrics.completedStops} / 3`;
      documentObject.querySelector("#metric-finish").textContent = metrics.completedStops === 3 ? formatClock(engine.plan.totalDuration) : "—";
      startButton.disabled = engine.elapsedMinutes >= engine.plan.totalDuration;
      startButton.innerHTML = `<span aria-hidden="true">▶</span> ${engine.elapsedMinutes > 0 && !engine.running ? "Reanudar" : "Iniciar"}`;
      pauseButton.disabled = !engine.running;
    }

    function frame(timestamp) {
      frameId = 0;
      if (!engine.running) { previousTimestamp = null; render(); return; }
      if (previousTimestamp !== null) engine.advance((timestamp - previousTimestamp) / 1000);
      previousTimestamp = timestamp;
      render();
      if (engine.running) frameId = windowObject.requestAnimationFrame(frame);
      else previousTimestamp = null;
    }

    function scheduleFrame() {
      if (!frameId) frameId = windowObject.requestAnimationFrame(frame);
    }

    startButton.addEventListener("click", () => {
      if (engine.start()) { previousTimestamp = null; render(); scheduleFrame(); }
    });
    pauseButton.addEventListener("click", () => { engine.pause(); previousTimestamp = null; render(); });
    resetButton.addEventListener("click", () => { engine.reset(); previousTimestamp = null; render(); });
    speedButtons.forEach((button) => button.addEventListener("click", () => {
      engine.setSpeed(button.dataset.speed);
      speedButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      render();
    }));

    windowObject.fetch("../data/distrito-2.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`No se pudo leer el catálogo (${response.status}).`);
        return response.json();
      })
      .then((catalog) => {
        validateCatalog(catalog);
        setControlsReady();
        render();
      })
      .catch((error) => {
        errorMessage.textContent = error.message;
        errorPanel.hidden = false;
      });
  }

  if (typeof document !== "undefined" && typeof window !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => boot(document, window));
  }

  return Object.freeze({
    SEED,
    SPEEDS,
    EXPECTED_SERVICES,
    seededRandom,
    triangular,
    uniformInteger,
    extractSaturdayServices,
    validateCatalog,
    buildPlan,
    activeEvent,
    metricsAt,
    stateAt,
    positionAt,
    formatClock,
    SimulationEngine,
  });
}));
