import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import {
  analyzeIncidents,
  createDemoIncidents,
} from "../_shared/mining-engine.mjs";

const ALLOWED_ORIGINS = new Set([
  "https://khalilar011.github.io",
]);

function allowedOrigin(origin: string) {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

function responseHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin(origin) ? origin : "https://khalilar011.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-schedule-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request) });
}

function namedKey(environmentName: string, fallbackName: string) {
  const encoded = Deno.env.get(environmentName);
  if (encoded) {
    const keys = JSON.parse(encoded);
    if (typeof keys?.default === "string" && keys.default) return keys.default;
  }
  return Deno.env.get(fallbackName) || "";
}

function safeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  return difference === 0;
}

function bearerToken(request: Request) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") || "");
  return match?.[1] || "";
}

function validDate(value: unknown) {
  return value === null || value === undefined || value === "" || /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function cleanFilters(raw: Record<string, unknown> = {}) {
  if (!validDate(raw.startDate) || !validDate(raw.endDate)) throw new Error("Periodo inválido");
  const filters = {
    startDate: raw.startDate ? String(raw.startDate) : null,
    endDate: raw.endDate ? String(raw.endDate) : null,
    neighborhoodId: raw.neighborhoodId ? String(raw.neighborhoodId) : null,
    truckId: raw.truckId ? String(raw.truckId) : null,
  };
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw new Error("La fecha inicial debe ser anterior o igual a la final");
  if (filters.neighborhoodId && !/^D2-B\d{2}$/.test(filters.neighborhoodId)) throw new Error("Barrio inválido");
  if (filters.truckId && !/^SIM-C\d{2}$/.test(filters.truckId)) throw new Error("Camión inválido");
  return filters;
}

async function authorize(request: Request, publicClient: ReturnType<typeof createClient>, adminClient: ReturnType<typeof createClient>) {
  const configuredScheduleSecret = Deno.env.get("MINING_SCHEDULE_SECRET") || "";
  const suppliedScheduleSecret = request.headers.get("x-schedule-secret") || "";
  if (configuredScheduleSecret.length >= 32 && suppliedScheduleSecret && safeEqual(configuredScheduleSecret, suppliedScheduleSecret)) {
    return { executionType: "scheduled", userId: null };
  }
  const token = bearerToken(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const { data: userData, error: userError } = await publicClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error("UNAUTHORIZED");
  const { data: membership, error: membershipError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (membershipError || !membership) throw new Error("FORBIDDEN");
  return { executionType: "manual", userId: userData.user.id };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = namedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_PUBLISHABLE_KEY");
  const secretKey = namedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !publishableKey || !secretKey) return json(request, { error: "Configuración del servidor incompleta" }, 503);

  const publicClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let authorization;
  try {
    authorization = await authorize(request, publicClient, adminClient);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return json(request, { error: "La cuenta no tiene autorización administrativa" }, 403);
    return json(request, { error: "Sesión inválida o vencida" }, 401);
  }

  let payload: Record<string, any>;
  try {
    payload = await request.json();
  } catch (_) {
    return json(request, { error: "Cuerpo JSON inválido" }, 400);
  }
  const mode = payload.mode === "demo" ? "demo" : payload.mode === "history" ? "history" : null;
  if (!mode) return json(request, { error: "Modo de datos inválido" }, 400);
  if (authorization.executionType === "scheduled" && mode !== "history") return json(request, { error: "La tarea programada sólo actualiza el historial del prototipo" }, 400);

  let filters;
  const parameters = payload.parameters && typeof payload.parameters === "object" && !Array.isArray(payload.parameters)
    ? payload.parameters
    : {};
  try {
    filters = cleanFilters(payload.filters || {});
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "Filtros inválidos" }, 400);
  }

  const staleBefore = new Date(Date.now() - (20 * 60 * 1000)).toISOString();
  await adminClient.from("mining_analysis_runs").update({
    status: "FAILED",
    completed_at: new Date().toISOString(),
    error_message: "La ejecución anterior excedió 20 minutos y fue marcada como interrumpida.",
  }).eq("mode", mode).eq("status", "RUNNING").lt("started_at", staleBefore);

  const sourceDescription = mode === "demo"
    ? "Dataset sintético reproducible generado en memoria; no se inserta en incidents."
    : "Versión actual de cada fila de public.incidents, incluidos registros retirados; no se multiplican ediciones del historial.";
  const { data: run, error: runError } = await adminClient.from("mining_analysis_runs").insert({
    mode,
    execution_type: authorization.executionType,
    source_description: sourceDescription,
    status: "RUNNING",
    requested_by: authorization.userId,
    filters,
    parameters,
  }).select("id,started_at").single();
  if (runError) {
    if (runError.code === "23505") return json(request, { error: "Ya existe un análisis en curso para este modo" }, 409);
    console.error("No se pudo crear la corrida", runError);
    return json(request, { error: "No se pudo iniciar el análisis" }, 500);
  }

  try {
    const [neighborhoodResult, serviceResult, incidentResult] = await Promise.all([
      adminClient.from("neighborhood_catalog").select("id,name,uv").eq("active", true),
      adminClient.from("service_catalog").select("id,neighborhood_id,truck_id,day_of_week,start_time,end_time").eq("active", true),
      mode === "history"
        ? adminClient.from("incidents").select("id,state,reason_code,estimated_delay_minutes,starts_at,expires_at,affected_service_ids,affected_neighborhood_ids,affected_truck_ids,retired_at,updated_at,is_simulation")
        : Promise.resolve({ data: [], error: null }),
    ]);
    const queryError = neighborhoodResult.error || serviceResult.error || incidentResult.error;
    if (queryError) throw queryError;
    if (neighborhoodResult.data?.length !== 26 || serviceResult.data?.length !== 104) throw new Error("El catálogo activo no contiene 26 barrios y 104 servicios");

    const catalog = { neighborhoods: neighborhoodResult.data || [], services: serviceResult.data || [] };
    let incidents = incidentResult.data || [];
    if (mode === "demo") {
      const demo = createDemoIncidents(catalog, { seed: 20261111, count: 180 });
      incidents = demo.incidents;
      if (!filters.startDate) filters.startDate = demo.period.start;
      if (!filters.endDate) filters.endDate = demo.period.end;
    }
    const analysis = analyzeIncidents({
      incidents,
      catalog,
      mode,
      filters,
      parameters,
    });
    const completedAt = new Date().toISOString();
    const { data: saved, error: saveError } = await adminClient.from("mining_analysis_runs").update({
      period_start: analysis.period.start,
      period_end: analysis.period.end,
      record_count: analysis.record_count,
      transaction_count: analysis.transaction_count,
      indicators: analysis.indicators,
      chart_data: analysis.charts,
      association_rules: analysis.rules,
      findings: analysis.findings,
      parameters: analysis.parameters,
      filters: analysis.filters,
      unit_of_analysis: analysis.unit_of_analysis,
      status: "COMPLETED",
      error_message: null,
      completed_at: completedAt,
    }).eq("id", run.id).select("*").single();
    if (saveError) throw saveError;
    return json(request, {
      message: analysis.insufficient_data ? "Datos insuficientes para generar reglas" : "Análisis actualizado correctamente",
      run: saved,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error no identificado";
    console.error("Falló la corrida de minería", { runId: run.id, message });
    await adminClient.from("mining_analysis_runs").update({
      status: "FAILED",
      completed_at: new Date().toISOString(),
      error_message: message.slice(0, 1000),
    }).eq("id", run.id);
    return json(request, { error: "Error al actualizar. Intentar nuevamente.", runId: run.id }, 500);
  }
});
