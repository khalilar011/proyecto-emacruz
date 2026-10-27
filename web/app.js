"use strict";

const DATA_URL = "data/frecuencias.json";
const MISSING_VALUES = new Set([
  "",
  "no indicado",
  "no indicada",
  "no indicados",
  "no indicadas",
]);

const DAY_LABELS = [
  ["lun", "Lun"],
  ["mar", "Mar"],
  ["mie", "Mié"],
  ["jue", "Jue"],
  ["vie", "Vie"],
  ["sab", "Sáb"],
  ["dom", "Dom"],
];

const elements = {
  select: document.querySelector("#zone-select"),
  loadStatus: document.querySelector("#load-status"),
  recordCount: document.querySelector("#record-count"),
  emptyState: document.querySelector("#empty-state"),
  resultCard: document.querySelector("#result-card"),
  errorPanel: document.querySelector("#error-panel"),
  recordId: document.querySelector("#record-id"),
  zone: document.querySelector("#result-zone"),
  zoneDetail: document.querySelector("#result-zone-detail"),
  area: document.querySelector("#result-area"),
  areaDetail: document.querySelector("#result-area-detail"),
  sector: document.querySelector("#result-sector"),
  districts: document.querySelector("#result-districts"),
  shift: document.querySelector("#result-shift"),
  days: document.querySelector("#result-days"),
  holiday: document.querySelector("#holiday-detail"),
  time: document.querySelector("#schedule-time"),
  weekDays: document.querySelector("#week-days"),
  reviewNote: document.querySelector("#review-note"),
  reviewNoteText: document.querySelector("#review-note-text"),
};

let frequencies = [];

function isMissing(value) {
  return MISSING_VALUES.has(String(value ?? "").trim().toLowerCase());
}

function displayValue(value) {
  return isMissing(value) ? "No indicado" : String(value).trim();
}

function buildOptionLabel(record) {
  const qualifiers = [displayValue(record.sector)];
  if (!isMissing(record.distritos)) {
    qualifiers.push(displayValue(record.distritos));
  }
  return `${displayValue(record.zona)} — ${displayValue(record.area)} · ${qualifiers.join(
    " · ",
  )} (${record.id})`;
}

function createTimeItem(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "time-item";

  const labelElement = document.createElement("span");
  labelElement.className = "time-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.className = "time-value";
  valueElement.textContent = value;

  wrapper.append(labelElement, valueElement);
  return wrapper;
}

function renderTime(record) {
  const startMissing = isMissing(record.inicio);
  const endMissing = isMissing(record.fin);
  elements.time.replaceChildren();
  elements.time.classList.toggle("single", startMissing === endMissing);

  if (startMissing && endMissing) {
    elements.time.append(createTimeItem("Horario", "No indicado"));
    return;
  }

  if (!startMissing && !endMissing) {
    elements.time.append(
      createTimeItem("Horario", `${displayValue(record.inicio)} – ${displayValue(record.fin)}`),
    );
    return;
  }

  elements.time.append(
    createTimeItem("Inicio", displayValue(record.inicio)),
    createTimeItem("Fin", displayValue(record.fin)),
  );
}

function renderWeek(record) {
  elements.weekDays.replaceChildren();
  for (const [key, label] of DAY_LABELS) {
    const active = Boolean(record.dias?.[key]);
    const day = document.createElement("div");
    day.className = `day-pill${active ? " active" : ""}`;
    day.setAttribute("aria-label", `${label}: ${active ? "con recolección" : "sin recolección"}`);

    const dayName = document.createElement("strong");
    dayName.textContent = label;
    const marker = document.createElement("span");
    marker.textContent = active ? "✓" : "";
    day.append(dayName, marker);
    elements.weekDays.append(day);
  }
}

function renderRecord(record) {
  elements.recordId.textContent = `Registro ${record.id} · fila ${record.fila_origen} del Excel`;
  elements.zone.textContent = displayValue(record.zona);
  elements.zoneDetail.textContent = displayValue(record.zona);
  elements.area.textContent = displayValue(record.area);
  elements.areaDetail.textContent = displayValue(record.area);
  elements.sector.textContent = displayValue(record.sector);
  elements.districts.textContent = displayValue(record.distritos);
  elements.shift.textContent = displayValue(record.turno);
  elements.days.textContent = displayValue(record.dias_publicados);
  elements.holiday.textContent = `Feriados: ${displayValue(record.feriados)}`;

  renderTime(record);
  renderWeek(record);

  const usefulNote = !isMissing(record.nota_revision) && record.nota_revision !== "Sin observación";
  elements.reviewNote.hidden = !usefulNote;
  elements.reviewNoteText.textContent = usefulNote ? record.nota_revision : "";

  elements.emptyState.hidden = true;
  elements.errorPanel.hidden = true;
  elements.resultCard.hidden = false;
}

function populateSelect(records) {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Elige una zona para consultar";
  elements.select.replaceChildren(placeholder);

  for (const record of records) {
    const option = document.createElement("option");
    option.value = record.id;
    option.textContent = buildOptionLabel(record);
    elements.select.append(option);
  }

  elements.select.disabled = false;
}

async function loadFrequencies() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Respuesta HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload.frecuencias) || payload.frecuencias.length === 0) {
      throw new Error("El JSON no contiene frecuencias");
    }

    frequencies = payload.frecuencias;
    populateSelect(frequencies);
    elements.recordCount.textContent = String(frequencies.length);
    elements.loadStatus.textContent = `${frequencies.length} opciones disponibles. Cada una corresponde a una fila del Excel.`;
  } catch (error) {
    console.error("No fue posible cargar las frecuencias:", error);
    elements.select.replaceChildren();
    elements.select.disabled = true;
    elements.loadStatus.textContent = "La información no está disponible.";
    elements.emptyState.hidden = true;
    elements.resultCard.hidden = true;
    elements.errorPanel.hidden = false;
  }
}

elements.select.addEventListener("change", (event) => {
  const record = frequencies.find((item) => item.id === event.target.value);
  if (record) {
    renderRecord(record);
  } else {
    elements.resultCard.hidden = true;
    elements.emptyState.hidden = false;
  }
});

loadFrequencies();
