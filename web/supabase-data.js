(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlertaRutaData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const FALLBACK_URL = "data/incidencias.json";
  const PUBLIC_COLUMNS = [
    "id", "state", "reason_code", "reason_detail", "estimated_delay_minutes",
    "starts_at", "expires_at", "primary_target_type", "primary_target_id",
    "affected_service_ids", "affected_neighborhood_ids", "affected_truck_ids",
    "published_at", "updated_at", "is_simulation",
  ].join(",");

  function configuration() {
    const value = root.ALERTA_RUTA_CONFIG || {};
    return {
      url: String(value.supabaseUrl || "").trim(),
      key: String(value.supabasePublishableKey || "").trim(),
      refreshSeconds: Math.max(30, Number(value.refreshSeconds) || 60),
    };
  }

  function isConfigured() {
    const config = configuration();
    return /^https:\/\/.+\.supabase\.co$/.test(config.url) && config.key.length > 20 && Boolean(root.supabase?.createClient);
  }

  async function loadFallback() {
    const response = await fetch(FALLBACK_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo leer respaldo JSON (${response.status})`);
    const payload = await response.json();
    if (!Array.isArray(payload.incidencias)) throw new Error("Respaldo JSON inválido");
    return { incidents: payload.incidencias, updatedAt: payload.ultima_actualizacion, mode: "json" };
  }

  function publicClient() {
    if (!isConfigured()) return null;
    const config = configuration();
    return root.supabase.createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  async function loadPublic(client) {
    const { data, error } = await client.from("incidents").select(PUBLIC_COLUMNS).order("updated_at", { ascending: false });
    if (error) throw error;
    const incidents = (data || []).map(root.AlertaRutaIncidents.normalizeRow);
    return { incidents, updatedAt: incidents[0]?.actualizada_en || null, mode: "supabase" };
  }

  async function start(onUpdate) {
    const client = publicClient();
    if (!client) {
      const initial = await loadFallback();
      await onUpdate(initial);
      return { mode: "json", stop() {} };
    }
    try {
      await onUpdate(await loadPublic(client));
    } catch (error) {
      console.warn("Supabase no disponible; se usa el respaldo JSON.", error);
      const fallback = await loadFallback();
      fallback.warning = "Supabase no respondió; se muestra el respaldo local.";
      await onUpdate(fallback);
      return { mode: "json", stop() {} };
    }

    let loading = false;
    const reload = async () => {
      if (loading) return;
      loading = true;
      try { await onUpdate(await loadPublic(client)); } catch (error) { console.error("No se actualizaron incidencias", error); }
      finally { loading = false; }
    };
    const channel = client.channel("public-incidents").on(
      "postgres_changes", { event: "*", schema: "public", table: "incidents" }, reload,
    ).subscribe();
    const timer = root.setInterval(reload, configuration().refreshSeconds * 1000);
    return {
      mode: "supabase",
      stop() { root.clearInterval(timer); client.removeChannel(channel); },
    };
  }

  return { configuration, isConfigured, publicClient, loadFallback, loadPublic, start, PUBLIC_COLUMNS };
});
