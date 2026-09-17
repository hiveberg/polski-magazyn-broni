import { resolve } from "node:path";
import AdmZip from "adm-zip";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const handgunImage = resolve(process.cwd(), "public/assets/weapon-placeholder-handgun-outline.png");
const longGunImage = resolve(process.cwd(), "public/assets/weapon-placeholder-long-gun-outline.png");

async function login(page: Page, login = "jan.kowalski", password = "Magazyn123!") {
  await page.goto("/login");
  await page.getByLabel("Login").fill(login);
  await page.getByLabel("Hasło").fill(password);
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("bootstrap admin/admin wymusza onboarding, zmianę hasła i ustawienie PIN-u", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Polski Magazyn Broni Palnej" })).toBeVisible();
  await expect(page.locator(".auth-brand-code")).toHaveText("PMBP");
  await expect(page.locator(".auth-brand-title")).toContainText("Ewidencja. Kontrola. Bezpieczeństwo.");
  await expect(page.getByRole("link", { name: "pmbp.pl" })).toHaveAttribute("href", "https://pmbp.pl");
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
  await expect(page.locator(".brand")).toContainText("PMBP");
  await expect(page.locator(".brand")).toContainText("POLSKI MAGAZYN");
  await expect(page.locator(".brand")).toContainText("BRONI PALNEJ");
  await expect(page.locator(".brand")).toContainText("Ewidencja. Kontrola.");
});

