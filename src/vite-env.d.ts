/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK_USERNAME?: string
  readonly VITE_MOCK_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

