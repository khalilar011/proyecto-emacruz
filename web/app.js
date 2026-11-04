"use strict";

const DATA_URL = "data/distrito-2.json";
const dayOrder = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const dayLabels = { lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue", viernes: "Vie", sabado: "Sáb", domingo: "Dom" };
const stateLabels = { NORMAL: "Normal", DEMORA: "Demora", SERVICIO_SUSPENDIDO: "Servicio suspendido" };
const utils = window.AlertaRutaSchedule;
const incidentUtils = window.AlertaRutaIncidents;

const elements = Object.fromEntries(
  [
    "barrio-count", "barrio-search", "barrio-select", "search-status", "empty-state", "result", "result-id",
    "result-name", "result-uv", "result-frequency", "service-status", "status-title", "status-badge", "status-message",
    "status-details", "status-disclaimer", "next-service", "next-time", "next-truck", "coverage-uv", "map-reference",
    "week-grid", "load-error", "selected-map-hint", "main-map", "map-tabs", "open-map", "map-dialog", "dialog-title",
    "dialog-image", "close-map", "incident-source", "map-truck-filter",
  ].map((id) => [id.replaceAll("-", "_"), document.getElementById(id)]),
);

let barrios = [];
let incidents = [];
let maps = [];
let selectedBarrio = null;
let selectedMap = null;
let zoom = 1;
let alertsUpdated = null;
let services = [];

function formatDateTime(value) {
  if (!value) return "No indicada";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));
}

function escapeText(value) {
  return String(value ?? "");
}

function populateSelect(filtered = barrios) {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = filtered.length ? "Elige un barrio" : "Sin coincidencias";
  elements.barrio_select.replaceChildren(placeholder);
  for (const barrio of filtered) {
    const option = document.createElement("option");
    option.value = barrio.id;
    option.textContent = `${barrio.nombre} · UV ${barrio.uv}`;
    elements.barrio_select.append(option);
  }
}

function filterBarrios() {
  showEmpty();
  const query = utils.normalizeText(elements.barrio_search.value);
  const filtered = barrios.filter((item) => utils.normalizeText(item.nombre).includes(query));
  populateSelect(filtered);
  if (!query) {
    elements.search_status.textContent = `${barrios.length} barrios disponibles.`;
  } else if (filtered.length) {
    elements.search_status.textContent = `${filtered.length} coincidencia${filtered.length === 1 ? "" : "s"}. Elige la correcta para ver su ficha.`;
  } else {
    elements.search_status.textContent = "Ese barrio no está disponible en el prototipo del Distrito 2. No se muestran datos inventados.";
    showEmpty();
  }
}

function showEmpty() {
  selectedBarrio = null;
  window.AlertaRutaMap?.selectBarrio(null, false);
  elements.result.hidden = true;
  elements.empty_state.hidden = false;
}

function renderStatus(barrio) {
  const incident = incidentUtils.statusForBarrio(incidents, barrio, new Date());
  const state = incident?.estado || "NORMAL";
  elements.service_status.className = `status-card ${state === "DEMORA" ? "status-delay" : state === "SERVICIO_SUSPENDIDO" ? "status-suspended" : "status-normal"}`;
  elements.status_title.textContent = stateLabels[state];
  elements.status_badge.textContent = state;
  elements.status_details.replaceChildren();
  if (!incident) {
    elements.status_message.textContent = "No hay demora prevista";
    const update = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = "Última actualización del registro: ";
    update.append(strong, document.createTextNode(alertsUpdated ? formatDateTime(alertsUpdated) : "Sin incidencias publicadas"));
    elements.status_details.append(update);
    elements.status_disclaimer.textContent = "Se refiere a incidencias registradas en este prototipo, no a una confirmación operativa en tiempo real.";
    return;
  }
  elements.status_message.textContent = state === "SERVICIO_SUSPENDIDO"
    ? "El servicio programado está suspendido en este prototipo. Conserva tus residuos hasta una nueva actualización."
    : state === "DEMORA" ? `Demora registrada: ${incident.motivo}` : "No hay demora prevista";
  const details = [
    ["Motivo", incident.motivo],
    ["Retraso estimado", incident.estimacion_minutos ? `${incident.estimacion_minutos} minutos` : "No indicado"],
    ["Actualización", formatDateTime(incident.actualizada_en)],
    ["Vence", formatDateTime(incident.vence)],
    ["Camiones afectados", (incident.objetivos.camiones || []).join(", ") || "No indicados"],
    ["Barrios afectados", (incident.objetivos.barrios || []).map((id) => barrios.find((item) => item.id === id)?.nombre || id).join(", ") || "Según asignación del objetivo"],
  ];
  for (const [label, value] of details) {
    const item = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    item.append(strong, document.createTextNode(escapeText(value)));
    elements.status_details.append(item);
  }
  elements.status_disclaimer.textContent = "SIMULACIÓN ACADÉMICA — NO ES UN AVISO OFICIAL. Incidencia manual; no es telemetría ni confirmación de EMACRUZ.";
}

function renderNext(barrio) {
  const next = utils.nextService(barrio, new Date());
  if (!next) {
    elements.next_service.textContent = "No disponible";
    elements.next_time.textContent = "No se encontró otro servicio en la semana tipo.";
    elements.next_truck.textContent = "—";
    return;
  }
  const [year, month, day] = next.fecha.split("-");
  elements.next_service.textContent = next.en_curso ? "En curso según la programación" : next.dia_nombre;
  elements.next_time.textContent = `${day}/${month}/${year} · ${next.inicio}–${next.fin} (hora de Santa Cruz)`;
  elements.next_truck.textContent = next.camion;
}

