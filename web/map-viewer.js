(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlertaRutaMapViewer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function nextZoom(current, delta) {
    const value = Number(current) + Number(delta);
    return Math.min(3, Math.max(0.75, Math.round(value * 100) / 100));
  }

  function validCatalog(maps) {
    return Array.isArray(maps)
      && maps.length === 3
      && new Set(maps.map((item) => item.id)).size === 3
      && maps.every((item) => item.id && item.titulo && item.archivo);
  }

  return { nextZoom, validCatalog };
});
