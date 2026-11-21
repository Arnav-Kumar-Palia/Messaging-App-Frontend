/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API. Empty means same origin (the dev proxy). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
