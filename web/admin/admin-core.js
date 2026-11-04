(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlertaRutaAdminCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function isConfigured(config, library) {
    return /^https:\/\/.+\.supabase\.co$/.test(String(config?.supabaseUrl || "").trim())
      && String(config?.supabasePublishableKey || "").trim().length > 20
      && Boolean(library?.createClient);
  }

  async function membership(client, userId) {
    const { data, error } = await client.from("admin_users")
      .select("user_id,display_name").eq("user_id", userId).maybeSingle();
    return { authorized: !error && Boolean(data), profile: data || null, error: error || null };
  }

  async function signIn(client, email, password) {
    return client.auth.signInWithPassword({ email, password });
  }

  async function signOut(client) {
    return client.auth.signOut();
  }

  async function saveIncident(client, incidentId, parameters) {
    const rpc = incidentId ? "update_alerta_ruta_incident" : "create_alerta_ruta_incident";
    const params = incidentId ? { ...parameters, p_id: incidentId } : parameters;
    return client.rpc(rpc, params);
  }

  async function retireIncident(client, incidentId) {
    return client.rpc("retire_alerta_ruta_incident", { p_id: incidentId });
  }

  return { isConfigured, membership, signIn, signOut, saveIncident, retireIncident };
});
