// Theme selection context - provides the active color scheme to the UI. The
// active theme is a reactive store so that foreground colors detected from the
// terminal (asynchronously, just after first render) flow into every consumer.

import {
  createContext,
  createSignal,
  onMount,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";
import { createStore } from "solid-js/store";
import { useRenderer } from "@opentui/solid";
import {
  defaultTheme,
  getTheme,
  resolveForeground,
  type TerminalSurface,
  type Theme,
  type ThemeName,
} from "@/theme/theme";

export const ThemeContext = createContext<Theme>(defaultTheme);
const ThemeNameContext = createContext<ThemeName>("default");
const TerminalSurfaceContext = createContext<Accessor<TerminalSurface>>(
  () => null,
);

export function ThemeProvider(props: ParentProps<{ name?: ThemeName }>) {
  const name = props.name ?? "default";
  const renderer = useRenderer();
  const [terminal, setTerminal] = createSignal<TerminalSurface>(null);
  // Copy the singleton: createStore takes ownership of its backing object, and
  // setTheme must not mutate the shared theme returned by getTheme.
  const [theme, setTheme] = createStore<Theme>({ ...getTheme(name) });

  onMount(async () => {
    try {
      const colors = await renderer.getPalette();
      if (colors?.defaultBackground) {
        setTerminal({
          background: colors.defaultBackground,
          foreground: colors.defaultForeground ?? colors.defaultBackground,
        });
      }
      // Resolve the terminal's own text color into the theme's undefined
      // foregrounds so `terminal`/`mono` read correctly on light terminals.
      // Fall back to a dark foreground when we only know it's a light terminal.
      const foreground =
        colors?.defaultForeground ??
        (renderer.themeMode === "light" ? "#1a1a1a" : undefined);
      setTheme(resolveForeground(getTheme(name), foreground));
    } catch (error) {
      // Terminals that don't answer OSC palette queries keep the static theme.
      console.error("Failed to detect terminal palette:", error);
    }
  });

  return (
    <ThemeNameContext.Provider value={name}>
      <TerminalSurfaceContext.Provider value={terminal}>
        <ThemeContext.Provider value={theme}>
          {props.children}
        </ThemeContext.Provider>
      </TerminalSurfaceContext.Provider>
    </ThemeNameContext.Provider>
  );
}

/**
 * Returns the active theme. Falls back to `defaultTheme` when used outside a
 * ThemeProvider (e.g. unit tests, or the crash-screen error fallback).
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** The active theme name (used to pick the modal surface). */
export function useThemeName(): ThemeName {
  return useContext(ThemeNameContext);
}

/** Accessor for the detected terminal colors, or null until/unless detected. */
export function useTerminalSurface(): Accessor<TerminalSurface> {
  return useContext(TerminalSurfaceContext);
}