test("Flow A: dokument z wieloma plikami, picker dokumentu i pełna karta nowej broni", async ({ page }) => {
  await login(page);
  await page.goto("/documents");
  await page.getByRole("button", { name: "Dodaj dokument" }).click();
  await page.getByLabel("Numer / oznaczenie").fill("E2E/2/2026");
  await page.getByLabel("Data dokumentu", { exact: true }).fill("2026-09-14");
  await page.getByLabel("Opis / nazwa").fill("Zakup E2E z dwoma załącznikami");
  await page.getByLabel("Strony / podmioty").fill("Klub E2E i Sprzedawca");
  await page.locator('input[type="file"][name="files"]').setInputFiles([handgunImage, longGunImage]);
  await page.getByRole("button", { name: "Zapisz dokument" }).click();
  await expect(page.getByRole("link", { name: /E2E\/2\/2026/ })).toBeVisible();
  await expect(page.getByText("2", { exact: true }).last()).toBeVisible();

  await page.goto("/operations/add-weapon");
  await page.getByLabel("Księga broni").selectOption({ label: "A — Broń krótka" });
  await page.getByLabel("Nazwa ewidencyjna").fill("Pistolet testowy Iteracja 2");
  await page.getByLabel("Marka").fill("PMB Test");
  await page.getByPlaceholder("Wpisz nazwę lub alias…").fill("9mm luger");
  await page.getByRole("option", { name: /9×19 mm Parabellum/ }).click();
  await page.getByLabel("Numer broni").fill("ITERATION-2-0001");
  await page.getByLabel("Podstawa nabycia").fill("Faktura E2E/2/2026");

  const documentSearch = page.getByPlaceholder("Numer, nazwa, typ, data lub podmiot…");
  await documentSearch.focus();
  await page.getByRole("button", { name: "Dodaj nowy dokument" }).click();
  const documentDialog = page.getByRole("dialog", { name: "Nowy dokument" });
  await documentDialog.getByLabel("Numer / oznaczenie").fill("PICKER/E2E/2026");
  await documentDialog.getByLabel("Data dokumentu").fill("2026-09-14");
  await documentDialog.getByLabel("Opis / nazwa").fill("Dokument utworzony w pickerze");
  await documentDialog.getByRole("button", { name: "Zapisz dokument" }).click();
  await expect(page.locator(".selected-document")).toContainText("PICKER/E2E/2026");
  await page.getByRole("button", { name: "Zmień dokument" }).click();
  await page.getByPlaceholder("Numer, nazwa, typ, data lub podmiot…").fill("E2E/2/2026");
  await page.getByRole("option", { name: /E2E\/2\/2026/ }).click();

  await page.getByRole("button", { name: "Zapisz i potwierdź PIN-em" }).click();
  const pinDialog = page.getByRole("dialog", { name: "Potwierdź operację" });
  await expect(pinDialog.getByRole("button", { name: /Zatwierdź PIN/ })).toHaveCount(0);
  const pinInput = pinDialog.getByLabel("PIN zalogowanego użytkownika");
  await pinInput.fill("9999");
  await expect(pinDialog.getByRole("alert")).toContainText("Nieprawidłowy PIN");
  await expect(pinInput).toHaveValue("");
  await expect(pinInput).toBeFocused();
  await pinInput.fill("1234");

  const success = page.locator(".success-next");
  await expect(success).toContainText("Dodano broń");
  await expect(success).toContainText(/pozycja A\d+/);
  await success.getByRole("link", { name: "Przejdź do karty broni" }).click();
  await expect(page).toHaveURL(/\/weapons\//);
  await expect(page.getByRole("heading", { name: "Historia wydań" })).toBeVisible();

  await page.getByLabel("Nazwa użytkowa").fill("Pistolet klubowy E2E");
  await page.locator('input[type="file"][name="files"]').setInputFiles([handgunImage, longGunImage]);
  await page.getByRole("button", { name: "Zapisz metadane i zdjęcia" }).click();
  await expect(page.getByText("Metadane karty broni zostały zaktualizowane.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Usuń zdjęcie/ })).toHaveCount(2);
  await page.getByRole("button", { name: /Usuń zdjęcie/ }).first().click();
  await expect(page.getByRole("button", { name: /Usuń zdjęcie/ })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /A\d+ — Pistolet klubowy E2E/ })).toBeVisible();
});

test("Flow B: grid 10-kolumnowy, statusy, automatyczny krok i PIN przy wydaniu oraz zwrocie", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Wydaj broń", exact: true }).click();
  const grid = page.locator(".weapon-grid").first();
  await expect(grid).toBeVisible();
  expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(10);

  const issued = page.getByRole("button", { name: /A2, .*niedostępna/ });
  const withdrawn = page.getByRole("button", { name: /A6, .*niedostępna/ });
  await expect(issued).toBeDisabled();
  await expect(withdrawn).toBeDisabled();
  await expect(issued).toHaveClass(/issued/);
  await expect(withdrawn).toHaveClass(/withdrawn/);
  expect(await issued.evaluate((element) => getComputedStyle(element, "::after").content)).toBe("none");
  expect(await withdrawn.evaluate((element) => getComputedStyle(element, "::after").content)).not.toBe("none");

  await page.getByRole("button", { name: /A1, .*w magazynie/ }).click();
  await expect(page.getByLabel("Imię i nazwisko / nazwa odbiorcy")).toBeVisible();
  await page.getByLabel("Imię i nazwisko / nazwa odbiorcy").fill("Odbiorca E2E");
  await expect(page.getByLabel("Liczba wydawanych magazynków")).toHaveCount(0);
  await page.getByRole("button", { name: /Dalej/ }).click();
  const skipAmmo = page.getByLabel("Pomiń wydanie amunicji");
  await expect(skipAmmo).toBeVisible();
  if (!(await skipAmmo.isChecked())) await skipAmmo.check();
  await page.getByRole("button", { name: /Dalej/ }).click();
  await page.getByRole("button", { name: "Zapisz wydanie" }).click();
  const pin = page.getByRole("dialog", { name: "Potwierdź wydanie broni" });
  await expect(pin.getByRole("button", { name: /PIN/ })).toHaveCount(0);
  await pin.getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.getByText(/Wydanie zapisano jako/)).toBeVisible();
  await page.locator(".dialog-footer").getByRole("button", { name: "Zamknij", exact: true }).click();

  await page.getByRole("button", { name: "Zwróć broń", exact: true }).click();
  await page.getByPlaceholder("Wyszukaj wydaną broń…").fill("A1");
  await page.getByRole("button", { name: /^A1\b/ }).click();
  const returnSummary = page.locator(".confirm-card").filter({ hasText: "Przyjęcie A1" });
  await expect(returnSummary).toContainText("Zwracający: Odbiorca E2E");
  await expect(returnSummary).toContainText("Przyjmujący: Jan Kowalski");
  await page.getByRole("button", { name: "Przyjmij zwrot" }).click();
  await page.getByRole("dialog", { name: "Potwierdź przyjęcie broni" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.getByText(/Przyjęto zwrot broni A1/)).toBeVisible();
});

