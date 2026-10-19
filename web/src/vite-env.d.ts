/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** "false" turns off the mock accounts and the sign-up helper. */
  readonly VITE_DEMO_MODE?: string;
}
