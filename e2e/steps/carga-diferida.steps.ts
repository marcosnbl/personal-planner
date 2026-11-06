import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const { When, Then } = createBdd();
const attempts = new WeakMap<
  Page,
  { url: string; release?: () => void; finished?: Promise<void> }
>();

function editorUrl() {
  const directory = join(process.cwd(), ".next/static/chunks");
  const file = readdirSync(directory, {
    recursive: true,
    encoding: "utf8",
  }).find(
    (name) =>
      name.endsWith(".js") &&
      readFileSync(join(directory, name), "utf8").includes(
        "Tiempo planificado en minutos o HH:MM:SS",
      ),
  );
  if (!file) throw new Error("No se encontró el chunk del editor compilado");
  return `**/_next/static/chunks/${file.replaceAll("\\", "/")}`;
}

When("demoro la descarga del editor", async ({ page }) => {
  const url = editorUrl();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  attempts.set(page, { url, release, finished });
  await page.route(url, async (route) => {
    await gate;
    try {
      await route.continue();
    } finally {
      finish();
    }
  });
});

When("falla la descarga del editor", async ({ page }) => {
  const url = editorUrl();
  attempts.set(page, { url });
  await page.route(url, (route) => route.abort("failed"));
});

When("abro un nuevo entrenamiento", async ({ page }) => {
  await page.getByRole("button", { name: /Nuevo entrenamiento/ }).click();
});

Then(
  "puedo cancelar la carga con Escape y volver al calendario",
  async ({ page }) => {
    await expect(
      page.getByRole("dialog", { name: "Cargando formulario" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cerrar", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    attempts.get(page)?.release?.();
    await attempts.get(page)?.finished;
    await page.unroute(attempts.get(page)!.url);
    await expect(
      page.getByRole("button", { name: /Nuevo entrenamiento/ }),
    ).toBeEnabled();
  },
);

Then("veo un error recuperable del formulario", async ({ page }) => {
  await expect(
    page
      .getByRole("dialog", { name: "Error al cargar formulario" })
      .getByRole("alert"),
  ).toContainText("Revisá la conexión");
});

When("restauro la descarga y reintento", async ({ page }) => {
  await page.unroute(attempts.get(page)!.url);
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
});

Then("se abre el editor de una nueva sesión", async ({ page }) => {
  await expect(
    page.getByRole("dialog", { name: "Nueva sesión" }),
  ).toBeVisible();
});
