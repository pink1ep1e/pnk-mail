/** Inline SVG: wifi / no-connection mark (no network needed to render). */
export const OFFLINE_ICON_DATA_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <rect width="72" height="72" rx="18" fill="#17191f"/>
  <path d="M18 28c10.5-9 25.5-9 36 0" stroke="#3b82f6" stroke-width="3.2" stroke-linecap="round" opacity=".35"/>
  <path d="M23.5 34.5c7.3-6.2 17.7-6.2 25 0" stroke="#3b82f6" stroke-width="3.2" stroke-linecap="round" opacity=".55"/>
  <path d="M29 41c4.1-3.4 9.9-3.4 14 0" stroke="#3b82f6" stroke-width="3.2" stroke-linecap="round"/>
  <circle cx="36" cy="48.5" r="3.2" fill="#3b82f6"/>
  <path d="M22 22l28 28" stroke="#ef4444" stroke-width="3.4" stroke-linecap="round"/>
</svg>`,
  );
