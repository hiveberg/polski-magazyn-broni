import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("logowanie, wydanie i zwrot broni", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Login").fill("jan.kowalski");
  await page.getByLabel("Hasło").fill("Magazyn123!");
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Wydaj broń", exact: true }).click();
  await page.getByLabel("Wyszukaj broń").fill("A1");
  await page.getByRole("button", { name: /A1, .*w magazynie/ }).click();
  await page.getByRole("button", { name: /Dalej/ }).click();
  await page.getByLabel("Imię i nazwisko / nazwa odbiorcy").fill("Odbiorca E2E");
  await page.getByLabel("Liczba magazynków").fill("2");
  await page.getByRole("button", { name: /Dalej/ }).click();
  const skipAmmo = page.getByLabel("Pomiń wydanie amunicji");
  if (!(await skipAmmo.isChecked())) await skipAmmo.check();
  await page.getByRole("button", { name: /Dalej/ }).click();
  await page.getByLabel("PIN zalogowanego pracownika").fill("1234");
  await page.getByRole("button", { name: "Potwierdź PIN-em" }).click();
  await expect(page.getByText(/Wydanie zapisano jako/)).toBeVisible();
  await page.getByText("Zamknij", { exact: true }).click();

  await page.getByRole("button", { name: "Zwróć broń", exact: true }).click();
  await page.getByPlaceholder("Wyszukaj wydaną broń…").fill("A1");
  await page.getByRole("button", { name: /^A1\b/ }).click();
  await page.getByLabel("PIN pracownika").fill("1234");
  await page.getByRole("button", { name: "Przyjmij zwrot" }).click();
  await expect(page.getByText(/Przyjęto zwrot broni A1/)).toBeVisible();
});

test("bootstrap admin/admin wymusza onboarding, zmianę hasła i ustawienie PIN-u", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Login").fill("admin");
  await page.getByLabel("Hasło").fill("admin");
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel("Imię").fill("Administrator");
  await page.getByLabel("Nazwisko").fill("E2E");
  await page.getByLabel("Login administratora").fill("admin.e2e");
  await page.getByLabel("Hasło jednorazowe").fill("HasloJednorazowe123");
  await page.getByRole("button", { name: "Utwórz administratora" }).click();
  await expect(page).toHaveURL(/\/login\?onboarding=complete/);

  await page.getByLabel("Login").fill("admin.e2e");
  await page.getByLabel("Hasło").fill("HasloJednorazowe123");
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/change-password/);
  await page.getByLabel("Nowe hasło").fill("NoweBezpieczneHaslo456");
  await page.getByLabel("Powtórz hasło").fill("NoweBezpieczneHaslo456");
  await page.getByLabel("Twój 4-cyfrowy PIN operacyjny").fill("4321");
  await page.getByRole("button", { name: "Zapisz i przejdź do pulpitu" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