test("Flow C: rejestry pokazują jedną wybraną księgę", async ({ page }) => {
  await login(page);
  await page.goto("/registers/weapons");
  await expect(page.locator("table.legal-register")).toHaveCount(1);
  await expect(page.locator("caption")).toContainText("Księga A — Broń krótka");
  await page.getByLabel("Wybierz księgę").selectOption({ label: "B — Broń długa" });
  await expect(page.locator("caption")).toContainText("Księga B — Broń długa");
  await expect(page.locator("table.legal-register")).toHaveCount(1);

  await page.goto("/registers/ammunition");
  await expect(page.locator("caption")).toContainText("Księga A — Amunicja sportowa");
  await page.getByLabel("Wybierz księgę").selectOption({ label: "B — Amunicja karabinowa" });
  await expect(page.locator("caption")).toContainText("Księga B — Amunicja karabinowa");
  await expect(page.locator("table.legal-register")).toHaveCount(1);
});

test("Flow D: stan amunicji pokazuje wartości ewidencyjne, zablokowane i dostępne", async ({ page }) => {
  await login(page);
  await page.goto("/ammunition");
  await expect(page.getByRole("tab", { name: "Wg kalibrów" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".overview-kpis")).toHaveCount(0);
  await expect(page.locator(".stock-card").first().locator(".stock-values").first()).toContainText("Ewidencyjny");
  await expect(page.locator(".stock-card").first().locator(".stock-values").first()).toContainText("Zablokowany");
  await expect(page.locator(".stock-card").first().locator(".stock-values").first()).toContainText("Dostępny");

  await page.getByRole("tab", { name: "Wg ksiąg" }).click();
  await expect(page.getByRole("tab", { name: "Wg ksiąg" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".stock-card.book-oriented").first().locator(".stock-values").first()).toBeVisible();
});

test("wydanie amunicji filtruje kalibry, pilnuje stanu i automatycznie łączy księgi źródłowe", async ({ page }) => {
  await login(page);

  await page.goto("/operations/add-ammunition");
  await page.getByLabel("Księga amunicji").selectOption({ label: "B — Amunicja karabinowa" });
  await page.getByPlaceholder("Wpisz nazwę lub alias…").fill("9mm luger");
  await page.getByRole("option", { name: /9×19 mm Parabellum/ }).click();
  await page.getByLabel("Ilość").fill("20");
  await page.getByLabel("Podstawa nabycia / przejęcia").fill("Uzupełnienie stanu do testu rozdziału");
  const documentSearch = page.getByPlaceholder("Numer, nazwa, typ, data lub podmiot…");
  await documentSearch.fill("FV/DEMO/2026");
  await page.getByRole("option", { name: /FV\/DEMO\/2026/ }).click();
  await page.getByRole("button", { name: "Zapisz i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Dodano 20 szt.");

  await page.goto("/operations/issue-ammunition");
  await page.getByLabel("Księga wydań").selectOption({ label: "A — Wydawanie amunicji" });
  const caliberSearch = page.getByPlaceholder("Wpisz nazwę lub alias…");
  await caliberSearch.fill(".45 ACP");
  await expect(page.getByText("Brak pasującego kalibru.")).toBeVisible();
  await caliberSearch.fill("9mm luger");
  await page.getByRole("option", { name: /9×19 mm Parabellum.*8[ .]?270 szt/ }).click();
  await page.getByLabel("Imię i nazwisko / nazwa odbiorcy").fill("Sekcja wieloźródłowa E2E");
  const quantity = page.getByLabel("Ilość");
  const quantityHeight = await quantity.evaluate((element) => element.getBoundingClientRect().height);
  const ammunitionTypeHeight = await page.getByLabel("Typ amunicji").evaluate((element) => element.getBoundingClientRect().height);
  expect(ammunitionTypeHeight).toBe(quantityHeight);
  await quantity.fill("8270");
  const source = page.getByLabel("Księga źródłowa (opcjonalnie)");
  const secondSourceId = await source.locator("option").filter({ hasText: "B — Amunicja karabinowa" }).getAttribute("value");
  await source.selectOption(secondSourceId!);
  await expect(quantity).toHaveAttribute("max", "20");
  await source.selectOption("");
  await expect(quantity).toHaveAttribute("max", "8270");
  await expect(page.getByText(/Planowana blokada:/)).toContainText("A — Amunicja sportowa: 8250 szt.");
  await expect(page.getByText(/Planowana blokada:/)).toContainText("B — Amunicja karabinowa: 20 szt.");
  await page.getByRole("button", { name: "Wydaj i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");

  const success = page.locator(".success-next");
  await expect(success).toContainText("Wydano amunicję");
  await expect(success).toContainText("Sekcja wieloźródłowa E2E");
  await expect(success).toContainText("A — Amunicja sportowa: 8250 szt.");
  await expect(success).toContainText("B — Amunicja karabinowa: 20 szt.");
  await expect(page.getByRole("button", { name: "Wydaj i potwierdź PIN-em" })).toHaveCount(0);
  await success.getByRole("link", { name: "Otwórz książkę wydań" }).click();
  await expect(page.locator("table.legal-register thead th").last()).toHaveText("Status");
  await expect(page.locator("table.legal-register")).toContainText("A — Amunicja sportowa: 8250 szt.");
  await expect(page.locator("table.legal-register")).toContainText("B — Amunicja karabinowa: 20 szt.");
  await expect(page.locator("table.legal-register")).toContainText("Nierozliczone");

  await page.goto("/operations/issue-ammunition");
  await page.getByLabel("Księga wydań").selectOption({ label: "A — Wydawanie amunicji" });
  await page.getByPlaceholder("Wpisz nazwę lub alias…").fill(".223 Remington");
  await page.getByRole("option", { name: /\.223 Remington/ }).click();
  await page.getByLabel("Imię i nazwisko / nazwa odbiorcy").fill("Drugie nierozliczone E2E");
  await page.getByLabel("Ilość").fill("1");
  await page.getByRole("button", { name: "Wydaj i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Drugie nierozliczone E2E");

  await page.goto("/operations/return-ammunition");
  const issueRows = page.locator(".ammo-return-item");
  await expect(issueRows).toHaveCount(2);
  await expect(issueRows.nth(0)).toContainText("Sekcja wieloźródłowa E2E");
  await expect(issueRows.nth(1)).toContainText("Drugie nierozliczone E2E");
  const activeIssue = page.locator(".ammo-return-item").filter({ hasText: "Sekcja wieloźródłowa E2E" });
  const listWidth = await page.locator(".ammo-return-list").evaluate((element) => element.getBoundingClientRect().width);
  const rowWidth = await activeIssue.evaluate((element) => element.getBoundingClientRect().width);
  expect(Math.abs(listWidth - rowWidth)).toBeLessThanOrEqual(2);
  await expect(activeIssue).toContainText("Nierozliczone");
  await expect(activeIssue).toContainText("8270 szt.");
  await activeIssue.getByRole("button", { name: "Rozlicz bez zwrotu" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Zwrot: 0 szt. • rozchód: 8270 szt.");
  await page.getByRole("button", { name: "Rozlicz kolejne wydanie" }).click();
  const secondIssue = page.locator(".ammo-return-item").filter({ hasText: "Drugie nierozliczone E2E" });
  await secondIssue.getByRole("button", { name: "Rozlicz ze zwrotem" }).click();
  await page.getByLabel("Ilość zwracana z 1 szt.").fill("1");
  await page.getByRole("button", { name: "Rozlicz i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Zwrot: 1 szt. • rozchód: 0 szt.");
  await page.getByRole("link", { name: "Otwórz książkę wydań" }).click();
  await expect(page.locator("table.legal-register")).toContainText("Rozliczone");

  await page.goto("/operations/issue-ammunition");
  await page.getByLabel("Księga wydań").selectOption({ label: "A — Wydawanie amunicji" });
  await page.getByPlaceholder("Wpisz nazwę lub alias…").fill(".223 Remington");
  await page.getByRole("option", { name: /.223 Remington.*2[ .]?100 szt/ }).click();
  await page.getByLabel("Imię i nazwisko / nazwa odbiorcy").fill("Zwrot częściowy E2E");
  await page.getByLabel("Ilość").fill("10");
  await page.getByRole("button", { name: "Wydaj i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Zwrot częściowy E2E");

  await page.goto("/operations/return-ammunition");
  const partialIssue = page.locator(".ammo-return-item").filter({ hasText: "Zwrot częściowy E2E" });
  await partialIssue.getByRole("button", { name: "Rozlicz ze zwrotem" }).click();
  await page.getByLabel("Ilość zwracana z 10 szt.").fill("4");
  await page.getByRole("button", { name: "Rozlicz i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Zwrot: 4 szt. • rozchód: 6 szt.");

  await page.goto("/operations/issue-ammunition");
  await expect(page.getByRole("tab", { name: "Nowe wydanie" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Księga wydań").selectOption({ label: "A — Wydawanie amunicji" });
  await page.getByPlaceholder("Wpisz nazwę lub alias…").fill(".223 Remington");
  await page.getByRole("option", { name: /\.223 Remington/ }).click();
  await page.getByLabel("Imię i nazwisko / nazwa odbiorcy").fill("Dokładka E2E");
  await page.getByLabel("Numer dokumentu lub identyfikator").fill("DOKLADKA/1");
  await page.getByLabel("Ilość").fill("5");
  await page.getByRole("button", { name: "Wydaj i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Dokładka E2E");

  await page.getByRole("tab", { name: /^Dokładka/ }).click();
  await expect(page.getByRole("tab", { name: /^Dokładka/ })).toHaveAttribute("aria-selected", "true");
  const topUpRow = page.locator(".ammo-return-item").filter({ hasText: "Dokładka E2E" });
  await expect(topUpRow).toContainText("DOKLADKA/1");
  await expect(topUpRow).toContainText("Dostępne do dokładki");
  await topUpRow.getByRole("button", { name: "Dokładka", exact: true }).click();
  const topUpQuantity = page.getByLabel("Ilość dokładki");
  expect(Number(await topUpQuantity.getAttribute("max"))).toBeGreaterThan(0);
  await topUpQuantity.fill("3");
  await page.getByRole("button", { name: "Wykonaj dokładkę i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź operację" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Dokładka zapisana");
  await expect(page.locator(".success-next")).toContainText("rozchód 5 szt.");
  await expect(page.locator(".success-next")).toContainText("nowe wydanie");
  await page.locator(".success-next").getByRole("link", { name: "Otwórz książkę wydań" }).click();
  const topUpRegisterRows = page.locator("table.legal-register tbody tr").filter({ hasText: "Dokładka E2E" });
  await expect(topUpRegisterRows).toHaveCount(2);
  await expect(topUpRegisterRows.nth(0)).toContainText("Rozliczone");
  await expect(topUpRegisterRows.nth(1)).toContainText("Nierozliczone");
});

test("CREATE odświeża listy ksiąg, kalibrów i użytkowników bez przeładowania strony", async ({ page }) => {
  await login(page, "admin.e2e", "NoweBezpieczneHaslo456");

  await page.goto("/administration/books");
  const booksTable = page.locator("table.paper-table");
  await expect(booksTable).toContainText("Ewidencja broni");
  await expect(booksTable).toContainText("Wydawanie i przyjmowanie broni");
  await expect(booksTable).not.toContainText(/\b(?:WEAPON|AMMUNITION)(?:_ISSUE)?\b/);
  await page.getByRole("button", { name: "Dodaj księgę" }).click();
  await page.getByLabel("Seria (A–ZZ)").fill("QZ");
  await page.getByLabel("Nazwa").fill("Księga E2E odświeżania");
  await page.getByRole("button", { name: "Utwórz księgę" }).click();
  await expect(page.getByText("Rekord został zapisany i jest już widoczny na liście.")).toBeVisible();
  await expect(page.getByText("Księga E2E odświeżania", { exact: true })).toBeVisible();

  await page.goto("/administration/calibers");
  await page.getByRole("button", { name: "Dodaj kaliber" }).click();
  await page.getByLabel("Nazwa kanoniczna").fill("11,11 mm Test E2E");
  await page.getByLabel("Aliasy rozdzielone przecinkami").fill("1111 Test, 11.11 E2E");
  await page.getByRole("button", { name: "Dodaj kaliber" }).click();
  await expect(page.getByText("11,11 mm Test E2E", { exact: true })).toBeVisible();

  await page.goto("/administration/users");
  await page.getByRole("button", { name: "Dodaj użytkownika" }).click();
  await page.getByLabel("Imię").fill("Użytkownik");
  await page.getByLabel("Nazwisko").fill("Odświeżony");
  await page.getByLabel("Login").fill("refresh.e2e");
  await page.getByLabel("Hasło jednorazowe").fill("HasloTymczasowe789");
  await page.getByRole("button", { name: "Dodaj użytkownika" }).click();
  await expect(page.getByText("refresh.e2e", { exact: true })).toBeVisible();
});

test("Flow E: ręczny backup jest poprawnym ZIP-em z bazą, załącznikami, zdjęciami i manifestem", async ({ page }) => {
  await login(page, "admin.e2e", "NoweBezpieczneHaslo456");
  await page.goto("/administration/backups");
  await page.getByRole("button", { name: "Utwórz kopię teraz" }).click();
  await expect(page.getByText(/przeszła walidację/)).toBeVisible();
  const backupTable = page.locator("table.paper-table");
  await expect(backupTable).toContainText("Ręczna");
  await expect(backupTable).toContainText("Poprawna");
  await expect(backupTable).not.toContainText(/\b(?:MANUAL|SUCCESS)\b/);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Pobierz kopię" }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const zip = new AdmZip(path!);
  const names = zip.getEntries().map((entry) => entry.entryName);
  expect(names).toContain("database.sqlite");
  expect(names).toContain("manifest.json");
  expect(names.some((name) => name.startsWith("uploads/documents/"))).toBe(true);
  expect(names.some((name) => name.startsWith("uploads/weapons/"))).toBe(true);
  const manifest = JSON.parse(zip.readAsText("manifest.json"));
  expect(manifest).toMatchObject({ format: "pmb-backup", version: 1, schemaVersion: "20260917120000_navigation_recipients_and_corrections", counts: { ammoAllocations: expect.any(Number), recipients: expect.any(Number), systemSettings: expect.any(Number) } });
  expect(manifest.hashes["database.sqlite"]).toMatch(/^[a-f0-9]{64}$/);

  await page.goto("/administration/audit");
  await expect(page.locator("table.paper-table")).toContainText("Utworzenie kopii zapasowej");
  await expect(page.locator("table.paper-table")).toContainText("Kopia zapasowa");
});

test("korekta amunicji powstaje z wybranej księgi i pozycji, a uwaga trafia do ewidencji", async ({ page }) => {
  await login(page);
  await page.goto("/corrections");
  await expect(page.getByRole("heading", { name: "Korekty" })).toBeVisible();
  await page.getByLabel("Rejestr amunicji").selectOption({ label: "B — Amunicja karabinowa" });
  const entry = page.getByLabel("Pozycja ewidencji");
  const availableEntryId = await entry.locator("option").filter({ hasText: /dostępne [1-9]/ }).first().getAttribute("value");
  expect(availableEntryId).toBeTruthy();
  await entry.selectOption(availableEntryId!);
  await expect(page.getByLabel("Wybrana pozycja")).toBeVisible();
  await page.getByLabel("Korekta ilości ze znakiem minus").fill("-1");
  await page.getByLabel("Uwagi do korekty").fill("Korekta kontrolna E2E");
  await page.getByRole("button", { name: "Zapisz korektę i potwierdź PIN-em" }).click();
  await page.getByRole("dialog", { name: "Potwierdź korektę amunicji" }).getByLabel("PIN zalogowanego użytkownika").fill("1234");
  await expect(page.locator(".success-next")).toContainText("Korekta została zapisana");
  await page.getByRole("link", { name: "Otwórz ewidencję" }).click();
  await expect(page.locator("table.legal-register thead th").last()).toHaveText("Uwagi");
  await expect(page.locator("table.legal-register")).toContainText("Korekta kontrolna E2E");
  await expect(page.locator("table.legal-register")).toContainText("Skorygowano pozycją");
});

test("audyt widoków: wszystkie strony chronione renderują się bez wyjątków", async ({ page }) => {
  await login(page, "admin.e2e", "NoweBezpieczneHaslo456");

  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.url().startsWith("http://127.0.0.1:3107") && response.status() >= 500) {
      runtimeErrors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  const staticRoutes = [
    "/dashboard",
    "/dashboard?action=issue-weapon",
    "/dashboard?action=return-weapon",
    "/weapons",
    "/ammunition",
    "/registers/weapons",
    "/registers/ammunition",
    "/registers/weapon-issues",
    "/registers/ammo-issues",
    "/operations/issue-ammunition",
    "/operations/return-ammunition",
    "/operations/add-weapon",
    "/operations/add-ammunition",
    "/operations/withdraw-weapon",
    "/documents",
    "/corrections",
    "/inspection",
    "/prints",
    "/prints/ammunition-summary",
    "/administration/users",
    "/administration/books",
    "/administration/calibers",
    "/administration/recipients",
    "/administration/audit",
    "/administration/backups",
    "/administration/settings",
  ];

  for (const route of staticRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBeLessThan(500);
    await expect(page.locator("h1").first(), route).toBeVisible();
    await expect(page, route).not.toHaveURL(/\/login/);
  }

  await page.goto("/weapons");
  const weaponHref = await page.locator('a[href^="/weapons/"]').first().getAttribute("href");
  expect(weaponHref).toBeTruthy();
  let response = await page.goto(weaponHref!, { waitUntil: "domcontentloaded" });
  expect(response?.status(), weaponHref!).toBeLessThan(500);
  await expect(page.locator("h1").first()).toBeVisible();

  await page.goto("/documents");
  const documentHref = await page.locator('a[href^="/documents/"]').first().getAttribute("href");
  expect(documentHref).toBeTruthy();
  response = await page.goto(documentHref!, { waitUntil: "domcontentloaded" });
  expect(response?.status(), documentHref!).toBeLessThan(500);
  await expect(page.locator("h1").first()).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});
