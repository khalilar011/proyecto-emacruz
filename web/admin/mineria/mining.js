"use strict";

const config = window.ALERTA_RUTA_CONFIG || {};
const adminCore = window.AlertaRutaAdminCore;
const miningView = window.AlertaRutaMiningView;
const elements = Object.fromEntries([
  "setup-panel", "access-panel", "access-message", "dashboard", "session-user", "logout",
  "refresh-analysis", "analysis-message", "mode-notice", "data-mode", "period-start", "period-end",
  "neighborhood-filter", "truck-filter", "min-support", "min-confidence", "min-lift", "max-rules",
  "kpi-incidents", "kpi-neighborhoods", "kpi-trucks", "kpi-reason", "kpi-delay", "kpi-rules",
  "kpi-updated", "kpi-execution", "kpi-records-label", "kpi-records-note",
  "analysis-period-status", "analysis-period-start", "analysis-period-end", "analysis-execution-at",
  "analysis-started-at", "analysis-execution-type", "programmed-services", "affected-services", "retired-incidents",
  "service-summary-note", "comparison-title", "comparison-note", "neighborhood-rate-heading", "truck-rate-heading",
  "neighborhood-comparison", "truck-comparison", "rule-count", "rule-intro", "rules-list", "findings-list",
].map((id) => [id.replaceAll("-", "_"), document.getElementById(id)]));

let client;
let charts = {};
let catalog = { barrios: [], servicios: [] };
let lastRenderedRun = null;

