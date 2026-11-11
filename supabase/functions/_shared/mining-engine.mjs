const DAY_NAMES = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const REASON_LABELS = {
  LLUVIA: "Lluvia",
  FALLA_MECANICA: "Falla mecánica",
  PROBLEMA_TECNICO: "Problema técnico",
  OTRO: "Otro",
};
const DURATION_RANGES = ["1-15", "16-30", "31-60", "61-120", "MAS_DE_120"];

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
}

function serviceValue(service, spanish, database) {
  return service?.[spanish] ?? service?.[database];
}

function normalizeService(service) {
  const day = service.dia_indice !== undefined ? Number(service.dia_indice) + 1 : Number(serviceValue(service, "dia_iso", "day_of_week"));
  return {
    id: service.id,
    neighborhoodId: serviceValue(service, "barrio_id", "neighborhood_id"),
    truckId: serviceValue(service, "camion", "truck_id"),
    day,
    start: String(serviceValue(service, "inicio", "start_time") || "").slice(0, 5),
    end: String(serviceValue(service, "fin", "end_time") || "").slice(0, 5),
  };
}

function normalizeNeighborhood(neighborhood) {
  return {
    id: neighborhood.id,
    name: neighborhood.nombre ?? neighborhood.name ?? neighborhood.id,
    uv: neighborhood.uv,
  };
}

function localDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() - (4 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, amount) {
  const date = typeof value === "string" ? parseDateOnly(value) : new Date(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateOnly(date);
}

function isoDay(dateOnly) {
  const day = parseDateOnly(dateOnly).getUTCDay();
  return day === 0 ? 7 : day;
}

function eachDate(start, end) {
  const dates = [];
  if (!parseDateOnly(start) || !parseDateOnly(end) || start > end) return dates;
  for (let current = start; current <= end; current = addDays(current, 1)) dates.push(current);
  return dates;
}

function durationRange(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value <= 15) return "1-15";
  if (value <= 30) return "16-30";
  if (value <= 60) return "31-60";
  if (value <= 120) return "61-120";
  return "MAS_DE_120";
}

function shiftFor(start) {
  const hour = Number(String(start || "0").slice(0, 2));
  if (hour < 11) return "MANANA";
  if (hour < 15) return "MEDIODIA";
  return "TARDE";
}

