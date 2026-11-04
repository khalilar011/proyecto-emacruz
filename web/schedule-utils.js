(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlertaRutaSchedule = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TIME_ZONE = "America/La_Paz";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  }

  function santaCruzParts(date = new Date()) {
    const parts = Object.fromEntries(
      formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
    );
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
    };
  }

  function minuteOfDay(value) {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  }

  function nextService(barrio, now = new Date()) {
    const parts = santaCruzParts(now);
    const localNow = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const candidates = [];
    for (let offset = 0; offset <= 7; offset += 1) {
      const date = new Date(localDate.getTime() + offset * 86400000);
      const weekdayIndex = (date.getUTCDay() + 6) % 7;
      const service = Object.values(barrio.horarios || {}).find((item) => item?.dia_indice === weekdayIndex);
      if (!service) continue;
      const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, minuteOfDay(service.inicio));
      const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, minuteOfDay(service.fin));
      if (end <= localNow) continue;
      candidates.push({
        ...service,
        fecha: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
        en_curso: start <= localNow && localNow < end,
        start,
      });
    }
    candidates.sort((a, b) => a.start - b.start);
    return candidates[0] || null;
  }

  function incidentIsActive(incident, now = new Date()) {
    if (incident.retirada) return false;
    const start = Date.parse(incident.inicio);
    const end = Date.parse(incident.vence);
    const instant = now.getTime();
    return Number.isFinite(start) && Number.isFinite(end) && start <= instant && instant < end;
  }

  function incidentApplies(incident, barrio) {
    const objectives = incident.objetivos || {};
    const services = Object.values(barrio.horarios || {}).filter(Boolean);
    return (
      (objectives.barrios || []).includes(barrio.id) ||
      services.some((service) => (objectives.camiones || []).includes(service.camion)) ||
      services.some((service) => (objectives.servicios || []).includes(service.id))
    );
  }

  function activeIncident(incidents, barrio, now = new Date()) {
    const priority = { NORMAL: 0, DEMORA: 1, SERVICIO_SUSPENDIDO: 2 };
    return incidents
      .filter((item) => incidentIsActive(item, now) && incidentApplies(item, barrio))
      .sort((a, b) => (priority[b.estado] ?? -1) - (priority[a.estado] ?? -1)
        || Date.parse(b.actualizada_en) - Date.parse(a.actualizada_en))[0] || null;
  }

  return { TIME_ZONE, normalizeText, santaCruzParts, nextService, incidentIsActive, incidentApplies, activeIncident };
});