function setMessage(message, error = false) {
  elements.analysis_message.textContent = message;
  elements.analysis_message.classList.toggle("error", error);
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("es-BO", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(value));
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

function showModeNotice(mode, recordCount = null, generatedCount = 1_000_000) {
  elements.mode_notice.replaceChildren();
  const strong = document.createElement("strong");
  const detail = document.createElement("span");
  if (mode === "demo") {
    elements.mode_notice.className = "mode-notice demo";
    strong.textContent = "DATOS SINTÉTICOS — DEMOSTRACIÓN ACADÉMICA";
    detail.textContent = recordCount === null
      ? `${formatNumber(generatedCount)} registros reproducibles con semilla fija; no se insertan ni se mezclan con public.incidents.`
      : `Se generaron ${formatNumber(generatedCount)} registros; ${formatNumber(recordCount)} cumplieron los filtros. No se insertan ni se mezclan con public.incidents.`;
  } else {
    elements.mode_notice.className = "mode-notice history";
    strong.textContent = "HISTORIAL REGISTRADO DEL PROTOTIPO";
    detail.textContent = recordCount === null
      ? "Solo incidencias almacenadas; no se presentan como datos operativos reales de EMACRUZ."
      : `${recordCount} incidencias únicas analizadas; incluye retiradas y usa la versión actual de cada ID.`;
  }
  elements.mode_notice.append(strong, detail);
}

function chartTheme() {
  const styles = getComputedStyle(document.documentElement);
  const value = (name) => styles.getPropertyValue(name).trim();
  return {
    text: value("--chart-text") || "#5f7480",
    grid: value("--chart-grid") || "rgba(18, 59, 80, .12)",
    fill: value("--chart-fill") || "rgba(8, 127, 102, .74)",
    line: value("--chart-line") || "#087f66",
  };
}

function chartConfig(type, rows, options = {}) {
  const theme = chartTheme();
  const colors = [theme.line, "#f4b942", "#3d91bf", "#9b74bd", "#d36c58", "#6fa68a", "#d09443"];
  return {
    type,
    data: {
      labels: rows.map((row) => row.label),
      datasets: [{
        label: options.datasetLabel || "Registros",
        data: rows.map((row) => row.count),
        backgroundColor: type === "doughnut" ? rows.map((_, index) => colors[index % colors.length]) : theme.fill,
        borderColor: theme.line,
        borderWidth: type === "line" ? 3 : 1,
        pointBackgroundColor: theme.line,
        tension: .25,
        fill: type === "line",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: options.horizontal ? "y" : "x",
      plugins: {
        legend: { display: type === "doughnut", position: "bottom", labels: { color: theme.text } },
        tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw} registro(s)` } },
      },
      scales: type === "doughnut" ? {} : {
        y: { beginAtZero: true, ticks: { precision: 0, color: theme.text }, grid: { color: theme.grid } },
        x: { beginAtZero: options.horizontal, ticks: { precision: options.horizontal ? 0 : undefined, color: theme.text }, grid: { color: theme.grid } },
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

function renderComparison(body, rows, firstLabel, normalizedRates) {
  body.replaceChildren();
  for (const row of (rows || []).slice(0, 12)) {
    const tr = document.createElement("tr");
    tr.append(
      cell(row.label, firstLabel),
      cell(formatNumber(row.count), "Registros"),
      cell(formatNumber(row.programmed_services), "Programados"),
      cell(normalizedRates && row.incidents_per_100_programmed !== null
        ? formatNumber(row.incidents_per_100_programmed, 1)
        : "No aplica", "Por 100"),
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

function renderRunMetadata(run) {
  const values = miningView.metadata(run);
  elements.analysis_period_status.textContent = values.periodStatus;
  elements.analysis_period_start.textContent = values.periodStart;
  elements.analysis_period_end.textContent = values.periodEnd;
  elements.analysis_execution_at.textContent = values.executionAt;
  elements.analysis_started_at.textContent = values.startedAt;
  elements.analysis_execution_type.textContent = values.executionType;
}

function resetRenderedRun() {
  lastRenderedRun = null;
  renderRunMetadata(null);
  for (const element of [
    elements.kpi_incidents, elements.kpi_neighborhoods, elements.kpi_trucks, elements.kpi_reason,
    elements.kpi_delay, elements.kpi_rules, elements.kpi_updated, elements.kpi_execution,
    elements.programmed_services, elements.affected_services, elements.retired_incidents,
  ]) element.textContent = "—";
  for (const chart of Object.values(charts)) chart.destroy();
  charts = {};
  elements.neighborhood_comparison.replaceChildren();
  elements.truck_comparison.replaceChildren();
  elements.rules_list.replaceChildren();
  elements.findings_list.replaceChildren();
  elements.rule_count.textContent = "— reglas";
  elements.period_start.value = "";
  elements.period_end.value = "";
  elements.neighborhood_filter.value = "";
  elements.truck_filter.value = "";
}

function renderRun(run) {
  lastRenderedRun = run;
  const indicators = run.indicators || {};
  const chartData = run.chart_data || {};
  const demoMode = run.mode === "demo";
  const normalizedRates = !demoMode && indicators.normalized_rates_applicable !== false;
  showModeNotice(run.mode, run.record_count, indicators.synthetic_records_generated || 1_000_000);
  renderRunMetadata(run);
  elements.period_start.value = run.filters?.startDate || "";
  elements.period_end.value = run.filters?.endDate || "";
  elements.neighborhood_filter.value = run.filters?.neighborhoodId || "";
  elements.truck_filter.value = run.filters?.truckId || "";
  elements.kpi_records_label.textContent = demoMode ? "Registros sintéticos" : "Incidencias únicas";
  elements.kpi_records_note.textContent = demoMode ? "Prueba académica de procesamiento" : "Una vez por ID, no por edición";
  elements.kpi_incidents.textContent = formatNumber(indicators.total_incidents);
  elements.kpi_neighborhoods.textContent = formatNumber(indicators.affected_neighborhoods);
  elements.kpi_trucks.textContent = formatNumber(indicators.affected_trucks);
  elements.kpi_reason.textContent = indicators.most_frequent_reason || "Sin datos";
  elements.kpi_delay.textContent = indicators.average_estimated_delay_minutes === null || indicators.average_estimated_delay_minutes === undefined
    ? "Sin estimaciones" : `${formatNumber(indicators.average_estimated_delay_minutes, 1)} min`;
  elements.kpi_rules.textContent = formatNumber(indicators.association_rules);
  elements.kpi_updated.textContent = miningView.formatDateTime(run.completed_at);
  elements.kpi_execution.textContent = miningView.executionType(run.execution_type);
  elements.programmed_services.textContent = formatNumber(indicators.programmed_services_in_period);
  elements.affected_services.textContent = formatNumber(indicators.affected_programmed_service_occurrences);
  elements.retired_incidents.textContent = formatNumber(indicators.retired_incidents);

  const datasetLabel = demoMode ? "Registros sintéticos" : "Incidencias registradas";
  renderChart("neighborhood-chart", "bar", chartData.neighborhoods || [], { horizontal: true, datasetLabel });
  renderChart("truck-chart", "bar", chartData.trucks || [], { datasetLabel });
  renderChart("reason-chart", "doughnut", chartData.reasons || [], { datasetLabel });
  renderChart("weekday-chart", "bar", chartData.weekdays || [], { datasetLabel });
  renderChart("shift-chart", "bar", chartData.shifts || [], { datasetLabel });
  renderChart("timeline-chart", "line", chartData.timeline || [], { datasetLabel });
  renderChart("duration-chart", "bar", chartData.durations || [], { datasetLabel });
  elements.comparison_title.textContent = demoMode ? "Conteos sintéticos y calendario de referencia" : "Conteos y tasas normalizadas";
  elements.comparison_note.textContent = demoMode
    ? "Los conteos sintéticos prueban el procesamiento. No se calculan tasas operativas contra los servicios semanales porque serían artificiales y no comparables."
    : "“Por 100” divide incidencias registradas entre servicios programados esperados en el periodo. No mide cumplimiento real.";
  elements.neighborhood_rate_heading.textContent = demoMode ? "Tasa" : "Por 100";
  elements.truck_rate_heading.textContent = demoMode ? "Tasa" : "Por 100";
  elements.service_summary_note.textContent = demoMode
    ? "El millón es una prueba sintética de procesamiento. Los servicios programados solo describen el calendario de referencia; no son un denominador operativo comparable."
    : "Son ocurrencias esperadas según el calendario semanal, no servicios confirmados. El análisis no infiere cancelaciones ni cumplimiento.";
  renderComparison(elements.neighborhood_comparison, chartData.neighborhoods, "Barrio", normalizedRates);
  renderComparison(elements.truck_comparison, chartData.trucks, "Camión", normalizedRates);
  renderRules(run);
  renderFindings(run);
}

async function loadLatest() {
  setMessage("Cargando el último análisis persistido…");
  resetRenderedRun();
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
    setMessage(data.record_count
      ? `Resultado persistido cargado: ${miningView.formatPeriodDate(data.period_start)} a ${miningView.formatPeriodDate(data.period_end)}.`
      : "Resultado persistido cargado sin registros para el periodo seleccionado.");
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
window.addEventListener("alerta-ruta:theme-change", () => {
  if (lastRenderedRun) renderRun(lastRenderedRun);
});

initialize();
