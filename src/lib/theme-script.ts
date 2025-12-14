/**
 * Helper funkcija za određivanje teme bez pristupa localStorage
 * Koristi se tokom SSR-a
 */
export function getThemeClass(defaultTheme: "dark" | "light" | "system" = "system"): string {
  // Na serveru uvek vraćamo defaultTheme
  if (typeof window === "undefined") {
    if (defaultTheme === "system") {
      return "dark" // Fallback za sistem na serveru
    }
    return defaultTheme
  }

  // Na klijentu pročitaj iz localStorage
  try {
    const stored = localStorage.getItem("vite-ui-theme")
    if (stored === "light" || stored === "dark") {
      return stored
    }
    if (stored === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
  } catch (e) {
    // localStorage nije dostupan
  }

  // Fallback na defaultTheme
  if (defaultTheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return defaultTheme
}

