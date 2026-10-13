import { en, type Messages } from "./en";
import { id } from "./id";

export const locales = { en, id } satisfies Record<string, Messages>;
export type Locale = keyof typeof locales;
export const DEFAULT_LOCALE: Locale = "en";
