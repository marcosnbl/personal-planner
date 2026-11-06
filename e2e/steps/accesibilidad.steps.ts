import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

When("escribo una sesión sin guardarla", async ({ page }) => {
  await page.getByRole("button", { name: /Nuevo entrenamiento/ }).click();
  await page.getByLabel("TÍTULO DEL ENTRENAMIENTO").fill("Sesión pendiente");
  await page.getByRole("button", { name: /Running$/ }).click();
});

When("rechazo descartar los cambios al presionar Escape", async ({ page }) => {
  page.once("dialog", async (dialog) => {
    await dialog.dismiss();
  });
  await page.keyboard.press("Escape");
});

Then("conservo los datos y la selección accesible", async ({ page }) => {
  await expect(page.getByLabel("TÍTULO DEL ENTRENAMIENTO")).toHaveValue(
    "Sesión pendiente",
  );
  await expect(page.getByRole("button", { name: /Running$/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

When("abro configuración con el teclado", async ({ page }) => {
  await page.getByRole("button", { name: "Ingresar", exact: true }).focus();
  await page.keyboard.press("Enter");
});

Then("el foco permanece dentro de configuración", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "Configuración" });
  await expect(
    dialog.getByRole("button", { name: "Cerrar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Borrar todos los entrenamientos" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Cerrar", exact: true }),
  ).toBeFocused();
});

Then("puedo activar la importación JSON con el teclado", async ({ page }) => {
  await page.getByRole("button", { name: /Cargar JSON/ }).focus();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await chooser;
});

When("cierro configuración con Escape", async ({ page }) => {
  await page.keyboard.press("Escape");
});

Then("el foco regresa al botón de ingreso", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: "Ingresar", exact: true }),
  ).toBeFocused();
});

When("abro copiar semana", async ({ page }) => {
  await page
    .getByRole("button", { name: "Copiar semana", exact: true })
    .focus();
  await page.keyboard.press("Enter");
});

Then("puedo cerrar copiar semana con Escape", async ({ page }) => {
  await expect(
    page
      .getByRole("dialog", { name: "Copiar semana" })
      .getByLabel("Un día de la semana de destino"),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Copiar semana" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Copiar semana", exact: true }),
  ).toBeFocused();
});

When("abro guardar plantilla", async ({ page }) => {
  const session = page.getByRole("article").filter({
    has: page.getByRole("button", {
      name: "Rodaje para plantilla",
      exact: true,
    }),
  });
  await session.locator("summary").click();
  await session
    .getByRole("button", { name: "Guardar plantilla", exact: true })
    .click();
});

Then("el contenido del fondo queda bloqueado", async ({ page }) => {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".topbar")
        .evaluate((element) => !!element.closest("[inert]")),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator(".multi-calendar")
        .evaluate((element) => !!element.closest("[inert]")),
    )
    .toBe(true);
  await expect
    .poll(() => dialog.evaluate((element) => !!element.closest("[inert]")))
    .toBe(false);
});

When("cierro guardar plantilla con Escape", async ({ page }) => {
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Guardar plantilla" }),
  ).toBeHidden();
});

Then("el contenido del fondo vuelve a estar disponible", async ({ page }) => {
  await expect
    .poll(() =>
      page
        .locator(".topbar")
        .evaluate((element) => !!element.closest("[inert]")),
    )
    .toBe(false);
  await expect
    .poll(() =>
      page
        .locator(".multi-calendar")
        .evaluate((element) => !!element.closest("[inert]")),
    )
    .toBe(false);
  await expect(
    page.getByRole("button", { name: "Copiar semana", exact: true }),
  ).toBeEnabled();
});