function renderWeek(barrio) {
  elements.week_grid.replaceChildren();
  for (const day of dayOrder) {
    const service = barrio.horarios[day];
    const card = document.createElement("div");
    card.className = `day-card${service ? " active" : ""}`;
    const name = document.createElement("strong");
    name.textContent = dayLabels[day];
    const time = document.createElement("span");
    time.textContent = service ? `${service.inicio}–${service.fin}` : "Sin servicio";
    card.append(name, time);
    if (service) {
      const truck = document.createElement("span");
      truck.className = "truck";
      truck.textContent = service.camion;
      card.append(truck);
    }
    elements.week_grid.append(card);
  }
}

function renderBarrio(barrio) {
  selectedBarrio = barrio;
  elements.result_id.textContent = `${barrio.id} · dato simulado`;
  elements.result_name.textContent = barrio.nombre;
  elements.result_uv.textContent = `Unidad Vecinal ${barrio.uv}`;
  elements.result_frequency.textContent = String(barrio.frecuencia_semanal);
  elements.coverage_uv.textContent = String(barrio.uv);
  elements.map_reference.textContent = `En el mapa figura como “${barrio.nombre_mapa}”.`;
  elements.selected_map_hint.textContent = `Referencia seleccionada: ${barrio.nombre_mapa}, UV ${barrio.uv}. Abre el mapa y busca ese rótulo.`;
  renderStatus(barrio);
  renderNext(barrio);
  renderWeek(barrio);
  window.AlertaRutaMap?.selectBarrio(barrio.id);
  elements.empty_state.hidden = true;
  elements.result.hidden = false;
}

function selectMap(map) {
  selectedMap = map;
  elements.main_map.src = map.archivo;
  elements.main_map.alt = map.titulo;
  elements.dialog_image.src = map.archivo;
  elements.dialog_image.alt = `${map.titulo}, ampliado`;
  elements.dialog_title.textContent = map.titulo;
  for (const button of elements.map_tabs.querySelectorAll("button")) button.classList.toggle("active", button.dataset.mapId === map.id);
  resetZoom();
}

function renderMaps() {
  elements.map_tabs.replaceChildren();
  for (const map of maps) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mapId = map.id;
    button.textContent = map.titulo;
    button.addEventListener("click", () => selectMap(map));
    elements.map_tabs.append(button);
  }
  selectMap(maps[0]);
}

function resetZoom() {
  zoom = 1;
  elements.dialog_image.style.width = "100%";
  const reset = document.querySelector('[data-zoom="reset"]');
  if (reset) reset.textContent = "100%";
}

function changeZoom(delta) {
  zoom = Math.min(3, Math.max(0.75, zoom + delta));
  elements.dialog_image.style.width = `${zoom * 100}%`;
  document.querySelector('[data-zoom="reset"]').textContent = `${Math.round(zoom * 100)}%`;
}

async function load() {
  try {
    const dataResponse = await fetch(DATA_URL, { cache: "no-store" });
    if (!dataResponse.ok) throw new Error(`HTTP ${dataResponse.status}`);
    const data = await dataResponse.json();
    if (!Array.isArray(data.barrios) || data.barrios.length !== 26 || !Array.isArray(data.servicios)) throw new Error("Estructura JSON inesperada");
    barrios = data.barrios;
    services = data.servicios;
    maps = data.mapas;
    populateSelect();
    renderMaps();
    const trucks = [...new Set(services.map((item) => item.camion))].sort();
    for (const truck of trucks) {
      const option = document.createElement("option");
      option.value = truck;
      option.textContent = truck;
      elements.map_truck_filter.append(option);
    }
    elements.barrio_count.textContent = String(barrios.length);
    elements.barrio_search.disabled = false;
    elements.barrio_select.disabled = false;
    elements.search_status.textContent = `${barrios.length} barrios disponibles.`;
    await window.AlertaRutaMap.initialize({ onSelect: (id) => {
      const barrio = barrios.find((item) => item.id === id);
      if (!barrio) return;
      elements.barrio_select.value = id;
      renderBarrio(barrio);
      document.getElementById("consulta").scrollIntoView({ behavior: "smooth", block: "start" });
    } });
    window.AlertaRutaMap.setData(barrios, services, incidents);
    await window.AlertaRutaData.start(async (update) => {
      incidents = update.incidents;
      alertsUpdated = update.updatedAt;
      elements.incident_source.textContent = update.mode === "supabase"
        ? "Fuente de incidencias: Supabase · actualización automática activa."
        : `Fuente de incidencias: respaldo JSON local.${update.warning ? ` ${update.warning}` : ""}`;
      window.AlertaRutaMap.setData(barrios, services, incidents);
      if (selectedBarrio) renderStatus(selectedBarrio);
    });
  } catch (error) {
    console.error(error);
    elements.barrio_search.disabled = true;
    elements.barrio_select.disabled = true;
    elements.empty_state.hidden = true;
    elements.load_error.hidden = false;
    elements.search_status.textContent = "Los datos no están disponibles.";
  }
}

elements.barrio_search.addEventListener("input", filterBarrios);
elements.barrio_select.addEventListener("change", (event) => {
  const barrio = barrios.find((item) => item.id === event.target.value);
  if (barrio) renderBarrio(barrio); else showEmpty();
});
elements.open_map.addEventListener("click", () => elements.map_dialog.showModal());
elements.close_map.addEventListener("click", () => elements.map_dialog.close());
elements.map_dialog.addEventListener("click", (event) => { if (event.target === elements.map_dialog) elements.map_dialog.close(); });
document.querySelector('[data-zoom="in"]').addEventListener("click", () => changeZoom(0.25));
document.querySelector('[data-zoom="out"]').addEventListener("click", () => changeZoom(-0.25));
document.querySelector('[data-zoom="reset"]').addEventListener("click", resetZoom);

load();
