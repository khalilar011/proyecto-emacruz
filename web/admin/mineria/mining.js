"use strict";

const config = window.ALERTA_RUTA_CONFIG || {};
const adminCore = window.AlertaRutaAdminCore;
const elements = Object.fromEntries([
  "setup-panel", "access-panel", "access-message", "dashboard", "session-user", "logout",
  "refresh-analysis", "analysis-message", "mode-notice", "data-mode", "period-start", "period-end",
  "neighborhood-filter", "truck-filter", "min-support", "min-confidence", "min-lift", "max-rules",
  "kpi-incidents", "kpi-neighborhoods", "kpi-trucks", "kpi-reason", "kpi-delay", "kpi-rules",
  "kpi-updated", "kpi-execution", "programmed-services", "affected-services", "retired-incidents",
  "neighborhood-comparison", "truck-comparison", "rule-count", "rule-intro", "rules-list", "findings-list",
].map((id) => [id.replaceAll("-", "_"), document.getElementById(id)]));

let client;
let charts = {};
let catalog = { barrios: [], servicios: [] };

function setMessage(message, error = false) {
  elements.analysis_message.textContent = message;
  elements.analysis_message.classList.toggle("error", error);
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("es-BO", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(value));
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));
}

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

async function loadCatalog() {
  const response = await fetch("../../data/distrito-2.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el catálogo");
  catalog = await response.json();
  if (catalog.barrios.length !== 26 || catalog.servicios.length !== 104) throw new Error("El catálogo no conserva 26 barrios y 104 servicios");
  const neighborhoods = [...catalog.barrios].sort((left, right) => left.nombre.localeCompare(right.nombre, "es"));
  elements.neighborhood_filter.append(...neighborhoods.map((item) => option(item.id, item.nombre)));
  const trucks = [...new Set(catalog.servicios.map((item) => item.camion))].sort();
  elements.truck_filter.append(...trucks.map((truck) => option(truck, truck)));
}

function showModeNotice(mode, recordCount = null) {
  elements.mode_notice.replaceChildren();
  const strong = document.createElement("strong");
  const detail = document.createElement("span");
  if (mode === "demo") {
    elements.mode_notice.className = "mode-notice demo";
    strong.textContent = "DATOS SINTÉTICOS — DEMOSTRACIÓN ACADÉMICA";
    detail.textContent = "Dataset reproducible con semilla fija; no se inserta ni se mezcla con public.incidents.";
  } else {
    elements.mode_notice.className = "mode-notice history";
    strong.textContent = "HISTORIAL REGISTRADO DEL PROTOTIPO";
    detail.textContent = recordCount === null
      ? "Sólo incidencias almacenadas; no se presenta como dato operativo real de EMACRUZ."
      : `${recordCount} incidencias únicas analizadas; incluye retiradas y usa la versión actual de cada ID.`;
  }
  elements.mode_notice.append(strong, detail);
}

