(function exposeMiningView(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AlertaRutaMiningView = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createMiningView() {
  "use strict";

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const parts = Object.fromEntries(new Intl.DateTimeFormat("es-BO", {
      timeZone: "America/La_Paz",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value]));
    return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
  }

  function formatPeriodDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
  }

  function executionType(value) {
    return value === "scheduled" ? "Actualización automática semanal" : "Actualización manual";
  }

  function metadata(run) {
    if (!run) return {
      periodStatus: "Sin resultado cargado",
      periodStart: "—",
      periodEnd: "—",
      executionAt: "—",
      startedAt: "—",
      executionType: "—",
    };
    const hasRecords = Number(run.record_count) > 0;
    const periodStart = hasRecords ? formatPeriodDate(run.period_start) : "—";
    const periodEnd = hasRecords ? formatPeriodDate(run.period_end) : "—";
    return {
      periodStatus: hasRecords ? `${periodStart} – ${periodEnd}` : "Sin registros para el periodo",
      periodStart,
      periodEnd,
      executionAt: formatDateTime(run.completed_at || run.started_at),
      startedAt: formatDateTime(run.started_at),
      executionType: executionType(run.execution_type),
    };
  }

  return Object.freeze({ executionType, formatDateTime, formatPeriodDate, metadata });
}));
