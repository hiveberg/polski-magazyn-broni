import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourcePath = process.argv[2];
const outputPath = resolve(process.argv[3] ?? "data/calibers.modern.json");
if (!sourcePath) throw new Error("Użycie: node scripts/generate-caliber-preset.mjs <taxonomies.json> [output]");

const excludedAsVeryHistorical = new Set([
  "22 Extra Long", "300 Sherwood", "303 Savage", "30-40 Krag", "32 Long Colt",
  "380 Long", "38 Long Colt", "38 Short Colt", "41 Long Colt", "44 Colt",
  "6,5 x 52 Carcano", "7,5 x 54 MAS", "7,92 x 33 kurz", "8 mm Gasser",
  "9 mm Browning long",
]);

const canonicalOverrides = new Map([
  ["9 mm Luger", "9×19 mm Parabellum"], ["9 mm Browning court", ".380 ACP"],
  ["22 Long Rifle", ".22 LR"], ["223 Rem.", ".223 Remington"],
  ["45 Auto", ".45 ACP"], ["40 S&W", ".40 S&W"], ["50 Browning", ".50 BMG"],
  ["7.62×51mm NATO", "7,62×51 mm NATO"], ["7,62 x 39", "7,62×39 mm"],
  ["7,62 x 54 R", "7,62×54R mm"], ["5,45 x 39", "5,45×39 mm"],
  ["5,7 x 28", "5,7×28 mm"], ["4,6 X 30", "4,6×30 mm"],
  ["357 Magnum", ".357 Magnum"], ["357 SIG", ".357 SIG"],
  ["38 Special", ".38 Special"], ["308 Marlin Express", ".308 Marlin Express"],
  ["338 Federal", ".338 Federal"], ["375 Ruger", ".375 Ruger"],
  ["416 Barrett", ".416 Barrett"], ["416 Rigby", ".416 Rigby"],
  ["416 Ruger", ".416 Ruger"], ["444 Marlin", ".444 Marlin"],
  ["450 Bushmaster", ".450 Bushmaster"], ["450 Marlin", ".450 Marlin"],
  ["450 Rigby", ".450 Rigby"], ["454 Casull", ".454 Casull"],
  ["458 Lott", ".458 Lott"], ["458 Socom", ".458 SOCOM"],
  ["45-70 Govt.", ".45-70 Government"], ["45 Colt", ".45 Colt"],
]);

// Nazwy potoczne i handlowe używane współcześnie w polskich magazynach broni.
// Nie łączymy nabojów tylko dlatego, że mają zbliżone wymiary (np. .308 Win i 7,62 NATO).
const practicalAliases = new Map([
  [".22 LR", ["22 LR", ".22 Long Rifle", "22 Long Rifle", "5,6×15R mm", "5.6x15R"]],
  [".22 WMR", ["22 WMR", ".22 Magnum", "22 Magnum", ".22 Winchester Magnum Rimfire"]],
  [".223 Remington", ["223 Rem", ".223 Rem", "223 Remington", ".223 Remington"]],
  ["5,56×45 mm NATO", ["5.56 NATO", "5,56 NATO", "5.56x45 NATO", "5,56×45 NATO", "5.56 mm"]],
  ["9×19 mm Parabellum", ["9 mm", "9mm", "9x19", "9×19", "9 mm Luger", "9mm Luger", "9 mm Parabellum", "9mm Parabellum", "9 Para"]],
  [".380 ACP", ["380 ACP", ".380 Auto", "380 Auto", "9×17 mm", "9x17", "9 mm Browning Short", "9 mm Browning krótki"]],
  [".38 Special", ["38 Special", ".38 Spl", "38 Spl", ".38 S&W Special"]],
  [".357 Magnum", ["357 Magnum", ".357 Mag", "357 Mag"]],
  [".357 SIG", ["357 SIG", ".357 Sig", "9×22 mm"]],
  [".40 S&W", ["40 S&W", ".40 Auto", "40 Auto", "10×22 mm"]],
  ["10 mm Auto", ["10mm Auto", "10 mm Automatic", "10×25 mm"]],
  [".45 ACP", ["45 ACP", ".45 Auto", "45 Auto", "11,43×23 mm", "11.43x23"]],
  [".45 Colt", ["45 Colt", ".45 Long Colt", "45 Long Colt"]],
  ["5,45×39 mm", ["5.45x39", "5,45x39", "5,45×39", "5.45 mm Russian"]],
  ["7,62×39 mm", ["7.62x39", "7,62x39", "7,62×39", "M43"]],
  ["7,62×51 mm NATO", ["7.62x51 NATO", "7,62x51 NATO", "7,62 NATO", "7.62 NATO"]],
  ["7,62×54R mm", ["7.62x54R", "7,62x54R", "7,62×54 R", "7.62 Russian"]],
  [".308 Winchester", ["308 Win", ".308 Win", "308 Winchester", ".308 Winchester"]],
  [".30-06 Springfield", ["30-06", ".30-06", "30-06 Springfield", "7,62×63 mm", "7.62x63"]],
  [".300 Winchester Magnum", ["300 Win Mag", ".300 Win Mag", "300 Winchester Magnum"]],
  [".338 Lapua Magnum", ["338 LM", ".338 LM", "338 Lapua", "8,6×70 mm"]],
  ["6,5 Creedmoor", ["6.5 Creedmoor", "6,5 CM", "6.5 CM"]],
  ["8×57 IS", ["8x57 IS", "8×57 JS", "8x57 JS", "7,92×57", "7.92x57", "8 mm Mauser"]],
  ["9,3×62 mm", ["9.3x62", "9,3x62", "9.3×62"]],
  [".50 BMG", ["50 BMG", ".50 Browning", "12,7×99 mm NATO", "12.7x99 NATO"]],
  ["12/70", ["12 gauge", "12 GA", "kaliber 12", "12 bore"]],
  ["12/76", ["12/76 Magnum", "12 gauge Magnum", "12 GA Magnum", "12 Magnum"]],
  ["16/70", ["16 gauge", "16 GA", "kaliber 16"]],
  ["20/70", ["20 gauge", "20 GA", "kaliber 20"]],
  [".410/76", ["410 bore", ".410 bore", "36/76", "kaliber 36"]],
]);

