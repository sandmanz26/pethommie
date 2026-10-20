/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** "false" turns off the mock accounts and the sign-up helper. */
  readonly VITE_DEMO_MODE?: string;
  /** Shown as the copyright holder (default "Pethommie"). */
  readonly VITE_COMPANY_NAME?: string;
  /** Where people can write to you, shown in the footer, legal pages and Help. Optional. */
  readonly VITE_CONTACT_EMAIL?: string;
  /** Your WhatsApp for support, in international digits (6281...). Optional. */
  readonly VITE_CONTACT_WHATSAPP?: string;
}
