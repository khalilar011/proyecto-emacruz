(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlertaRutaIncidents = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PRIORITY = { NORMAL: 0, DEMORA: 1, SERVICIO_SUSPENDIDO: 2 };
  const OFFSET = "-04:00";

  function normalizeRow(row) {
    if (row.objetivos) return row;
    return {
      id: row.id,
      estado: row.state,
      motivo_codigo: row.reason_code,
      motivo: row.reason_detail,
      estimacion_minutos: row.estimated_delay_minutes,
      inicio: row.starts_at,
      vence: row.expires_at,
      observaciones: row.notes,
      actualizada_en: row.updated_at,
      publicada_en: row.published_at,
      objetivo_principal: { tipo: row.primary_target_type, id: row.primary_target_id },
      objetivos: {
        servicios: row.affected_service_ids || [],
        barrios: row.affected_neighborhood_ids || [],
        camiones: row.affected_truck_ids || [],
      },
      retirada: row.retired_at ? { fecha: row.retired_at, responsable: row.retired_by } : null,
      simulacion: row.is_simulation === true,
    };
  }

  function incidentPriority(incident) {
    return PRIORITY[incident?.estado] ?? -1;
  }

  function classify(incident, now = new Date()) {
    const item = normalizeRow(incident);
    if (item.retirada) return "RETIRADA";
    const instant = now.getTime();
    if (instant < Date.parse(item.inicio)) return "PROGRAMADA";
    if (instant >= Date.parse(item.vence)) return "VENCIDA";
    return "ACTIVA";
  }

  function incidentApplies(incident, barrio) {
    const item = normalizeRow(incident);
    const services = Object.values(barrio.horarios || {}).filter(Boolean);
    const serviceIds = new Set(services.map((service) => service.id));
    const explicit = item.objetivos?.servicios || [];
    if (explicit.length) return explicit.some((id) => serviceIds.has(id));
    // Compatibilidad con el respaldo JSON de fase 2: aun para objetivos amplios,
    // solo aplica servicios cuyo día y horario se solapan con la vigencia.
    return services.some((service) => serviceOccursInWindow(service, item.inicio, item.vence)
      && ((item.objetivos?.barrios || []).includes(barrio.id)
        || (item.objetivos?.camiones || []).includes(service.camion)));
  }

  function statusForBarrio(incidents, barrio, now = new Date()) {
    return incidents
      .map(normalizeRow)
      .filter((item) => classify(item, now) === "ACTIVA" && incidentApplies(item, barrio))
      .sort((a, b) => incidentPriority(b) - incidentPriority(a) || Date.parse(b.actualizada_en) - Date.parse(a.actualizada_en))[0] || null;
  }

  function localDate(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(date);
  }

  function dateRange(start, end) {
    const first = new Date(`${localDate(start)}T00:00:00Z`);
    const last = new Date(`${localDate(end)}T00:00:00Z`);
    const values = [];
    for (let cursor = first; cursor <= last; cursor = new Date(cursor.getTime() + 86400000)) {
      values.push(cursor.toISOString().slice(0, 10));
    }
    return values;
  }

  function serviceOccursInWindow(service, startsAt, expiresAt) {
    const start = Date.parse(startsAt);
    const end = Date.parse(expiresAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return false;
    return dateRange(startsAt, expiresAt).some((date) => {
      const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
      if (weekday !== Number(service.dia_indice)) return false;
      const serviceStart = Date.parse(`${date}T${service.inicio}:00${OFFSET}`);
      const serviceEnd = Date.parse(`${date}T${service.fin}:00${OFFSET}`);
      return serviceStart < end && start < serviceEnd;
    });
  }

  function buildScope(services, targetType, targetId, neighborhoodIds, startsAt, expiresAt) {
    const allowedNeighborhoods = new Set(neighborhoodIds || []);
    const matching = services.filter((service) => {
      if (targetType === "truck" && service.camion !== targetId) return false;
      if (targetType === "service" && service.id !== targetId) return false;
      if (allowedNeighborhoods.size && !allowedNeighborhoods.has(service.barrio_id)) return false;
      return serviceOccursInWindow(service, startsAt, expiresAt);
    });
    return {
      servicios: [...new Set(matching.map((item) => item.id))].sort(),
      barrios: [...new Set(matching.map((item) => item.barrio_id))].sort(),
      camiones: [...new Set(matching.map((item) => item.camion))].sort(),
    };
  }

  function nextServiceWindow(services, targetType, targetId, neighborhoodIds, now = new Date()) {
    const allowedNeighborhoods = new Set(neighborhoodIds || []);
    const candidates = [];
    const firstDate = new Date(`${localDate(now)}T12:00:00Z`);
    for (let offset = 0; offset <= 7; offset += 1) {
      const date = new Date(firstDate.getTime() + offset * 86400000).toISOString().slice(0, 10);
      const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
      for (const service of services) {
        if (Number(service.dia_indice) !== weekday) continue;
        if (targetType === "truck" && service.camion !== targetId) continue;
        if (targetType === "service" && service.id !== targetId) continue;
        if (allowedNeighborhoods.size && !allowedNeighborhoods.has(service.barrio_id)) continue;
        const start = Date.parse(`${date}T${service.inicio}:00${OFFSET}`);
        const end = Date.parse(`${date}T${service.fin}:00${OFFSET}`);
        if (end > now.getTime()) candidates.push({ service, start, end });
      }
    }
    candidates.sort((first, second) => first.start - second.start || first.service.orden_camion - second.service.orden_camion);
    const candidate = candidates[0];
    if (!candidate) return null;
    return {
      serviceId: candidate.service.id,
      startsAt: new Date(Math.max(candidate.start, now.getTime())),
      expiresAt: new Date(candidate.end),
    };
  }

  return {
    PRIORITY, normalizeRow, incidentPriority, classify, incidentApplies,
    statusForBarrio, serviceOccursInWindow, buildScope, nextServiceWindow,
  };
});