function chartConfig(type, rows, options = {}) {
  const colors = ["#087557", "#e9a825", "#2376a8", "#8a5da8", "#c65f4b", "#5f8f73", "#c28435"];
  return {
    type,
    data: {
      labels: rows.map((row) => row.label),
      datasets: [{
        label: "Incidencias",
        data: rows.map((row) => row.count),
        backgroundColor: type === "doughnut" ? rows.map((_, index) => colors[index % colors.length]) : "rgba(8, 117, 87, .76)",
        borderColor: type === "line" ? "#087557" : "rgba(7, 95, 75, .9)",
        borderWidth: type === "line" ? 3 : 1,
        pointBackgroundColor: "#087557",
        tension: .25,
        fill: type === "line",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: options.horizontal ? "y" : "x",
      plugins: {
        legend: { display: type === "doughnut", position: "bottom" },
        tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw} incidencia(s)` } },
      },
      scales: type === "doughnut" ? {} : {
        y: options.horizontal ? { beginAtZero: true, ticks: { precision: 0 } } : { beginAtZero: true, ticks: { precision: 0 } },
        x: options.horizontal ? { beginAtZero: true, ticks: { precision: 0 } } : {},
      },
    },
  };
}

function renderChart(id, type, rows, options = {}) {
  if (!window.Chart) throw new Error("Chart.js no está disponible");
  if (charts[id]) charts[id].destroy();
  const canvas = document.getElementById(id);
  charts[id] = new window.Chart(canvas, chartConfig(type, rows || [], options));
}

function cell(text, label) {
  const item = document.createElement("td");
  item.textContent = text;
  item.dataset.label = label;
  return item;
}

function renderComparison(body, rows, firstLabel) {
  body.replaceChildren();
  for (const row of (rows || []).slice(0, 12)) {
    const tr = document.createElement("tr");
    tr.append(
      cell(row.label, firstLabel),
      cell(formatNumber(row.count), "Incidencias"),
      cell(formatNumber(row.programmed_services), "Programados"),
      cell(row.incidents_per_100_programmed === null ? "—" : formatNumber(row.incidents_per_100_programmed, 1), "Por 100"),
    );
    body.append(tr);
  }
}

function renderRules(run) {
  const rules = Array.isArray(run.association_rules) ? run.association_rules : [];
  const total = Number(run.indicators?.association_rules || rules.length);
  elements.rule_count.textContent = `${total} regla${total === 1 ? "" : "s"}`;
  elements.rule_intro.textContent = run.unit_of_analysis || "Una transacción por incidencia única.";
  elements.rules_list.replaceChildren();
  if (!rules.length) {
    const empty = document.createElement("div");
    empty.className = "empty-rules";
    empty.textContent = run.record_count < 10
      ? "Datos insuficientes para generar reglas confiables con el mínimo de transacciones configurado."
      : "Ninguna asociación supera simultáneamente los umbrales de soporte, confianza y lift.";
    elements.rules_list.append(empty);
    return;
  }
  for (const rule of rules) {
    const card = document.createElement("article");
    card.className = "rule-card";
    const title = document.createElement("h3");
    title.append(document.createTextNode(rule.antecedent_label || rule.antecedent.join(" + ")));
    const arrow = document.createElement("span");
    arrow.textContent = " → ";
    title.append(arrow, document.createTextNode(rule.consequent_label || rule.consequent.join(" + ")));
    const metrics = document.createElement("div");
    metrics.className = "rule-metrics";
    [
      `Soporte ${(Number(rule.support) * 100).toFixed(1)} %`,
      `Confianza ${(Number(rule.confidence) * 100).toFixed(1)} %`,
      `Lift ${Number(rule.lift).toFixed(2)}`,
      `${rule.support_count} transacciones`,
    ].forEach((text) => {
      const pill = document.createElement("span");
      pill.textContent = text;
      metrics.append(pill);
    });
    const interpretation = document.createElement("p");
    interpretation.textContent = rule.interpretation;
    card.append(title, metrics, interpretation);
    elements.rules_list.append(card);
  }
}

function renderFindings(run) {
  elements.findings_list.replaceChildren();
  const findings = Array.isArray(run.findings) ? run.findings : [];
  for (const finding of findings) {
    const item = document.createElement("li");
    item.textContent = finding;
    elements.findings_list.append(item);
  }
}

function renderRun(run) {
  const indicators = run.indicators || {};
  const chartData = run.chart_data || {};
  showModeNotice(run.mode, run.record_count);
  elements.kpi_incidents.textContent = formatNumber(indicators.total_incidents);
  elements.kpi_neighborhoods.textContent = formatNumber(indicators.affected_neighborhoods);
  elements.kpi_trucks.textContent = formatNumber(indicators.affected_trucks);
  elements.kpi_reason.textContent = indicators.most_frequent_reason || "Sin datos";
  elements.kpi_delay.textContent = indicators.average_estimated_delay_minutes === null || indicators.average_estimated_delay_minutes === undefined
    ? "Sin estimaciones" : `${formatNumber(indicators.average_estimated_delay_minutes, 1)} min`;
  elements.kpi_rules.textContent = formatNumber(indicators.association_rules);
  elements.kpi_updated.textContent = formatDate(run.completed_at);
  elements.kpi_execution.textContent = run.execution_type === "scheduled" ? "Ejecución semanal automática" : "Actualización manual";
  elements.programmed_services.textContent = formatNumber(indicators.programmed_services_in_period);
  elements.affected_services.textContent = formatNumber(indicators.affected_programmed_service_occurrences);
  elements.retired_incidents.textContent = formatNumber(indicators.retired_incidents);

  renderChart("neighborhood-chart", "bar", chartData.neighborhoods || [], { horizontal: true });
  renderChart("truck-chart", "bar", chartData.trucks || []);
  renderChart("reason-chart", "doughnut", chartData.reasons || []);
  renderChart("weekday-chart", "bar", chartData.weekdays || []);
  renderChart("shift-chart", "bar", chartData.shifts || []);
  renderChart("timeline-chart", "line", chartData.timeline || []);
  renderChart("duration-chart", "bar", chartData.durations || []);
  renderComparison(elements.neighborhood_comparison, chartData.neighborhoods, "Barrio");
  renderComparison(elements.truck_comparison, chartData.trucks, "Camión");
  renderRules(run);
  renderFindings(run);
}

async function loadLatest() {
  setMessage("Cargando el último análisis persistido…");
  const mode = elements.data_mode.value;
  showModeNotice(mode);
  const { data, error } = await client.from("mining_analysis_runs")
    .select("*")
    .eq("mode", mode)
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    setMessage(`No se pudo consultar el análisis: ${error.message}`, true);
    return;
  }
  if (!data) {
    setMessage("Todavía no existe un análisis persistido para este modo. Pulsa “Actualizar análisis”.");
    return;
  }
  try {
    renderRun(data);
    setMessage(`Resultado persistido cargado. Periodo: ${data.period_start || "sin inicio"} a ${data.period_end || "sin fin"}.`);
  } catch (error) {
    setMessage(`No se pudo dibujar el resultado: ${error.message}`, true);
  }
}

function requestBody() {
  const startDate = elements.period_start.value || null;
  const endDate = elements.period_end.value || null;
  if (startDate && endDate && startDate > endDate) throw new Error("La fecha inicial debe ser anterior o igual a la final.");
  return {
    mode: elements.data_mode.value,
    filters: {
      startDate,
      endDate,
      neighborhoodId: elements.neighborhood_filter.value || null,
      truckId: elements.truck_filter.value || null,
    },
    parameters: {
      minSupport: Number(elements.min_support.value),
      minConfidence: Number(elements.min_confidence.value),
      minLift: Number(elements.min_lift.value),
      maxRules: Number(elements.max_rules.value),
      maxItemsetSize: 3,
      minimumTransactions: 10,
    },
  };
}

async function edgeError(error) {
  try {
    if (error?.context instanceof Response) {
      const payload = await error.context.json();
      return payload.error || error.message;
    }
  } catch (_) { /* La respuesta puede no ser JSON. */ }
  return error?.message || "Error al actualizar. Intentar nuevamente.";
}

async function refreshAnalysis() {
  let body;
  try {
    body = requestBody();
  } catch (error) {
    setMessage(error.message, true);
    return;
  }
  elements.refresh_analysis.disabled = true;
  elements.refresh_analysis.textContent = "Calculando análisis…";
  setMessage("Calculando análisis en el servidor…");
  const { data, error } = await client.functions.invoke("mining-analysis", { body });
  elements.refresh_analysis.disabled = false;
  elements.refresh_analysis.textContent = "Actualizar análisis";
  if (error || !data?.run) {
    setMessage(await edgeError(error), true);
    return;
  }
  try {
    renderRun(data.run);
    setMessage(data.message || "Análisis actualizado correctamente.");
  } catch (renderError) {
    setMessage(`El análisis se guardó, pero no pudo mostrarse: ${renderError.message}`, true);
  }
}

async function initialize() {
  if (!adminCore?.isConfigured(config, window.supabase)) {
    elements.setup_panel.hidden = false;
    return;
  }
  try {
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session?.user) {
      window.location.replace("../");
      return;
    }
    const access = await adminCore.membership(client, sessionData.session.user.id);
    if (!access.authorized) {
      await adminCore.signOut(client);
      elements.access_message.textContent = "La cuenta autenticada no está incluida en admin_users.";
      elements.access_panel.hidden = false;
      return;
    }
    elements.session_user.textContent = access.profile.display_name || sessionData.session.user.email;
    elements.logout.hidden = false;
    elements.dashboard.hidden = false;
    await loadCatalog();
    await loadLatest();
  } catch (error) {
    elements.setup_panel.hidden = false;
    elements.setup_panel.querySelector("p:not(.eyebrow)").textContent = `No se pudo preparar el módulo: ${error.message}`;
  }
}

elements.refresh_analysis.addEventListener("click", refreshAnalysis);
elements.data_mode.addEventListener("change", loadLatest);
elements.logout.addEventListener("click", async () => {
  await adminCore.signOut(client);
  window.location.replace("../");
});

initialize();
