import { createContext, useContext, useState, useLayoutEffect } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Pročitaj inicijalnu temu iz DOM-a (postavljenu tokom SSR-a) ili localStorage
  const getInitialTheme = (): Theme => {
    if (typeof window === "undefined") return defaultTheme
    
    // Prvo proveri localStorage za tačnu vrednost
    try {
      const stored = localStorage.getItem(storageKey) as Theme | null
      if (stored && ["light", "dark", "system"].includes(stored)) {
        return stored
      }
    } catch (e) {
      // localStorage nije dostupan
    }
    
    // Ako nema u localStorage, proveri klasu na html elementu (postavljenu tokom SSR-a)
    const root = window.document.documentElement
    if (root.classList.contains("light")) return "light"
    if (root.classList.contains("dark")) return "dark"
    
    return defaultTheme
  }

  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  
  // Koristi useLayoutEffect da se tema primeni pre nego što se browser paint-uje
  useLayoutEffect(() => {
    const root = window.document.documentElement
    
    // Ukloni postojeće klase
    root.classList.remove("light", "dark")
    
    // Postavi novu temu
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])


  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, theme)
      }
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}