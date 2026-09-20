import { Commands } from "./commands";
import { KeyMapping } from "./keyboard/keymap-utils";

// Declarative keymap configuration
// Defines all keyboard shortcuts and their associated commands
export const keymap: KeyMapping[] = [
  // App-level commands
  {
    modes: ["app"],
    key: "p",
    modifiers: { ctrl: true },
    command: Commands.PALETTE_OPEN,
    description: "palette",
  },
  {
    modes: ["app"],
    key: ":",
    command: Commands.PALETTE_OPEN,
    description: "command palette",
    showInHelpAs: "commands",
  },
  {
    modes: ["app"],
    key: "q",
    command: Commands.APP_QUIT,
    description: "quit",
  },
  {
    modes: ["app"],
    key: "c",
    modifiers: { ctrl: true },
    command: Commands.APP_QUIT,
    description: "quit",
  },
  {
    modes: ["app"],
    key: "e",
    modifiers: { ctrl: true },
    command: Commands.SIDEBAR_TOGGLE,
    description: "sidebar",
  },
  {
    modes: ["app"],
    key: "tab",
    command: Commands.FOCUS_NEXT,
    description: "switch",
  },
  {
    modes: ["app"],
    key: "r",
    command: Commands.PR_REFRESH,
    description: "refresh",
    showInHelpAs: "refresh",
  },
  {
    modes: ["app"],
    key: "l",
    command: Commands.OPEN_LOKI_LOGS,
    description: "open loki logs",
    showInHelpAs: "logs",
  },
  {
    modes: ["app"],
    key: "p",
    command: Commands.OPEN_PR_LIST,
    description: "open one of my PRs",
    showInHelpAs: "my PRs",
  },
  {
    modes: ["app"],
    key: "y",
    command: Commands.COPY_PR_LINK,
    description: "copy PR link",
    showInHelpAs: "copy link",
  },
  {
    modes: ["app"],
    key: "?",
    command: Commands.HELP_OPEN,
    description: "keyboard help",
    showInHelpAs: "help",
  },

  // Shared navigation (sections + content)
  {
    modes: ["sections", "content"],
    key: "j",
    command: Commands.NAV_DOWN,
    description: "down",
  },
  {
    modes: ["sections", "content"],
    key: "down",
    command: Commands.NAV_DOWN,
    description: "down",
  },
  {
    modes: ["sections", "content"],
    key: "k",
    command: Commands.NAV_UP,
    description: "up",
  },
  {
    modes: ["sections", "content"],
    key: "up",
    command: Commands.NAV_UP,
    description: "up",
  },
  {
    modes: ["sections", "content"],
    key: "g",
    command: Commands.NAV_TOP,
    description: "top",
  },
  {
    modes: ["sections", "content"],
    key: "g",
    modifiers: { shift: true },
    command: Commands.NAV_BOTTOM,
    description: "bottom",
  },
  {
    modes: ["sections", "content"],
    key: "o",
    command: Commands.OPEN_IN_BROWSER,
    description: "open in browser",
    showInHelpAs: "open",
  },

  // Sections-specific
  {
    modes: ["sections"],
    key: "return",
    command: Commands.SECTION_SELECT,
    description: "select",
    showInHelpAs: "select",
  },

  // Content-specific
  {
    modes: ["content"],
    key: "return",
    command: Commands.TOGGLE_EXPAND,
    description: "expand/collapse",
    showInHelpAs: "expand",
  },
  {
    modes: ["content"],
    key: "a",
    command: Commands.TOGGLE_ANNOTATIONS,
    description: "toggle annotations",
    showInHelpAs: "annotations",
  },
  {
    modes: ["content"],
    key: "e",
    command: Commands.CARD_EDIT,
    description: "edit",
    showInHelpAs: "edit",
  },
  {
    modes: ["content"],
    key: "pageup",
    command: Commands.SCROLL_PAGEUP,
    description: "pgup",
  },
  {
    modes: ["content"],
    key: "pagedown",
    command: Commands.SCROLL_PAGEDOWN,
    description: "pgdn",
  },
];
