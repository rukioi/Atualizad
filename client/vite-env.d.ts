/// <reference types="vite/client" />

declare global {
  interface Window {
    logout: () => void;
  }
}
