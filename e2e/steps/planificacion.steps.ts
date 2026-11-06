import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

const editor = (page: Page) =>
  page.getByRole("dialog", { name: "Nueva sesión" });

function session(page: Page, title: string) {
  return page.getByRole("article").filter({
    has: page.getByRole("button", { name: title, exact: true }),
  });
}

Given("que abro el planificador en un navegador nuevo", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-03T15:00:00Z"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Mi semana/ })).toBeVisible();
});

async function submitWorkout(page: Page, title: string, duration: string) {
  await page.getByRole("button", { name: /Nuevo entrenamiento/ }).click();
  await editor(page)
    .getByLabel(/TÍTULO DEL ENTRENAMIENTO/i)
    .fill(title);
  await editor(page)
    .getByLabel("Tiempo planificado en minutos o HH:MM:SS")
    .fill(duration);
  await editor(page)
    .getByRole("button", { name: /Guardar sesión/ })
    .click();
}

When(
  "guardo {string} con una duración de {string}",
  async ({ page }, title: string, duration: string) => {
    await submitWorkout(page, title, duration);
    await expect(editor(page)).toBeHidden();
  },
);

When(
  "intento guardar {string} con una duración de {string}",
  async ({ page }, title: string, duration: string) => {
    await submitWorkout(page, title, duration);
  },
);

When("recargo el planificador", async ({ page }) => {
  await page.reload();
});

Then(
  "veo {string} con una duración de {string}",
  async ({ page }, title: string, duration: string) => {
    await expect(
      session(page, title).getByText(duration, { exact: true }),
    ).toBeVisible();
  },
);

Then(
  "el formulario sigue abierto y me indica el formato permitido",
  async ({ page }) => {
    await expect(editor(page).getByRole("alert")).toContainText("HH:MM:SS");
    await expect(
      editor(page).getByLabel("Tiempo planificado en minutos o HH:MM:SS"),
    ).toBeFocused();
    await expect(
      editor(page).getByLabel("Tiempo planificado en minutos o HH:MM:SS"),
    ).toHaveAttribute("aria-invalid", "true");
  },
);

When("cierro el formulario", async ({ page }) => {
  page.once("dialog", (dialog) => dialog.accept());
  await editor(page)
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
});

Then("no veo la sesión {string}", async ({ page }, title: string) => {
  await expect(session(page, title)).toHaveCount(0);
});

When(
  "cambio el estado de {string} desde el calendario",
  async ({ page }, title: string) => {
    await session(page, title)
      .getByRole("button", { name: `Cambiar estado de ${title}` })
      .click();
  },
);

Then(
  "{string} figura como {string}",
  async ({ page }, title: string, status: string) => {
    await expect(
      session(page, title).getByRole("button", {
        name: `Cambiar estado de ${title}`,
      }),
    ).toContainText(status);
  },
);

When("deshago el último cambio", async ({ page }) => {
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
});
