/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Set by `orbbits export <id>`: render only that Bit, at the site root. */
  readonly ORBBITS_EXPORT_BIT: string;
  /** URL of the source repository resolved by astro.config; '' when unknown. */
  readonly ORBBITS_REPO: string;
}

declare module '*.yml' {
  const value: unknown;
  export default value;
}