const extraModern = [
  [".22 WMR", ["22 WMR", ".22 Magnum", "22 Magnum"]],
  ["5,56×45 mm NATO", ["5.56 NATO", "5,56 NATO", "5.56x45", "5,56x45 mm"]],
  [".308 Winchester", ["308 Win", ".308 Win"]],
  [".30-06 Springfield", ["30-06", ".30-06", "7,62×63 mm", "7.62x63"]],
  [".300 Winchester Magnum", ["300 Win Mag", ".300 Win Mag"]],
  [".338 Lapua Magnum", ["338 LM", ".338 LM", "8,6×70 mm"]],
  ["6,5 Creedmoor", ["6.5 Creedmoor", "6,5 CM", "6.5 CM"]],
  ["7×64 mm", ["7x64", "7 × 64", "7 mm Brenneke"]],
  ["8×57 IS", ["8x57 IS", "7,92×57", "7.92x57", "8 mm Mauser"]],
  ["9,3×62 mm", ["9.3x62", "9,3x62", "9.3×62"]],
  [".270 Winchester", ["270 Win", ".270 Win"]],
  ["12/70", ["12 gauge", "12 GA", "kaliber 12"]],
  ["12/76", ["12/76 Magnum", "12 gauge Magnum", "12 GA Magnum"]],
  ["16/70", ["16 gauge", "16 GA", "kaliber 16"]],
  ["20/70", ["20 gauge", "20 GA", "kaliber 20"]],
  [".410/76", ["410 bore", ".410 bore", "36/76"]],
];

function normalized(value) {
  return value.normalize("NFKC").toLocaleLowerCase("pl-PL").replace(/[×xX]/g, "x").replace(/\s+/g, "").replace(/^\./, "");
}

function variants(value) {
  const all = new Set([value]);
  const xBase = value.replace(/\s*[×xX]\s*/g, "×");
  all.add(xBase); all.add(xBase.replaceAll("×", "x")); all.add(xBase.replaceAll("×", " x "));
  for (const item of [...all]) {
    all.add(item.replaceAll(",", "."));
    all.add(item.replace(/(\d)\.(\d)/g, "$1,$2"));
    all.add(item.replace(/\s+mm\b/gi, "mm"));
    if (/[×xX]\s*\d/.test(item)) all.add(item.replace(/\bmm\b/gi, "").trim());
    if (item.startsWith(".")) all.add(item.slice(1));
  }
  return [...all].map((entry) => entry.replace(/\s+/g, " ").trim()).filter(Boolean);
}

const source = JSON.parse(await readFile(resolve(sourcePath), "utf8"));
const rows = source.entities?.CALIBER ?? source.taxonomies?.CALIBER ?? [];
const preset = rows.filter((row) => !excludedAsVeryHistorical.has(row.name)).map((row) => {
  const canonicalName = canonicalOverrides.get(row.name) ?? row.displayName ?? row.name;
  const sourceNames = [row.name, row.displayName, row.metricName, row.imperialName, ...(row.aliases ?? []), ...(practicalAliases.get(canonicalName) ?? [])].filter(Boolean);
  const aliases = [...new Set(sourceNames.flatMap(variants))].filter((alias) => normalized(alias) !== normalized(canonicalName));
  return { canonicalName, aliases, source: "armted-historical-taxonomies-3", sourceId: row.externalId ?? row.id, cartridgeType: row.cartridgeType ?? null, metadata: { originalName: row.name, qualityStatus: row.qualityStatus, publicationStatus: row.publicationStatus } };
});
for (const [canonicalName, seedAliases] of extraModern) {
  const aliases = [...seedAliases, ...(practicalAliases.get(canonicalName) ?? [])];
  preset.push({ canonicalName, aliases: [...new Set(aliases.flatMap(variants))].filter((alias) => normalized(alias) !== normalized(canonicalName)), source: "pmb-modern-supplement", sourceId: null, cartridgeType: null, metadata: { reason: "popular contemporary caliber absent from source taxonomy" } });
}
preset.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, "pl", { numeric: true }));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({ version: 1, generatedFrom: sourcePath, excludedAsVeryHistorical: [...excludedAsVeryHistorical], calibers: preset }, null, 2) + "\n");
console.log(`Zapisano ${preset.length} współczesnych kalibrów w ${outputPath}.`);
