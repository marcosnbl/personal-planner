import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given(
  "que abro el planificador para usarlo sin conexión",
  async ({ page, browserName }) => {
    // The fake clock replaces Resource Timing, which offline preparation needs.
    if (browserName === "webkit") {
      await page.addInitScript(() => {
        Object.defineProperty(window, "requestIdleCallback", {
          value: undefined,
          configurable: true,
        });
      });
    }
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /Nuevo entrenamiento/ }),
    ).toBeVisible();
  },
);

Given("que falla temporalmente la preparación offline", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Cache.prototype.addAll;
    let fail = true;
    Cache.prototype.addAll = function (...args) {
      if (fail) {
        fail = false;
        document.documentElement.dataset.offlinePreparationFailed = "true";
        return Promise.reject(new TypeError("Simulated cache failure"));
      }
      return original.apply(this, args);
    };
  });
});

When(
  "recupero la conexión después de fallar la preparación",
  async ({ page, context }) => {
    await expect(page.locator("html")).toHaveAttribute(
      "data-offline-preparation-failed",
      "true",
      { timeout: 20000 },
    );
    await context.setOffline(true);
    await context.setOffline(false);
  },
);

Given("que el navegador recuerda el modo oscuro", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("training-planner.theme.v1", "dark");
  });
});

Given(
  "que el navegador bloquea el almacenamiento del tema",
  async ({ page }) => {
    await page.addInitScript(() => {
      const originalGet = Storage.prototype.getItem;
      const originalSet = Storage.prototype.setItem;

      Storage.prototype.getItem = function (key) {
        if (key === "training-planner.theme.v1")
          throw new DOMException("Blocked", "SecurityError");
        return originalGet.call(this, key);
      };

      Storage.prototype.setItem = function (key, value) {
        if (key === "training-planner.theme.v1")
          throw new DOMException("Blocked", "SecurityError");
        originalSet.call(this, key, value);
      };
    });
  },
);

When("activo el modo oscuro", async ({ page }) => {
  await page.getByRole("button", { name: "Activar modo oscuro" }).click();
});

Then("el planificador usa el modo oscuro", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Activar modo claro" }),
  ).toBeVisible();
});

Then("puedo seguir agregando entrenamientos", async ({ page }) => {
  await page.getByRole("button", { name: /Nuevo entrenamiento/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Nueva sesión" }),
  ).toBeVisible();
});

When("consulto las estadísticas de tiempo", async ({ page }) => {
  await page.getByRole("button", { name: /Estadísticas/ }).click();
  await page
    .getByRole("combobox", { name: "Métrica", exact: true })
    .selectOption("minutes");
});

Then("las estadísticas muestran 71 minutos para Running", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Tiempo (min) · Running" }),
  ).toBeVisible();
  const table = page.getByRole("table", {
    name: "Semana actual: comparación por disciplina",
  });
  await expect(
    table.getByRole("row").filter({ hasText: "Running" }),
  ).toContainText("1h 11m");
});

Given(
  "que las vistas diferidas ya están disponibles sin conexión",
  async ({ page }) => {
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const assets = [
              ...new Set(
                performance
                  .getEntriesByType("resource")
                  .map((entry) => entry.name),
              ),
            ].filter(
              (url) =>
                new URL(url).origin === location.origin &&
                new URL(url).pathname.startsWith("/_next/static/") &&
                new URL(url).pathname.endsWith(".js"),
            );
            const cache = await caches.open("training-planner-shell-v2");
            const ready = await cache.match("/_offline/ready");
            const matches = await Promise.all(
              assets.map((url) => cache.match(url)),
            );
            return {
              views: ready ? (await ready.json()).views : [],
              missing: assets.filter((_, index) => !matches[index]),
            };
          }),
        { timeout: 20000 },
      )
      .toEqual({
        views: ["editor", "move", "statistics", "account"],
        missing: [],
      });
  },
);

When("pierdo la conexión", async ({ context }) => {
  await context.setOffline(true);
});

Then(
  "puedo abrir todas las vistas diferidas sin conexión",
  async ({ page }) => {
    await page.getByRole("button", { name: /Estadísticas/ }).click();
    await expect(
      page.getByRole("heading", { name: "Estadísticas", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Volver a mi semana/ }).click();
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Probar sin cuenta" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.locator(".session-card").first().locator("summary").click();
    await page
      .getByRole("button", { name: "Mover a otra fecha", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Mover entrenamiento" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  },
);
