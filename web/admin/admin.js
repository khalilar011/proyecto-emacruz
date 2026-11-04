"use strict";

const config = window.ALERTA_RUTA_CONFIG || {};
const incidentUtils = window.AlertaRutaIncidents;
const adminCore = window.AlertaRutaAdminCore;
const reasonLabels = {
  LLUVIA: "Lluvia", FALLA_MECANICA: "Falla mecánica",
  PROBLEMA_TECNICO: "Problema técnico", OTRO: "Otro",
};
const elements = Object.fromEntries([
  "setup-panel", "login-panel", "login-form", "login-email", "login-password", "login-message",
  "dashboard", "session-user", "logout", "incident-form", "incident-id", "form-title", "cancel-edit",
  "target-type", "target-id", "neighborhoods", "incident-state", "reason-code", "reason-detail",
  "delay-minutes", "starts-at", "expires-at", "notes", "scope-preview", "publish-button", "form-message",
  "status-filter", "alerts-body", "alerts-message",
].map((id) => [id.replaceAll("-", "_"), document.getElementById(id)]));

let client;
let catalog = { barrios: [], servicios: [] };
let incidents = [];
let realtimeChannel;
let refreshTimer;
let currentUser;

function configured() {
  return adminCore.isConfigured(config, window.supabase);
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz", dateStyle: "short", timeStyle: "short",
  }).format(new Date(value));
}

