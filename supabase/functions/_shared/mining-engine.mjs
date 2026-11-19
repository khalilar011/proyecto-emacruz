const DAY_NAMES = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const REASON_LABELS = {
  LLUVIA: "Lluvia",
  FALLA_MECANICA: "Falla mecánica",
  PROBLEMA_TECNICO: "Problema técnico",
  OTRO: "Otro",
};
const DURATION_RANGES = ["1-15", "16-30", "31-60", "61-120", "MAS_DE_120"];
const DEFAULT_DEMO_PERIOD = Object.freeze({ start: "2005-01-01", end: "2026-11-19" });
const MILLISECONDS_PER_DAY = 86_400_000;

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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function formatDateOnly(date) {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value, amount) {
  const date = typeof value === "string" ? parseDateOnly(value) : new Date(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateOnly(date);
}

function isoDay(dateOnly) {
  const ordinal = dateOrdinal(dateOnly);
  if (ordinal === null) throw new Error("Fecha inválida");
  return isoDayFromOrdinal(ordinal);
}

function dateOrdinal(dateOnly) {
  const parsed = parseDateOnly(dateOnly);
  return parsed ? Math.floor(parsed.getTime() / MILLISECONDS_PER_DAY) : null;
}

function dateFromOrdinal(ordinal) {
  return formatDateOnly(new Date(ordinal * MILLISECONDS_PER_DAY));
}

function isoDayFromOrdinal(ordinal) {
  return ((((ordinal + 3) % 7) + 7) % 7) + 1;
}

function inclusiveDayCount(start, end) {
  const startOrdinal = dateOrdinal(start);
  const endOrdinal = dateOrdinal(end);
  if (startOrdinal === null || endOrdinal === null || startOrdinal > endOrdinal) return 0;
  return (endOrdinal - startOrdinal) + 1;
}

function demoTimelineKey(dateOnly, start, end) {
  const days = inclusiveDayCount(start, end);
  if (days && days <= 31) return dateOnly;
  if (days && days <= 366) return dateOnly.slice(0, 7);
  return dateOnly.slice(0, 4);
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

function normalizeWeightedTransactions(transactions) {
  const profiles = new Map();
  for (const transaction of transactions || []) {
    const rawItems = Array.isArray(transaction) ? transaction : transaction?.items;
    const weight = Array.isArray(transaction) ? 1 : Number(transaction?.weight);
    if (!Array.isArray(rawItems) || !Number.isSafeInteger(weight) || weight <= 0) continue;
    const items = unique(rawItems).sort();
    if (!items.length) continue;
    const key = keyOf(items);
    const current = profiles.get(key);
    if (current) current.weight += weight;
    else profiles.set(key, { items: new Set(items), weight });
  }
  return [...profiles.values()];
}

function apriori(transactions, rawParameters = {}, neighborhoodNames = new Map()) {
  const parameters = normalizeAprioriParameters(rawParameters);
  const normalized = normalizeWeightedTransactions(transactions);
  const total = normalized.reduce((sum, transaction) => sum + transaction.weight, 0);
  if (total < parameters.minimumTransactions) {
    return { parameters, frequentItemsets: [], rules: [], totalRuleCount: 0, insufficientData: true };
  }

  const minimumCount = Math.max(1, Math.ceil((parameters.minSupport * total) - 1e-12));
  const supportCounts = new Map();
  const frequentBySize = new Map();
  const singleCounts = new Map();
  for (const transaction of normalized) {
    for (const item of transaction.items) singleCounts.set(item, (singleCounts.get(item) || 0) + transaction.weight);
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
      const count = normalized.reduce((sum, transaction) => (
        sum + (isSubset(candidate, transaction.items) ? transaction.weight : 0)
      ), 0);
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

function expectedServiceOccurrences(services, bounds, filters = {}) {
  const countsByNeighborhood = new Map();
  const countsByTruck = new Map();
  let total = 0;
  if (!bounds.start || !bounds.end) return { total, countsByNeighborhood, countsByTruck };
  const days = inclusiveDayCount(bounds.start, bounds.end);
  const firstDay = isoDay(bounds.start);
  for (const service of services) {
    if (filters.neighborhoodId && service.neighborhoodId !== filters.neighborhoodId) continue;
    if (filters.truckId && service.truckId !== filters.truckId) continue;
    const offset = (service.day - firstDay + 7) % 7;
    const occurrences = offset < days ? 1 + Math.floor((days - 1 - offset) / 7) : 0;
    if (!occurrences) continue;
    total += occurrences;
    countsByNeighborhood.set(service.neighborhoodId, (countsByNeighborhood.get(service.neighborhoodId) || 0) + occurrences);
    countsByTruck.set(service.truckId, (countsByTruck.get(service.truckId) || 0) + occurrences);
  }
  return { total, countsByNeighborhood, countsByTruck };
}

function mondayOf(dateOnly) {
  return addDays(dateOnly, 1 - isoDay(dateOnly));
}

function sortedEntries(counts, label = (value) => value) {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: label(id), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "es"));
}

function ranking(counts, expectedCounts, label, includeNormalizedRate = true) {
  return sortedEntries(counts, label).map((entry) => {
    const programmed = expectedCounts.get(entry.id) || 0;
    return {
      ...entry,
      programmed_services: programmed,
      incidents_per_100_programmed: includeNormalizedRate && programmed ? (entry.count / programmed) * 100 : null,
    };
  });
}

function buildFindings(mode, indicators, charts, rules) {
  const findings = [];
  const modeText = mode === "demo"
    ? "Este hallazgo procede de datos sintéticos y sirve únicamente para demostrar el método."
    : "Este hallazgo describe el historial registrado del prototipo; no acredita una operación real de EMACRUZ.";
  const countLabel = mode === "demo" ? "observaciones sintéticas" : "incidencias registradas";
  if (charts.trucks[0]) findings.push(`${charts.trucks[0].label} concentra ${charts.trucks[0].count} ${countLabel}. Conviene revisar el patrón antes de formular una hipótesis operativa. ${modeText}`);
  if (charts.neighborhoods[0]) findings.push(`${charts.neighborhoods[0].label} aparece en ${charts.neighborhoods[0].count} ${countLabel}. Se recomienda investigar las condiciones de sus servicios programados antes de atribuir una causa. ${modeText}`);
  if (rules[0]) findings.push(`La asociación con mayor lift relaciona ${rules[0].antecedent_label} con ${rules[0].consequent_label}. Puede orientar una revisión, pero no demuestra causalidad. ${modeText}`);
  if (!rules.length) findings.push(`Con ${indicators.total_incidents} incidencias no se obtuvieron reglas que superen los umbrales configurados. Se mantienen los descriptivos sin forzar asociaciones.`);
  return findings;
}

function incidentMatchesFilters(incident, filters) {
  const date = incident.analysis_date || localDate(incident.starts_at);
  if (filters.startDate && (!date || date < filters.startDate)) return false;
  if (filters.endDate && (!date || date > filters.endDate)) return false;
  if (filters.neighborhoodId && !(incident.affected_neighborhood_ids || []).includes(filters.neighborhoodId)) return false;
  if (filters.truckId && !(incident.affected_truck_ids || []).includes(filters.truckId)) return false;
  return true;
}

function analyzeIncidentIterable({ incidents, catalog, mode = "history", filters = {}, parameters = {} }) {
  const services = (catalog.servicios || catalog.services || []).map(normalizeService);
  const neighborhoods = (catalog.barrios || catalog.neighborhoods || []).map(normalizeNeighborhood);
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const neighborhoodNames = new Map(neighborhoods.map((neighborhood) => [neighborhood.id, neighborhood.name]));
  const neighborhoodCounts = new Map();
  const truckCounts = new Map();
  const dayCounts = new Map(DAY_NAMES.map((name) => [name, 0]));
  const shiftCounts = new Map([["MANANA", 0], ["MEDIODIA", 0], ["TARDE", 0]]);
  const reasonCounts = new Map();
  const durationCounts = new Map(DURATION_RANGES.map((range) => [range, 0]));
  const timelineCounts = new Map();
  const transactionProfiles = new Map();
  const affectedOccurrences = new Set();
  const weekByDate = new Map();
  let totalIncidents = 0;
  let retiredIncidents = 0;
  let delayCount = 0;
  let delaySum = 0;
  let firstDate = null;
  let lastDate = null;

  for (const incident of incidents || []) {
    if (!incidentMatchesFilters(incident, filters)) continue;
    totalIncidents += 1;
    if (incident.retired_at) retiredIncidents += 1;
    const incidentDate = incident.analysis_date || localDate(incident.starts_at);
    if (incidentDate && (!firstDate || incidentDate < firstDate)) firstDate = incidentDate;
    if (incidentDate && (!lastDate || incidentDate > lastDate)) lastDate = incidentDate;
    const incidentServices = unique(incident.affected_service_ids || []).map((id) => servicesById.get(id)).filter(Boolean);
    for (const value of unique([...(incident.affected_neighborhood_ids || []), ...incidentServices.map((service) => service.neighborhoodId)])) neighborhoodCounts.set(value, (neighborhoodCounts.get(value) || 0) + 1);
    for (const value of unique([...(incident.affected_truck_ids || []), ...incidentServices.map((service) => service.truckId)])) truckCounts.set(value, (truckCounts.get(value) || 0) + 1);
    for (const value of unique(incidentServices.map((service) => DAY_NAMES[service.day - 1]))) dayCounts.set(value, (dayCounts.get(value) || 0) + 1);
    for (const value of unique(incidentServices.map((service) => shiftFor(service.start)))) shiftCounts.set(value, (shiftCounts.get(value) || 0) + 1);
    reasonCounts.set(incident.reason_code, (reasonCounts.get(incident.reason_code) || 0) + 1);
    const range = durationRange(incident.estimated_delay_minutes);
    if (range) {
      durationCounts.set(range, durationCounts.get(range) + 1);
      delayCount += 1;
      delaySum += Number(incident.estimated_delay_minutes);
    }
    if (incidentDate) {
      let timelineKey;
      if (mode === "demo") timelineKey = demoTimelineKey(incidentDate, filters.startDate, filters.endDate);
      else {
        timelineKey = weekByDate.get(incidentDate);
        if (!timelineKey) {
          timelineKey = mondayOf(incidentDate);
          weekByDate.set(incidentDate, timelineKey);
        }
      }
      timelineCounts.set(timelineKey, (timelineCounts.get(timelineKey) || 0) + 1);
    }
    const transaction = transactionForIncident(incident, servicesById);
    const transactionKey = keyOf(transaction);
    const profile = transactionProfiles.get(transactionKey);
    if (profile) profile.weight += 1;
    else transactionProfiles.set(transactionKey, { items: transaction, weight: 1 });

    const incidentStart = incidentDate;
    const incidentEnd = incident.analysis_end_date || localDate(incident.expires_at) || incidentStart;
    if (incidentStart && incidentEnd) {
      for (const service of incidentServices) {
        for (const date of eachDate(incidentStart, incidentEnd)) {
          if (service.day === isoDay(date)) affectedOccurrences.add(`${service.id}@${date}`);
        }
      }
    }
  }

  const bounds = totalIncidents ? {
    start: filters.startDate || firstDate,
    end: filters.endDate || lastDate,
  } : { start: null, end: null };
  const expected = expectedServiceOccurrences(services, bounds, filters);
  const expectedForRankings = expectedServiceOccurrences(services, bounds, {});
  const affectedOccurrenceCount = [...affectedOccurrences].filter((key) => {
    const date = key.slice(key.lastIndexOf("@") + 1);
    return bounds.start && bounds.end && date >= bounds.start && date <= bounds.end;
  }).length;
  const mined = apriori([...transactionProfiles.values()], parameters, neighborhoodNames);
  const reasons = sortedEntries(reasonCounts, (code) => REASON_LABELS[code] || code);
  const includeNormalizedRate = mode !== "demo";
  const charts = {
    neighborhoods: ranking(neighborhoodCounts, expectedForRankings.countsByNeighborhood, (id) => neighborhoodNames.get(id) || id, includeNormalizedRate),
    trucks: ranking(truckCounts, expectedForRankings.countsByTruck, (id) => id, includeNormalizedRate),
    reasons,
    weekdays: DAY_NAMES.map((id) => ({ id, label: id.charAt(0) + id.slice(1).toLowerCase(), count: dayCounts.get(id) || 0 })),
    shifts: [...shiftCounts].map(([id, count]) => ({ id, label: id.charAt(0) + id.slice(1).toLowerCase(), count })),
    timeline: [...timelineCounts].sort(([left], [right]) => left.localeCompare(right)).map(([period, count]) => ({ id: period, label: period, count })),
    durations: DURATION_RANGES.map((id) => ({ id, label: id === "MAS_DE_120" ? "> 120" : id, count: durationCounts.get(id) || 0 })),
  };
  const indicators = {
    total_incidents: totalIncidents,
    affected_neighborhoods: neighborhoodCounts.size,
    affected_trucks: truckCounts.size,
    most_frequent_reason: reasons[0]?.label || null,
    average_estimated_delay_minutes: delayCount ? delaySum / delayCount : null,
    association_rules: mined.totalRuleCount,
    programmed_services_in_period: expected.total,
    affected_programmed_service_occurrences: affectedOccurrenceCount,
    retired_incidents: retiredIncidents,
    compressed_transaction_profiles: new Set(
      [...transactionProfiles.values()].map((profile) => keyOf(profile.items)),
    ).size,
    normalized_rates_applicable: includeNormalizedRate,
  };
  return {
    mode,
    unit_of_analysis: mode === "demo"
      ? "Una transacción por registro sintético único; los perfiles idénticos se comprimen con un peso entero y Apriori conserva el conteo equivalente a su expansión individual."
      : "Una transacción por incidencia única (ID), usando su versión actual; los barrios, camiones, días y turnos afectados son ítems categóricos de esa única transacción.",
    period: bounds,
    filters: {
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      neighborhoodId: filters.neighborhoodId || null,
      truckId: filters.truckId || null,
    },
    record_count: totalIncidents,
    transaction_count: totalIncidents,
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

function analyzeIncidents({ incidents, catalog, mode = "history", filters = {}, parameters = {} }) {
  return analyzeIncidentIterable({
    incidents: deduplicateIncidents(incidents),
    catalog,
    mode,
    filters,
    parameters,
  });
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

function demoOptions(options = {}, defaultCount = 1_000_000) {
  const period = options.period || DEFAULT_DEMO_PERIOD;
  if (!parseDateOnly(period.start) || !parseDateOnly(period.end) || period.start > period.end) {
    throw new Error("El periodo sintético debe contener fechas válidas y Desde no puede ser posterior a Hasta");
  }
  return {
    count: Math.round(clampNumber(options.count, defaultCount, 1, 1_000_000)),
    seed: Number(options.seed ?? 20261111),
    period: { start: period.start, end: period.end },
  };
}

function demoDateOrdinalAt(index, count, startOrdinal, days, random) {
  if (index === 0 || days === 1) return startOrdinal;
  if (index === count - 1) return startOrdinal + days - 1;
  return startOrdinal + Math.floor(random() * days);
}

function* demoIncidentSequence(catalog, options = {}) {
  const configuration = demoOptions(options);
  const { count, seed } = configuration;
  const random = seededRandom(seed);
  const services = (catalog.servicios || catalog.services || []).map(normalizeService);
  if (services.length !== 104) throw new Error("El conjunto sintético requiere exactamente 104 servicios activos");
  const servicesByDay = new Map(DAY_NAMES.map((_, index) => [index + 1, services.filter((service) => service.day === index + 1)]));
  const periodStartOrdinal = dateOrdinal(configuration.period.start);
  const periodDays = inclusiveDayCount(configuration.period.start, configuration.period.end);
  const compatibleByService = new Map(services.map((service) => [
    service.id,
    services.filter((candidate) => (
      candidate.id !== service.id
      && candidate.truckId === service.truckId
      && candidate.day === service.day
    )),
  ]));
  for (let index = 0; index < count; index += 1) {
    const ordinal = demoDateOrdinalAt(index, count, periodStartOrdinal, periodDays, random);
    const date = dateFromOrdinal(ordinal);
    const dayServices = servicesByDay.get(isoDayFromOrdinal(ordinal));
    const primary = dayServices[Math.floor(random() * dayServices.length)];
    const affected = [primary];
    if (random() < 0.18) {
      const compatible = compatibleByService.get(primary.id);
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
    yield {
      id: `DEMO-${String(index + 1).padStart(7, "0")}`,
      state,
      reason_code: reason,
      reason_detail: REASON_LABELS[reason],
      estimated_delay_minutes: delay,
      analysis_date: date,
      analysis_end_date: date,
      starts_at: isoAt(date, earliest),
      expires_at: isoAt(date, latest),
      affected_service_ids: affected.map((service) => service.id),
      affected_neighborhood_ids: neighborhoods,
      affected_truck_ids: trucks,
      primary_target_type: "service",
      primary_target_id: primary.id,
      is_simulation: true,
      retired_at: random() < 0.08 ? isoAt(date, latest) : null,
      updated_at: isoAt(date, earliest),
    };
  }
}

function createDemoIncidents(catalog, options = {}) {
  const configuration = demoOptions(options, 180);
  return {
    incidents: [...demoIncidentSequence(catalog, configuration)],
    seed: configuration.seed,
    count: configuration.count,
    period: configuration.period,
  };
}

function analyzeDemoDataset({ catalog, filters = {}, parameters = {}, seed = 20261111, count = 1_000_000 }) {
  const hasStart = Boolean(filters.startDate);
  const hasEnd = Boolean(filters.endDate);
  if (hasStart !== hasEnd) throw new Error("Completa las fechas Desde y Hasta, o deja ambas vacías para usar el periodo predeterminado");
  const selectedPeriod = hasStart
    ? { start: filters.startDate, end: filters.endDate }
    : DEFAULT_DEMO_PERIOD;
  const configuration = demoOptions({ seed, count, period: selectedPeriod });
  const appliedFilters = {
    ...filters,
    startDate: configuration.period.start,
    endDate: configuration.period.end,
  };
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const services = (catalog.servicios || catalog.services || []).map(normalizeService);
  const neighborhoods = (catalog.barrios || catalog.neighborhoods || []).map(normalizeNeighborhood);
  const trucks = unique(services.map((service) => service.truckId));
  if (services.length !== 104 || neighborhoods.length !== 26 || trucks.length !== 12) {
    throw new Error("El conjunto sintético requiere 26 barrios, 104 servicios y 12 camiones");
  }

  const neighborhoodNames = new Map(neighborhoods.map((neighborhood) => [neighborhood.id, neighborhood.name]));
  const serviceIndexById = new Map(services.map((service, index) => [service.id, index]));
  const compatibleIndexes = services.map((service, primaryIndex) => services
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate, candidateIndex }) => (
      candidateIndex !== primaryIndex
      && candidate.truckId === service.truckId
      && candidate.day === service.day
    ))
    .map(({ candidateIndex }) => candidateIndex));
  const serviceIndexesByDay = new Map(DAY_NAMES.map((_, dayIndex) => [
    dayIndex + 1,
    services.map((service, serviceIndex) => ({ service, serviceIndex }))
      .filter(({ service }) => service.day === dayIndex + 1)
      .map(({ serviceIndex }) => serviceIndex),
  ]));
  const scenarioCache = new Map();
  const scenarioFor = (primaryIndex, secondaryIndex) => {
    const scenarioKey = (primaryIndex * 106) + secondaryIndex + 1;
    let scenario = scenarioCache.get(scenarioKey);
    if (scenario) return scenario;
    const affectedServices = secondaryIndex >= 0
      ? [services[primaryIndex], services[secondaryIndex]]
      : [services[primaryIndex]];
    const neighborhoodIds = unique(affectedServices.map((service) => service.neighborhoodId));
    const truckIds = unique(affectedServices.map((service) => service.truckId));
    const days = unique(affectedServices.map((service) => service.day));
    const shifts = unique(affectedServices.map((service) => shiftFor(service.start)));
    scenario = {
      key: scenarioKey,
      services: affectedServices,
      neighborhoodIds,
      truckIds,
      days,
      shifts,
      hasTruckC01: truckIds.includes("SIM-C01"),
      hasRainNeighborhood: neighborhoodIds.includes("D2-B09") || neighborhoodIds.includes("D2-B18"),
      hasAfternoon: shifts.includes("TARDE"),
      baseItems: [
        ...truckIds.map((value) => `CAMION=${value}`),
        ...neighborhoodIds.map((value) => `BARRIO=${value}`),
        ...days.map((value) => `DIA=${DAY_NAMES[value - 1]}`),
        ...shifts.map((value) => `TURNO=${value}`),
      ],
    };
    scenarioCache.set(scenarioKey, scenario);
    return scenario;
  };

  const reasonCodes = ["LLUVIA", "FALLA_MECANICA", "PROBLEMA_TECNICO", "OTRO"];
  const random = seededRandom(configuration.seed);
  const periodStartOrdinal = dateOrdinal(configuration.period.start);
  const periodDays = inclusiveDayCount(configuration.period.start, configuration.period.end);
  const neighborhoodCounts = new Map();
  const truckCounts = new Map();
  const dayCounts = new Map(DAY_NAMES.map((name) => [name, 0]));
  const shiftCounts = new Map([["MANANA", 0], ["MEDIODIA", 0], ["TARDE", 0]]);
  const reasonCounts = new Map();
  const durationCounts = new Map(DURATION_RANGES.map((range) => [range, 0]));
  const timelineCounts = new Map();
  const transactionProfiles = new Map();
  const affectedOccurrences = new Set();
  let totalIncidents = 0;
  let retiredIncidents = 0;
  let delayCount = 0;
  let delaySum = 0;
  let firstSelectedDate = null;
  let lastSelectedDate = null;
  let firstSyntheticId = null;
  let lastSyntheticId = null;
  let firstGeneratedDate = null;
  let lastGeneratedDate = null;

  for (let index = 0; index < configuration.count; index += 1) {
    const syntheticId = `DEMO-${String(index + 1).padStart(7, "0")}`;
    if (index === 0) firstSyntheticId = syntheticId;
    lastSyntheticId = syntheticId;
    const ordinal = demoDateOrdinalAt(index, configuration.count, periodStartOrdinal, periodDays, random);
    const date = dateFromOrdinal(ordinal);
    if (date < configuration.period.start || date > configuration.period.end) {
      throw new Error("El generador produjo una fecha fuera del intervalo solicitado");
    }
    if (!firstGeneratedDate || date < firstGeneratedDate) firstGeneratedDate = date;
    if (!lastGeneratedDate || date > lastGeneratedDate) lastGeneratedDate = date;
    const dayServiceIndexes = serviceIndexesByDay.get(isoDayFromOrdinal(ordinal));
    const primaryIndex = dayServiceIndexes[Math.floor(random() * dayServiceIndexes.length)];
    const primary = services[primaryIndex];
    let secondaryIndex = -1;
    if (random() < 0.18) {
      const compatible = compatibleIndexes[primaryIndex];
      if (compatible.length) secondaryIndex = compatible[Math.floor(random() * compatible.length)];
    }
    const scenario = scenarioFor(primaryIndex, secondaryIndex);

    let reasonIndex;
    if (scenario.hasTruckC01 && random() < 0.78) reasonIndex = 1;
    else if (scenario.hasRainNeighborhood && random() < 0.72) reasonIndex = 0;
    else if (scenario.hasAfternoon && random() < 0.58) reasonIndex = 2;
    else reasonIndex = Math.floor(random() * reasonCodes.length);
    const stateIndex = random() < 0.1 ? 1 : 0;
    let delay = null;
    if (stateIndex === 0) {
      if (reasonIndex === 1 && scenario.hasTruckC01) delay = 45 + Math.floor(random() * 46);
      else if (reasonIndex === 0 && scenario.hasRainNeighborhood) delay = 35 + Math.floor(random() * 66);
      else delay = 10 + Math.floor(random() * 111);
    }
    const retired = random() < 0.08;

    if (appliedFilters.neighborhoodId && !scenario.neighborhoodIds.includes(appliedFilters.neighborhoodId)) continue;
    if (appliedFilters.truckId && !scenario.truckIds.includes(appliedFilters.truckId)) continue;

    totalIncidents += 1;
    if (retired) retiredIncidents += 1;
    if (!firstSelectedDate || date < firstSelectedDate) firstSelectedDate = date;
    if (!lastSelectedDate || date > lastSelectedDate) lastSelectedDate = date;
    for (const value of scenario.neighborhoodIds) neighborhoodCounts.set(value, (neighborhoodCounts.get(value) || 0) + 1);
    for (const value of scenario.truckIds) truckCounts.set(value, (truckCounts.get(value) || 0) + 1);
    for (const value of scenario.days) {
      const dayName = DAY_NAMES[value - 1];
      dayCounts.set(dayName, (dayCounts.get(dayName) || 0) + 1);
    }
    for (const value of scenario.shifts) shiftCounts.set(value, (shiftCounts.get(value) || 0) + 1);
    const reasonCode = reasonCodes[reasonIndex];
    reasonCounts.set(reasonCode, (reasonCounts.get(reasonCode) || 0) + 1);
    const range = durationRange(delay);
    let durationIndex = 0;
    if (range) {
      durationCounts.set(range, durationCounts.get(range) + 1);
      delayCount += 1;
      delaySum += delay;
      durationIndex = DURATION_RANGES.indexOf(range) + 1;
    }
    const timeBucket = demoTimelineKey(date, configuration.period.start, configuration.period.end);
    timelineCounts.set(timeBucket, (timelineCounts.get(timeBucket) || 0) + 1);
    for (const service of scenario.services) {
      const serviceIndex = serviceIndexById.get(service.id);
      affectedOccurrences.add((ordinal * services.length) + serviceIndex);
    }

    const profileKey = ((((scenario.key * 4) + reasonIndex) * 2 + stateIndex) * 6) + durationIndex;
    const profile = transactionProfiles.get(profileKey);
    if (profile) profile.weight += 1;
    else {
      const items = [
        ...scenario.baseItems,
        `MOTIVO=${reasonCode}`,
        `TIPO=${stateIndex ? "SERVICIO_SUSPENDIDO" : "DEMORA"}`,
      ];
      if (range) items.push(`DURACION=${range}`);
      transactionProfiles.set(profileKey, { items: items.sort(), weight: 1 });
    }
  }

  const bounds = totalIncidents ? {
    start: appliedFilters.startDate || firstSelectedDate,
    end: appliedFilters.endDate || lastSelectedDate,
  } : { start: null, end: null };
  const expected = expectedServiceOccurrences(services, bounds, appliedFilters);
  const expectedForRankings = expectedServiceOccurrences(services, bounds, {});
  const mined = apriori([...transactionProfiles.values()], parameters, neighborhoodNames);
  const reasons = sortedEntries(reasonCounts, (code) => REASON_LABELS[code] || code);
  const charts = {
    neighborhoods: ranking(neighborhoodCounts, expectedForRankings.countsByNeighborhood, (id) => neighborhoodNames.get(id) || id, false),
    trucks: ranking(truckCounts, expectedForRankings.countsByTruck, (id) => id, false),
    reasons,
    weekdays: DAY_NAMES.map((id) => ({ id, label: id.charAt(0) + id.slice(1).toLowerCase(), count: dayCounts.get(id) || 0 })),
    shifts: [...shiftCounts].map(([id, value]) => ({ id, label: id.charAt(0) + id.slice(1).toLowerCase(), count: value })),
    timeline: [...timelineCounts].sort(([left], [right]) => left.localeCompare(right)).map(([bucket, value]) => ({ id: bucket, label: bucket, count: value })),
    durations: DURATION_RANGES.map((id) => ({ id, label: id === "MAS_DE_120" ? "> 120" : id, count: durationCounts.get(id) || 0 })),
  };
  const indicators = {
    total_incidents: totalIncidents,
    affected_neighborhoods: neighborhoodCounts.size,
    affected_trucks: truckCounts.size,
    most_frequent_reason: reasons[0]?.label || null,
    average_estimated_delay_minutes: delayCount ? delaySum / delayCount : null,
    association_rules: mined.totalRuleCount,
    programmed_services_in_period: expected.total,
    affected_programmed_service_occurrences: affectedOccurrences.size,
    retired_incidents: retiredIncidents,
    compressed_transaction_profiles: new Set(
      [...transactionProfiles.values()].map((profile) => keyOf(profile.items)),
    ).size,
    normalized_rates_applicable: false,
    synthetic_seed: configuration.seed,
    synthetic_records_generated: configuration.count,
    synthetic_unique_ids: configuration.count,
    synthetic_first_id: firstSyntheticId,
    synthetic_last_id: lastSyntheticId,
    synthetic_first_date: firstGeneratedDate,
    synthetic_last_date: lastGeneratedDate,
    synthetic_out_of_range_records: 0,
  };
  const analysis = {
    mode: "demo",
    unit_of_analysis: "Una transacción por registro sintético único; los perfiles idénticos se comprimen con un peso entero y Apriori conserva el conteo equivalente a su expansión individual.",
    period: bounds,
    filters: {
      startDate: appliedFilters.startDate || null,
      endDate: appliedFilters.endDate || null,
      neighborhoodId: appliedFilters.neighborhoodId || null,
      truckId: appliedFilters.truckId || null,
    },
    record_count: totalIncidents,
    transaction_count: totalIncidents,
    indicators,
    charts,
    rules: mined.rules,
    rule_count: mined.totalRuleCount,
    frequent_itemset_count: mined.frequentItemsets.length,
    insufficient_data: mined.insufficientData,
    parameters: mined.parameters,
    findings: buildFindings("demo", indicators, charts, mined.rules),
  };
  const finished = typeof performance !== "undefined" ? performance.now() : Date.now();
  analysis.indicators.processing_duration_ms = Math.round((finished - started) * 100) / 100;
  analysis.synthetic_dataset = {
    seed: configuration.seed,
    generated_records: configuration.count,
    unique_ids: configuration.count,
    first_id: firstSyntheticId,
    last_id: lastSyntheticId,
    first_date: firstGeneratedDate,
    last_date: lastGeneratedDate,
    period: configuration.period,
    processing: "Generación determinista en flujo, acumulación incremental y perfiles de transacción ponderados.",
  };
  return analysis;
}

export {
  DAY_NAMES,
  REASON_LABELS,
  analyzeDemoDataset,
  analyzeIncidents,
  apriori,
  createDemoIncidents,
  demoIncidentSequence,
  durationRange,
  normalizeAprioriParameters,
  transactionForIncident,
};