function combinations(items, size) {
  const output = [];
  function visit(start, selected) {
    if (selected.length === size) {
      output.push(selected.slice());
      return;
    }
    for (let index = start; index <= items.length - (size - selected.length); index += 1) {
      selected.push(items[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  }
  visit(0, []);
  return output;
}

function keyOf(items) {
  return [...items].sort().join("\u001f");
}

function isSubset(candidate, transaction) {
  return candidate.every((item) => transaction.has(item));
}

function clampNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function normalizeAprioriParameters(parameters = {}) {
  return {
    minSupport: clampNumber(parameters.minSupport, 0.08, 0.01, 0.5),
    minConfidence: clampNumber(parameters.minConfidence, 0.55, 0.1, 1),
    minLift: clampNumber(parameters.minLift, 1.05, 0.5, 10),
    maxItemsetSize: Math.round(clampNumber(parameters.maxItemsetSize, 3, 2, 4)),
    maxRules: Math.round(clampNumber(parameters.maxRules, 30, 1, 100)),
    minimumTransactions: Math.round(clampNumber(parameters.minimumTransactions, 10, 2, 100)),
  };
}

function itemLabel(item, neighborhoods = new Map()) {
  const [dimension, ...parts] = String(item).split("=");
  const value = parts.join("=");
  const labels = {
    CAMION: `camión ${value}`,
    BARRIO: `barrio ${neighborhoods.get(value) || value}`,
    DIA: value.charAt(0) + value.slice(1).toLowerCase(),
    TURNO: `turno ${value.toLowerCase()}`,
    MOTIVO: REASON_LABELS[value] || value,
    TIPO: ({ DEMORA: "demora", SERVICIO_SUSPENDIDO: "servicio suspendido", NORMAL: "estado normal registrado" })[value] || value,
    DURACION: `demora estimada ${value === "MAS_DE_120" ? "mayor a 120" : value} minutos`,
  };
  return labels[dimension] || value;
}

function explainRule(rule, neighborhoods) {
  const left = rule.antecedent.map((item) => itemLabel(item, neighborhoods)).join(" + ");
  const right = rule.consequent.map((item) => itemLabel(item, neighborhoods)).join(" + ");
  return {
    ...rule,
    antecedent_label: left,
    consequent_label: right,
    interpretation: `En los registros analizados, cuando aparece ${left}, también aparece ${right} en ${(rule.confidence * 100).toFixed(1)} % de esos casos. Es una asociación para investigar, no una prueba de causalidad.`,
  };
}

function apriori(transactions, rawParameters = {}, neighborhoodNames = new Map()) {
  const parameters = normalizeAprioriParameters(rawParameters);
  const normalized = transactions.map((items) => new Set(unique(items))).filter((items) => items.size > 0);
  const total = normalized.length;
  if (total < parameters.minimumTransactions) {
    return { parameters, frequentItemsets: [], rules: [], totalRuleCount: 0, insufficientData: true };
  }

  const minimumCount = Math.max(1, Math.ceil((parameters.minSupport * total) - 1e-12));
  const supportCounts = new Map();
  const frequentBySize = new Map();
  const singleCounts = new Map();
  for (const transaction of normalized) {
    for (const item of transaction) singleCounts.set(item, (singleCounts.get(item) || 0) + 1);
  }
  let previous = [...singleCounts.entries()]
    .filter(([, count]) => count >= minimumCount)
    .map(([item, count]) => ({ items: [item], count }))
    .sort((left, right) => keyOf(left.items).localeCompare(keyOf(right.items)));
  frequentBySize.set(1, previous);
  for (const entry of previous) supportCounts.set(keyOf(entry.items), entry.count);

  for (let size = 2; size <= parameters.maxItemsetSize && previous.length; size += 1) {
    const previousKeys = new Set(previous.map((entry) => keyOf(entry.items)));
    const candidates = new Map();
    for (let leftIndex = 0; leftIndex < previous.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < previous.length; rightIndex += 1) {
        const merged = unique([...previous[leftIndex].items, ...previous[rightIndex].items]).sort();
        if (merged.length !== size) continue;
        if (!combinations(merged, size - 1).every((subset) => previousKeys.has(keyOf(subset)))) continue;
        candidates.set(keyOf(merged), merged);
      }
    }
    const frequent = [];
    for (const candidate of candidates.values()) {
      const count = normalized.reduce((sum, transaction) => sum + Number(isSubset(candidate, transaction)), 0);
      if (count >= minimumCount) {
        frequent.push({ items: candidate, count });
        supportCounts.set(keyOf(candidate), count);
      }
    }
    frequent.sort((left, right) => keyOf(left.items).localeCompare(keyOf(right.items)));
    frequentBySize.set(size, frequent);
    previous = frequent;
  }

  const frequentItemsets = [...frequentBySize.values()].flat().map((entry) => ({
    items: entry.items,
    support_count: entry.count,
    support: entry.count / total,
  }));
  const matchingRules = [];
  for (const itemset of frequentItemsets.filter((entry) => entry.items.length >= 2)) {
    for (const consequentItem of itemset.items) {
      const consequent = [consequentItem];
      const antecedent = itemset.items.filter((item) => item !== consequentItem);
      const antecedentCount = supportCounts.get(keyOf(antecedent));
      const consequentCount = supportCounts.get(keyOf(consequent));
      if (!antecedentCount || !consequentCount) continue;
      const confidence = itemset.support_count / antecedentCount;
      const lift = confidence / (consequentCount / total);
      if (confidence + 1e-12 < parameters.minConfidence || lift + 1e-12 < parameters.minLift) continue;
      matchingRules.push({
        antecedent,
        consequent,
        support: itemset.support,
        confidence,
        lift,
        support_count: itemset.support_count,
      });
    }
  }
  matchingRules.sort((left, right) => (
    right.lift - left.lift
    || right.confidence - left.confidence
    || right.support - left.support
    || keyOf([...left.antecedent, ...left.consequent]).localeCompare(keyOf([...right.antecedent, ...right.consequent]))
  ));
  return {
    parameters,
    frequentItemsets,
    totalRuleCount: matchingRules.length,
    rules: matchingRules.slice(0, parameters.maxRules).map((rule) => explainRule(rule, neighborhoodNames)),
    insufficientData: false,
  };
}

function transactionForIncident(incident, servicesById) {
  const services = unique(incident.affected_service_ids || []).map((id) => servicesById.get(id)).filter(Boolean);
  const neighborhoods = unique([
    ...(incident.affected_neighborhood_ids || []),
    ...services.map((service) => service.neighborhoodId),
  ]);
  const trucks = unique([...(incident.affected_truck_ids || []), ...services.map((service) => service.truckId)]);
  const items = [
    ...trucks.map((value) => `CAMION=${value}`),
    ...neighborhoods.map((value) => `BARRIO=${value}`),
    ...unique(services.map((service) => service.day)).map((value) => `DIA=${DAY_NAMES[value - 1]}`),
    ...unique(services.map((service) => shiftFor(service.start))).map((value) => `TURNO=${value}`),
    `MOTIVO=${incident.reason_code}`,
    `TIPO=${incident.state}`,
  ];
  const range = durationRange(incident.estimated_delay_minutes);
  if (range) items.push(`DURACION=${range}`);
  return unique(items).sort();
}

function deduplicateIncidents(incidents) {
  const byId = new Map();
  for (const incident of incidents || []) {
    if (!incident?.id) continue;
    const current = byId.get(incident.id);
    if (!current || String(incident.updated_at || "") >= String(current.updated_at || "")) byId.set(incident.id, incident);
  }
  return [...byId.values()];
}

function filterIncidents(incidents, filters = {}) {
  return deduplicateIncidents(incidents).filter((incident) => {
    const date = localDate(incident.starts_at);
    if (filters.startDate && (!date || date < filters.startDate)) return false;
    if (filters.endDate && (!date || date > filters.endDate)) return false;
    if (filters.neighborhoodId && !(incident.affected_neighborhood_ids || []).includes(filters.neighborhoodId)) return false;
    if (filters.truckId && !(incident.affected_truck_ids || []).includes(filters.truckId)) return false;
    return true;
  });
}

function dateBounds(incidents, filters = {}) {
  const dates = incidents.map((incident) => localDate(incident.starts_at)).filter(Boolean).sort();
  return {
    start: filters.startDate || dates[0] || null,
    end: filters.endDate || dates[dates.length - 1] || null,
  };
}

function expectedServiceOccurrences(services, bounds, filters = {}) {
  const countsByNeighborhood = new Map();
  const countsByTruck = new Map();
  let total = 0;
  if (!bounds.start || !bounds.end) return { total, countsByNeighborhood, countsByTruck };
  for (const date of eachDate(bounds.start, bounds.end)) {
    for (const service of services) {
      if (service.day !== isoDay(date)) continue;
      if (filters.neighborhoodId && service.neighborhoodId !== filters.neighborhoodId) continue;
      if (filters.truckId && service.truckId !== filters.truckId) continue;
      total += 1;
      countsByNeighborhood.set(service.neighborhoodId, (countsByNeighborhood.get(service.neighborhoodId) || 0) + 1);
      countsByTruck.set(service.truckId, (countsByTruck.get(service.truckId) || 0) + 1);
    }
  }
  return { total, countsByNeighborhood, countsByTruck };
}

function affectedOccurrenceKeys(incidents, servicesById, bounds) {
  const keys = new Set();
  if (!bounds.start || !bounds.end) return keys;
  for (const incident of incidents) {
    const incidentStart = localDate(incident.starts_at) || bounds.start;
    const incidentEnd = localDate(incident.expires_at) || incidentStart;
    const start = incidentStart < bounds.start ? bounds.start : incidentStart;
    const end = incidentEnd > bounds.end ? bounds.end : incidentEnd;
    for (const serviceId of unique(incident.affected_service_ids || [])) {
      const service = servicesById.get(serviceId);
      if (!service) continue;
      for (const date of eachDate(start, end)) {
        if (service.day === isoDay(date)) keys.add(`${service.id}@${date}`);
      }
    }
  }
  return keys;
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

function mondayOf(dateOnly) {
  return addDays(dateOnly, 1 - isoDay(dateOnly));
}

function sortedEntries(counts, label = (value) => value) {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: label(id), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "es"));
}

function ranking(counts, expectedCounts, label) {
  return sortedEntries(counts, label).map((entry) => {
    const programmed = expectedCounts.get(entry.id) || 0;
    return {
      ...entry,
      programmed_services: programmed,
      incidents_per_100_programmed: programmed ? (entry.count / programmed) * 100 : null,
    };
  });
}

function buildFindings(mode, indicators, charts, rules) {
  const findings = [];
  const modeText = mode === "demo"
    ? "Este hallazgo procede de datos sintéticos y sirve únicamente para demostrar el método."
    : "Este hallazgo describe el historial registrado del prototipo; no acredita una operación real de EMACRUZ.";
  if (charts.trucks[0]) findings.push(`${charts.trucks[0].label} concentra ${charts.trucks[0].count} incidencias registradas. Conviene revisar sus registros de mantenimiento y programación. ${modeText}`);
  if (charts.neighborhoods[0]) findings.push(`${charts.neighborhoods[0].label} aparece en ${charts.neighborhoods[0].count} incidencias. Se recomienda investigar las condiciones de sus servicios programados antes de atribuir una causa. ${modeText}`);
  if (rules[0]) findings.push(`La asociación con mayor lift relaciona ${rules[0].antecedent_label} con ${rules[0].consequent_label}. Puede orientar una revisión, pero no demuestra causalidad. ${modeText}`);
  if (!rules.length) findings.push(`Con ${indicators.total_incidents} incidencias no se obtuvieron reglas que superen los umbrales configurados. Se mantienen los descriptivos sin forzar asociaciones.`);
  return findings;
}

function analyzeIncidents({ incidents, catalog, mode = "history", filters = {}, parameters = {} }) {
  const services = (catalog.servicios || catalog.services || []).map(normalizeService);
  const neighborhoods = (catalog.barrios || catalog.neighborhoods || []).map(normalizeNeighborhood);
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const neighborhoodNames = new Map(neighborhoods.map((neighborhood) => [neighborhood.id, neighborhood.name]));
  const selected = filterIncidents(incidents, filters);
  const bounds = dateBounds(selected, filters);
  const expected = expectedServiceOccurrences(services, bounds, filters);
  const expectedForRankings = expectedServiceOccurrences(services, bounds, {});
  const affectedOccurrences = affectedOccurrenceKeys(selected, servicesById, bounds);
  const transactions = selected.map((incident) => transactionForIncident(incident, servicesById));
  const mined = apriori(transactions, parameters, neighborhoodNames);

  const neighborhoodCounts = new Map();
  const truckCounts = new Map();
  const dayCounts = new Map(DAY_NAMES.map((name) => [name, 0]));
  const shiftCounts = new Map([["MANANA", 0], ["MEDIODIA", 0], ["TARDE", 0]]);
  for (const incident of selected) {
    const incidentServices = unique(incident.affected_service_ids || []).map((id) => servicesById.get(id)).filter(Boolean);
    for (const value of unique([...(incident.affected_neighborhood_ids || []), ...incidentServices.map((service) => service.neighborhoodId)])) neighborhoodCounts.set(value, (neighborhoodCounts.get(value) || 0) + 1);
    for (const value of unique([...(incident.affected_truck_ids || []), ...incidentServices.map((service) => service.truckId)])) truckCounts.set(value, (truckCounts.get(value) || 0) + 1);
    for (const value of unique(incidentServices.map((service) => DAY_NAMES[service.day - 1]))) dayCounts.set(value, (dayCounts.get(value) || 0) + 1);
    for (const value of unique(incidentServices.map((service) => shiftFor(service.start)))) shiftCounts.set(value, (shiftCounts.get(value) || 0) + 1);
  }
  const reasonCounts = countBy(selected.map((incident) => incident.reason_code));
  const durationCounts = new Map(DURATION_RANGES.map((range) => [range, 0]));
  const delays = [];
  for (const incident of selected) {
    const range = durationRange(incident.estimated_delay_minutes);
    if (range) {
      durationCounts.set(range, durationCounts.get(range) + 1);
      delays.push(Number(incident.estimated_delay_minutes));
    }
  }
  const timelineCounts = new Map();
  for (const incident of selected) {
    const date = localDate(incident.starts_at);
    if (date) {
      const week = mondayOf(date);
      timelineCounts.set(week, (timelineCounts.get(week) || 0) + 1);
    }
  }
  const reasons = sortedEntries(reasonCounts, (code) => REASON_LABELS[code] || code);
  const charts = {
    neighborhoods: ranking(neighborhoodCounts, expectedForRankings.countsByNeighborhood, (id) => neighborhoodNames.get(id) || id),
    trucks: ranking(truckCounts, expectedForRankings.countsByTruck, (id) => id),
    reasons,
    weekdays: DAY_NAMES.map((id) => ({ id, label: id.charAt(0) + id.slice(1).toLowerCase(), count: dayCounts.get(id) || 0 })),
    shifts: [...shiftCounts].map(([id, count]) => ({ id, label: id.charAt(0) + id.slice(1).toLowerCase(), count })),
    timeline: [...timelineCounts].sort(([left], [right]) => left.localeCompare(right)).map(([week, count]) => ({ id: week, label: week, count })),
    durations: DURATION_RANGES.map((id) => ({ id, label: id === "MAS_DE_120" ? "> 120" : id, count: durationCounts.get(id) || 0 })),
  };
  const indicators = {
    total_incidents: selected.length,
    affected_neighborhoods: neighborhoodCounts.size,
    affected_trucks: truckCounts.size,
    most_frequent_reason: reasons[0]?.label || null,
    average_estimated_delay_minutes: delays.length ? delays.reduce((sum, value) => sum + value, 0) / delays.length : null,
    association_rules: mined.totalRuleCount,
    programmed_services_in_period: expected.total,
    affected_programmed_service_occurrences: affectedOccurrences.size,
    retired_incidents: selected.filter((incident) => Boolean(incident.retired_at)).length,
  };
  return {
    mode,
    unit_of_analysis: "Una transacción por incidencia única (ID), usando su versión actual; los barrios, camiones, días y turnos afectados son ítems categóricos de esa única transacción.",
    period: bounds,
    filters: {
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      neighborhoodId: filters.neighborhoodId || null,
      truckId: filters.truckId || null,
    },
    record_count: selected.length,
    transaction_count: transactions.length,
    indicators,
    charts,
    rules: mined.rules,
    rule_count: mined.totalRuleCount,
    frequent_itemset_count: mined.frequentItemsets.length,
    insufficient_data: mined.insufficientData,
    parameters: mined.parameters,
    findings: buildFindings(mode, indicators, charts, mined.rules),
  };
}

function seededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function isoAt(date, time) {
  return `${date}T${time}:00-04:00`;
}

function createDemoIncidents(catalog, options = {}) {
  const count = Math.round(clampNumber(options.count, 180, 150, 200));
  const seed = Number(options.seed ?? 20261111);
  const random = seededRandom(seed);
  const services = (catalog.servicios || catalog.services || []).map(normalizeService);
  const incidents = [];
  const firstMonday = "2026-01-05";
  for (let index = 0; index < count; index += 1) {
    const primary = services[Math.floor(random() * services.length)];
    const week = Math.floor(random() * 26);
    const date = addDays(firstMonday, (week * 7) + primary.day - 1);
    const affected = [primary];
    if (random() < 0.18) {
      const compatible = services.filter((service) => service.id !== primary.id && service.truckId === primary.truckId && service.day === primary.day);
      if (compatible.length) affected.push(compatible[Math.floor(random() * compatible.length)]);
    }
    const neighborhoods = unique(affected.map((service) => service.neighborhoodId));
    const trucks = unique(affected.map((service) => service.truckId));
    const shifts = unique(affected.map((service) => shiftFor(service.start)));
    let reason;
    if (trucks.includes("SIM-C01") && random() < 0.78) reason = "FALLA_MECANICA";
    else if ((neighborhoods.includes("D2-B09") || neighborhoods.includes("D2-B18")) && random() < 0.72) reason = "LLUVIA";
    else if (shifts.includes("TARDE") && random() < 0.58) reason = "PROBLEMA_TECNICO";
    else reason = ["LLUVIA", "FALLA_MECANICA", "PROBLEMA_TECNICO", "OTRO"][Math.floor(random() * 4)];
    const state = random() < 0.1 ? "SERVICIO_SUSPENDIDO" : "DEMORA";
    let delay = null;
    if (state === "DEMORA") {
      if (reason === "FALLA_MECANICA" && trucks.includes("SIM-C01")) delay = 45 + Math.floor(random() * 46);
      else if (reason === "LLUVIA" && neighborhoods.some((id) => ["D2-B09", "D2-B18"].includes(id))) delay = 35 + Math.floor(random() * 66);
      else delay = 10 + Math.floor(random() * 111);
    }
    const earliest = affected.map((service) => service.start).sort()[0];
    const latest = affected.map((service) => service.end).sort().at(-1);
    incidents.push({
      id: `DEMO-${String(index + 1).padStart(3, "0")}`,
      state,
      reason_code: reason,
      reason_detail: REASON_LABELS[reason],
      estimated_delay_minutes: delay,
      starts_at: isoAt(date, earliest),
      expires_at: new Date(new Date(isoAt(date, latest)).getTime() + (60 * 1000)).toISOString(),
      affected_service_ids: affected.map((service) => service.id),
      affected_neighborhood_ids: neighborhoods,
      affected_truck_ids: trucks,
      primary_target_type: "service",
      primary_target_id: primary.id,
      is_simulation: true,
      retired_at: random() < 0.08 ? isoAt(date, latest) : null,
      updated_at: isoAt(date, earliest),
    });
  }
  return { incidents, seed, count, period: { start: "2026-01-05", end: "2026-07-05" } };
}

export {
  DAY_NAMES,
  REASON_LABELS,
  analyzeIncidents,
  apriori,
  createDemoIncidents,
  durationRange,
  normalizeAprioriParameters,
  transactionForIncident,
};
