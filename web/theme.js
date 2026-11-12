(function () {
  "use strict";

  const storageKey = "alerta-ruta-theme";
  const root = document.documentElement;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  function savedTheme() {
    try {
      const value = window.localStorage.getItem(storageKey);
      return value === "light" || value === "dark" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function initialTheme() {
    return savedTheme() || (systemTheme.matches ? "dark" : "light");
  }

  function updateControls(theme) {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const nextTheme = theme === "dark" ? "claro" : "oscuro";
      button.setAttribute("aria-label", `Cambiar a modo ${nextTheme}`);
      button.setAttribute("title", `Cambiar a modo ${nextTheme}`);
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.dataset.themeState = theme;
    });
  }

  function applyTheme(theme, persist) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#0B1720" : "#F1F5F7";
    if (persist) {
      try { window.localStorage.setItem(storageKey, theme); } catch (_) { /* Preferencia no disponible. */ }
    }
    updateControls(theme);
    window.dispatchEvent(new CustomEvent("alerta-ruta:theme-change", { detail: { theme } }));
  }

  applyTheme(initialTheme(), false);

  document.addEventListener("DOMContentLoaded", () => {
    updateControls(root.dataset.theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
      });
    });
  });

  systemTheme.addEventListener("change", (event) => {
    if (!savedTheme()) applyTheme(event.matches ? "dark" : "light", false);
  });

  window.AlertaRutaTheme = Object.freeze({ current: () => root.dataset.theme, apply: applyTheme });
}());