function toLocalInput(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).filter((item) => item.type !== "literal").map((item) => [item.type, item.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function inputToIso(value) {
  const parsed = new Date(`${value}:00-04:00`);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error("Fecha u hora inválida");
  return parsed.toISOString();
}

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function selectedNeighborhoods() {
  return [...elements.neighborhoods.selectedOptions].map((item) => item.value);
}

function updateTargetOptions(preferred) {
  const previous = preferred || elements.target_id.value;
  elements.target_id.replaceChildren();
  if (elements.target_type.value === "truck") {
    [...new Set(catalog.servicios.map((item) => item.camion))].sort().forEach((truck) => elements.target_id.append(option(truck, truck)));
  } else {
    catalog.servicios.forEach((service) => {
      const barrio = catalog.barrios.find((item) => item.id === service.barrio_id);
      elements.target_id.append(option(service.id, `${service.id} · ${barrio?.nombre || service.barrio_id} · ${service.dia_nombre} ${service.inicio}`));
    });
  }
  if ([...elements.target_id.options].some((item) => item.value === previous)) elements.target_id.value = previous;
  updateScope();
}

function currentScope() {
  try {
    return incidentUtils.buildScope(
      catalog.servicios, elements.target_type.value, elements.target_id.value,
      selectedNeighborhoods(), inputToIso(elements.starts_at.value), inputToIso(elements.expires_at.value),
    );
  } catch (_) { return { servicios: [], barrios: [], camiones: [] }; }
}

function updateScope() {
  const scope = currentScope();
  elements.scope_preview.replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = scope.servicios.length
    ? `${scope.servicios.length} servicio(s) y ${scope.barrios.length} barrio(s) afectados`
    : "Ningún servicio coincide con el objetivo y la vigencia";
  const detail = document.createElement("p");
  detail.textContent = scope.servicios.length
    ? `Servicios: ${scope.servicios.join(", ")}. Los horarios originales no se modifican.`
    : "Ajusta inicio, vencimiento, objetivo o barrios. No se puede publicar una alerta sin servicios concretos.";
  detail.style.margin = "5px 0 0";
  elements.scope_preview.append(strong, detail);
}

function resetForm() {
  elements.incident_form.reset();
  elements.incident_id.value = "";
  elements.target_type.value = "truck";
  elements.incident_state.value = "DEMORA";
  elements.reason_code.value = "LLUVIA";
  elements.reason_detail.value = "Lluvia";
  elements.delay_minutes.value = "45";
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
  elements.starts_at.value = toLocalInput(now);
  elements.expires_at.value = toLocalInput(new Date(now.getTime() + 4 * 3600000));
  elements.form_title.textContent = "Nueva alerta";
  elements.publish_button.textContent = "Publicar alerta";
  elements.cancel_edit.hidden = true;
  setMessage(elements.form_message, "");
  updateTargetOptions();
  updateStateFields();
}

function updateStateFields() {
  const delay = elements.incident_state.value === "DEMORA";
  elements.delay_minutes.disabled = !delay;
  if (!delay) elements.delay_minutes.value = "";
  updateScope();
}

async function loadCatalog() {
  const response = await fetch("../data/distrito-2.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el catálogo de programación");
  catalog = await response.json();
  if (catalog.barrios.length !== 26 || catalog.servicios.length !== 104) throw new Error("Catálogo incompleto");
  elements.neighborhoods.replaceChildren(...catalog.barrios.map((item) => option(item.id, `${item.nombre} · UV ${item.uv}`)));
  resetForm();
}

function td(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderIncidents() {
  elements.alerts_body.replaceChildren();
  const filter = elements.status_filter.value;
  const filtered = incidents.filter((row) => filter === "TODAS" || incidentUtils.classify(row) === filter);
  for (const row of filtered) {
    const lifecycle = incidentUtils.classify(row);
    const tr = document.createElement("tr");
    const statusCell = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = `status-pill ${lifecycle}`;
    pill.textContent = lifecycle;
    const state = document.createElement("small");
    state.textContent = row.state;
    statusCell.append(pill, state);
    const targetCell = td(`${row.primary_target_type === "truck" ? "Camión" : "Servicio"}: ${row.primary_target_id}`);
    const scope = document.createElement("small");
    scope.textContent = `${(row.affected_service_ids || []).length} servicio(s) · ${(row.affected_neighborhood_ids || []).length} barrio(s)`;
    targetCell.append(scope);
    const reasonCell = td(row.reason_detail);
    const reasonCode = document.createElement("small");
    reasonCode.textContent = reasonLabels[row.reason_code] || row.reason_code;
    reasonCell.append(reasonCode);
    const actions = document.createElement("td");
    actions.className = "row-actions";
    const edit = document.createElement("button");
    edit.type = "button"; edit.textContent = "Editar"; edit.disabled = lifecycle === "RETIRADA";
    edit.addEventListener("click", () => editIncident(row));
    const withdraw = document.createElement("button");
    withdraw.type = "button"; withdraw.textContent = "Retirar"; withdraw.className = "withdraw"; withdraw.disabled = lifecycle === "RETIRADA";
    withdraw.addEventListener("click", () => retireIncident(row));
    actions.append(edit, withdraw);
    tr.append(statusCell, targetCell, reasonCell, td(row.estimated_delay_minutes ? `${row.estimated_delay_minutes} min` : "—"), td(formatDate(row.published_at)), actions);
    elements.alerts_body.append(tr);
  }
  setMessage(elements.alerts_message, `${filtered.length} de ${incidents.length} incidencias. Actualizado ${formatDate(new Date())}.`, true);
}

async function loadIncidents() {
  const { data, error } = await client.from("incidents").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  incidents = data || [];
  renderIncidents();
}

function editIncident(row) {
  elements.incident_id.value = row.id;
  elements.target_type.value = row.primary_target_type;
  updateTargetOptions(row.primary_target_id);
  for (const item of elements.neighborhoods.options) item.selected = (row.affected_neighborhood_ids || []).includes(item.value);
  elements.incident_state.value = row.state;
  elements.reason_code.value = row.reason_code;
  elements.reason_detail.value = row.reason_detail;
  elements.delay_minutes.value = row.estimated_delay_minutes || "";
  elements.starts_at.value = toLocalInput(new Date(row.starts_at));
  elements.expires_at.value = toLocalInput(new Date(row.expires_at));
  elements.notes.value = row.notes || "";
  elements.form_title.textContent = "Modificar alerta";
  elements.publish_button.textContent = "Guardar cambios";
  elements.cancel_edit.hidden = false;
  updateStateFields();
  document.querySelector(".admin-card").scrollIntoView({ behavior: "smooth" });
}

async function retireIncident(row) {
  if (!window.confirm(`¿Retirar la alerta ${row.id}? Dejará de mostrarse a los vecinos y permanecerá en el historial.`)) return;
  setMessage(elements.alerts_message, "Retirando alerta…");
  const { error } = await adminCore.retireIncident(client, row.id);
  if (error) { setMessage(elements.alerts_message, error.message); return; }
  await loadIncidents();
}

async function saveIncident(event) {
  event.preventDefault();
  setMessage(elements.form_message, "");
  const scope = currentScope();
  if (!scope.servicios.length) {
    setMessage(elements.form_message, "No hay servicios programados dentro de esa vigencia. Revisa las fechas y el objetivo.");
    return;
  }
  const start = inputToIso(elements.starts_at.value);
  const end = inputToIso(elements.expires_at.value);
  if (Date.parse(start) >= Date.parse(end)) { setMessage(elements.form_message, "El vencimiento debe ser posterior al inicio."); return; }
  const delay = elements.delay_minutes.value ? Number(elements.delay_minutes.value) : null;
  const params = {
    p_state: elements.incident_state.value,
    p_reason_code: elements.reason_code.value,
    p_reason_detail: elements.reason_detail.value.trim(),
    p_estimated_delay_minutes: delay,
    p_starts_at: start,
    p_expires_at: end,
    p_notes: elements.notes.value.trim() || null,
    p_target_type: elements.target_type.value,
    p_target_id: elements.target_id.value,
    p_service_ids: scope.servicios,
  };
  elements.publish_button.disabled = true;
  setMessage(elements.form_message, elements.incident_id.value ? "Guardando cambios…" : "Publicando alerta…");
  const editing = Boolean(elements.incident_id.value);
  const { error } = await adminCore.saveIncident(client, elements.incident_id.value, params);
  elements.publish_button.disabled = false;
  if (error) { setMessage(elements.form_message, error.message); return; }
  resetForm();
  setMessage(elements.form_message, editing ? "Alerta actualizada." : "Alerta publicada.", true);
  await loadIncidents();
}

async function showSession(session) {
  if (!session?.user) {
    currentUser = null;
    elements.dashboard.hidden = true;
    elements.login_panel.hidden = false;
    elements.logout.hidden = true;
    elements.session_user.textContent = "";
    return;
  }
  const access = await adminCore.membership(client, session.user.id);
  if (!access.authorized) {
    await adminCore.signOut(client);
    setMessage(elements.login_message, "La cuenta es válida, pero no está autorizada como administradora.");
    return;
  }
  currentUser = session.user;
  elements.login_panel.hidden = true;
  elements.dashboard.hidden = false;
  elements.logout.hidden = false;
  elements.session_user.textContent = access.profile.display_name || session.user.email;
  await loadIncidents();
  if (!realtimeChannel) {
    realtimeChannel = client.channel("admin-incidents").on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, loadIncidents).subscribe();
    refreshTimer = window.setInterval(loadIncidents, Math.max(30, Number(config.refreshSeconds) || 60) * 1000);
  }
}

async function initialize() {
  if (!configured()) { elements.setup_panel.hidden = false; return; }
  try {
    await loadCatalog();
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const { data } = await client.auth.getSession();
    await showSession(data.session);
    client.auth.onAuthStateChange((_event, session) => window.setTimeout(() => showSession(session), 0));
  } catch (error) {
    elements.setup_panel.hidden = false;
    elements.setup_panel.querySelector("p:not(.eyebrow)").textContent = `No se pudo preparar el panel: ${error.message}`;
  }
}

elements.login_form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(elements.login_message, "Verificando…");
  const { error } = await adminCore.signIn(client, elements.login_email.value.trim(), elements.login_password.value);
  if (error) setMessage(elements.login_message, "No se pudo iniciar sesión. Verifica las credenciales y la autorización.");
});
elements.logout.addEventListener("click", async () => { await adminCore.signOut(client); });
elements.incident_form.addEventListener("submit", saveIncident);
elements.cancel_edit.addEventListener("click", resetForm);
elements.target_type.addEventListener("change", () => updateTargetOptions());
[elements.target_id, elements.neighborhoods, elements.starts_at, elements.expires_at].forEach((item) => item.addEventListener("change", updateScope));
elements.incident_state.addEventListener("change", updateStateFields);
elements.reason_code.addEventListener("change", () => { elements.reason_detail.value = reasonLabels[elements.reason_code.value]; });
elements.status_filter.addEventListener("change", renderIncidents);
window.addEventListener("beforeunload", () => { if (refreshTimer) clearInterval(refreshTimer); if (realtimeChannel) client?.removeChannel(realtimeChannel); });

initialize();
