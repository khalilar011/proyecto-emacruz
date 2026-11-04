(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlertaRutaMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const COLORS = ["#087557", "#2f6db0", "#8b5fbf", "#c06b22", "#007f87", "#9a5365"];
  const stateColors = { NORMAL: "#3a9a75", DEMORA: "#e0a11b", SERVICIO_SUSPENDIDO: "#c84b43" };
  let map;
  let districtLayer;
  let uvLayer;
  let uvByNumber = new Map();
  let barrios = [];
  let services = [];
  let incidents = [];
  let selectedId = null;
  let selectCallback = () => {};
  let controls = { truck: "TODOS", day: "TODOS", state: "TODOS" };

  function truckColor(truck) {
    const number = Number(String(truck).replace(/\D/g, "")) || 0;
    return COLORS[number % COLORS.length];
  }

  function barriosForUv(items, uv) {
    return items.filter((item) => Number(item.uv) === Number(uv));
  }

  function sequenceFor(items, truck, day) {
    return items.filter((service) => service.camion === truck && service.dia === day)
      .sort((a, b) => a.orden_camion - b.orden_camion);
  }

  function filterBarrios(allBarrios, allServices, allIncidents, filters, now = new Date()) {
    const serviceIds = new Set(allServices.filter((service) => (
      (filters.truck === "TODOS" || service.camion === filters.truck)
      && (filters.day === "TODOS" || service.dia === filters.day)
    )).map((item) => item.id));
    return allBarrios.filter((barrio) => {
      const hasService = Object.values(barrio.horarios || {}).filter(Boolean).some((item) => serviceIds.has(item.id));
      const state = root.AlertaRutaIncidents?.statusForBarrio(allIncidents, barrio, now)?.estado || "NORMAL";
      return hasService && (filters.state === "TODOS" || state === filters.state);
    });
  }

  function matchingBarrios() {
    return filterBarrios(barrios, services, incidents, controls);
  }

  function styleUv(feature) {
    const uv = Number(feature.properties.uv);
    const relevant = matchingBarrios().filter((item) => Number(item.uv) === uv);
    const selected = barrios.find((item) => item.id === selectedId);
    const selectedUv = selected && Number(selected.uv) === uv;
    let color = "#8aa59b";
    if (relevant.length && controls.state !== "TODOS") color = stateColors[controls.state];
    else if (relevant.length && controls.truck !== "TODOS") color = truckColor(controls.truck);
    else if (relevant.length) color = "#087557";
    return {
      color: selectedUv ? "#0d3f34" : color,
      weight: selectedUv ? 4 : relevant.length ? 2.5 : 1,
      fillColor: color,
      fillOpacity: selectedUv ? 0.42 : relevant.length ? 0.24 : 0.05,
      opacity: relevant.length ? 1 : 0.45,
    };
  }

  function popupForUv(uv) {
    const container = document.createElement("div");
    container.className = "map-popup";
    const title = document.createElement("strong");
    title.textContent = `Unidad Vecinal ${uv}`;
    const text = document.createElement("p");
    const inUv = barriosForUv(barrios, uv);
    text.textContent = `${inUv.length} barrio${inUv.length === 1 ? "" : "s"} del catálogo académico`;
    container.append(title, text);
    for (const barrio of inUv) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = barrio.nombre;
      button.addEventListener("click", () => selectCallback(barrio.id));
      container.append(button);
    }
    return container;
  }

  function renderSequence() {
    const target = document.getElementById("map-sequence");
    if (!target) return;
    target.replaceChildren();
    if (controls.truck === "TODOS" || controls.day === "TODOS") {
      const note = document.createElement("p");
      note.textContent = "Elige un camión y un día para ver la secuencia de cobertura programada.";
      target.append(note);
      return;
    }
    const items = sequenceFor(services, controls.truck, controls.day);
    const heading = document.createElement("strong");
    heading.textContent = `${controls.truck} · ${controls.day}`;
    target.append(heading);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.textContent = "No hay servicios programados para esa combinación.";
      target.append(empty);
      return;
    }
    const list = document.createElement("ol");
    for (const service of items) {
      const barrio = barrios.find((item) => item.id === service.barrio_id);
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${barrio?.nombre || service.barrio_id} · ${service.inicio}–${service.fin}`;
      button.addEventListener("click", () => selectCallback(service.barrio_id));
      item.append(button);
      list.append(item);
    }
    target.append(list);
  }

  function refresh() {
    if (uvLayer) uvLayer.setStyle(styleUv);
    renderSequence();
    const count = document.getElementById("map-filter-count");
    if (count) count.textContent = `${matchingBarrios().length} barrios coinciden con los filtros.`;
  }

  function setData(nextBarrios, nextServices, nextIncidents) {
    barrios = nextBarrios || [];
    services = nextServices || [];
    incidents = nextIncidents || [];
    refresh();
  }

  function selectBarrio(id, focus = true) {
    selectedId = id || null;
    refresh();
    const barrio = barrios.find((item) => item.id === id);
    const layer = barrio && uvByNumber.get(Number(barrio.uv));
    if (map && layer && focus) {
      map.fitBounds(layer.getBounds(), { padding: [24, 24], maxZoom: 15 });
      layer.bindPopup(popupForUv(barrio.uv)).openPopup();
    }
  }

  function bindFilters() {
    const truck = document.getElementById("map-truck-filter");
    const day = document.getElementById("map-day-filter");
    const state = document.getElementById("map-state-filter");
    const update = () => {
      controls = { truck: truck.value, day: day.value, state: state.value };
      refresh();
    };
    [truck, day, state].forEach((element) => element?.addEventListener("change", update));
  }

  async function initialize(options = {}) {
    selectCallback = options.onSelect || selectCallback;
    const target = document.getElementById("interactive-map");
    const fallback = document.getElementById("map-unavailable");
    if (!target || !root.L) {
      if (fallback) fallback.hidden = false;
      return false;
    }
    try {
      map = root.L.map(target, { scrollWheelZoom: false, minZoom: 11 });
      root.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const response = await fetch("data/geodata/distrito-2-uv.geojson", { cache: "no-store" });
      if (!response.ok) throw new Error(`GeoJSON ${response.status}`);
      const geodata = await response.json();
      const district = geodata.features.filter((item) => item.properties.kind === "district");
      const uvs = geodata.features.filter((item) => item.properties.kind === "uv");
      districtLayer = root.L.geoJSON(district, { style: { color: "#063f31", weight: 4, fillOpacity: 0, dashArray: "8 5" } }).addTo(map);
      uvLayer = root.L.geoJSON(uvs, {
        style: styleUv,
        onEachFeature(feature, layer) {
          const uv = Number(feature.properties.uv);
          uvByNumber.set(uv, layer);
          layer.bindTooltip(`UV ${uv}`, { sticky: true });
          layer.on("click", () => layer.bindPopup(popupForUv(uv)).openPopup());
        },
      }).addTo(map);
      map.fitBounds(districtLayer.getBounds(), { padding: [12, 12] });
      root.setTimeout(() => map.invalidateSize(), 0);
      bindFilters();
      refresh();
      return true;
    } catch (error) {
      console.error("Mapa interactivo no disponible", error);
      target.hidden = true;
      if (fallback) fallback.hidden = false;
      return false;
    }
  }

  return { initialize, setData, selectBarrio, truckColor, barriosForUv, sequenceFor, filterBarrios };
});
