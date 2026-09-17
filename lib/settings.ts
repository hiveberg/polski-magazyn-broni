export const dashboardActionKeys = ["issueWeapon", "returnWeapon", "issueAmmo", "returnAmmo", "addWeapon", "addAmmo", "prints"] as const;
export const dashboardActionTones = ["neutral", "blue", "navy", "teal", "green", "amber", "violet", "red"] as const;

export type DashboardActionKey = typeof dashboardActionKeys[number];
export type DashboardActionTone = typeof dashboardActionTones[number];
export type DashboardActionColors = Record<DashboardActionKey, DashboardActionTone>;

export const dashboardActionLabels: Record<DashboardActionKey, string> = {
  issueWeapon: "Wydaj broń",
  returnWeapon: "Zwróć broń",
  issueAmmo: "Wydaj amunicję",
  returnAmmo: "Zwróć amunicję",
  addWeapon: "Dodaj broń",
  addAmmo: "Dodaj amunicję",
  prints: "Wydruki",
};

export const dashboardToneLabels: Record<DashboardActionTone, string> = {
  neutral: "Neutralny",
  blue: "Niebieski",
  navy: "Granatowy",
  teal: "Turkusowy",
  green: "Zielony",
  amber: "Bursztynowy",
  violet: "Fioletowy",
  red: "Czerwony",
};

export const defaultDashboardActionColors: DashboardActionColors = {
  issueWeapon: "blue",
  returnWeapon: "neutral",
  issueAmmo: "neutral",
  returnAmmo: "neutral",
  addWeapon: "neutral",
  addAmmo: "neutral",
  prints: "neutral",
};

export function parseDashboardActionColors(value: unknown): DashboardActionColors {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(dashboardActionKeys.map((key) => [key, dashboardActionTones.includes(candidate[key] as DashboardActionTone) ? candidate[key] : defaultDashboardActionColors[key]])) as DashboardActionColors;
}
