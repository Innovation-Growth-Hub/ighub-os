import type { OfficeLocation } from "./types.js";

/** Business rules shared by the web app and the API. Times are Africa/Lagos. */

export const TIMEZONE = "Africa/Lagos";

export const OFFICES: Record<OfficeLocation, string> = {
  umuahia_hq: "Umuahia HQ",
  aba_hub: "Aba Hub",
};

/** Clock-ins after 09:00 are late (PRD §5.4). */
export const LATE_AFTER = { hour: 9, minute: 0 };
/** 3+ late days in a week incurs ₦5,000 (PRD §7.3). */
export const PENALTY_THRESHOLD = 3;
export const PENALTY_AMOUNT = 5000;

/** Shortest password accepted anywhere (Better Auth's minPasswordLength uses this too). */
export const MIN_PASSWORD_LENGTH = 8;

/** The accountant can approve fund requests below this alone; larger ones go to the super admin. */
export const ACCOUNTANT_APPROVAL_LIMIT = 50_000;

export const INCOME_SOURCES = ["Training Programs", "Web Development", "Consulting", "Other Services"];
export const EXPENSE_CATEGORIES = ["Salaries & stipends", "Rent & utilities", "Internet", "Equipment", "Events", "Marketing"];
