"use strict";

const { test, expect } = require("@playwright/test");

const baseUrl = process.env.ALERTA_RUTA_URL || "http://127.0.0.1:8000";

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  for (const colorScheme of ["light", "dark"]) {
    test(`simulación adaptable a ${viewport.width}px en modo ${colorScheme}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, colorScheme });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/simulacion/`, { waitUntil: "networkidle" });
      await expect(page.locator("#start-simulation")).toBeEnabled();
      await expect(page.getByText("SIMULACIÓN ACADÉMICA · RECORRIDO ILUSTRATIVO")).toBeVisible();
      await expect(page.getByText("No es seguimiento GPS real.")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(await page.locator("html").getAttribute("data-theme")).toBe(colorScheme);
      await page.screenshot({ path: `/tmp/alerta-ruta-${viewport.width}-${colorScheme}.png`, fullPage: true });
      await page.locator("[data-theme-toggle]").click();
      expect(await page.locator("html").getAttribute("data-theme")).toBe(colorScheme === "dark" ? "light" : "dark");
      await context.close();
    });
  }
}

test("controles, movimiento continuo y resultados finales", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/simulacion/`, { waitUntil: "networkidle" });
  await expect(page.locator("#start-simulation")).toBeEnabled();

  await page.locator('[data-speed="fast"]').click();
  await page.locator("#start-simulation").click();
  await expect(page.locator("#state-badge")).toHaveText("Recolectando");
  await page.waitForTimeout(800);
  await expect(page.locator("#state-badge")).toHaveText("En tránsito");
  const movingFrom = await page.locator("#route-truck").getAttribute("transform");
  await page.waitForTimeout(250);
  const movingTo = await page.locator("#route-truck").getAttribute("transform");
  expect(movingTo).not.toBe(movingFrom);
  expect(await page.locator(".route-stage").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await page.locator("#pause-simulation").click();
  await expect(page.locator("#state-badge")).toHaveText("Pausado");
  const pausedClock = await page.locator("#simulation-clock").textContent();
  const pausedPosition = await page.locator("#route-truck").getAttribute("transform");
  await page.waitForTimeout(250);
  expect(await page.locator("#simulation-clock").textContent()).toBe(pausedClock);
  expect(await page.locator("#route-truck").getAttribute("transform")).toBe(pausedPosition);

  await page.locator('[data-speed="normal"]').click();
  await page.locator("#start-simulation").click();
  await page.waitForTimeout(250);
  await page.locator("#pause-simulation").click();
  expect(await page.locator("#simulation-clock").textContent()).not.toBe(pausedClock);

  await page.locator("#reset-simulation").click();
  await expect(page.locator("#simulation-clock")).toHaveText("08:00");
  await expect(page.locator("#metric-total")).toHaveText("0 min");
  await expect(page.locator("#route-truck")).toHaveAttribute("transform", "translate(120.00 275.00)");

  await page.locator('[data-speed="fast"]').click();
  await page.locator("#start-simulation").click();
  await expect(page.locator("#control-title")).toHaveText("Recorrido completado", { timeout: 6000 });
  await expect(page.locator("#metric-total")).toHaveText("149 min");
  await expect(page.locator("#metric-travel")).toHaveText("61 min");
  await expect(page.locator("#metric-collection")).toHaveText("77 min");
  await expect(page.locator("#metric-delay")).toHaveText("11 min");
  await expect(page.locator("#metric-stops")).toHaveText("3 / 3");
  await expect(page.locator("#metric-finish")).toHaveText("10:29");

  await page.locator("#reset-simulation").click();
  await expect(page.locator("#control-title")).toHaveText("Listo en Santa Clara");
  await expect(page.locator("#start-simulation")).toBeEnabled();
});
