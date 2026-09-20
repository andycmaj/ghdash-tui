// Custom hook for declarative keyboard handling
// Wraps useKeyboard with mode-based command resolution

import { useKeyboard } from "@opentui/solid";
import { handleKeyEvent } from "./handler";
import { Mode, Command } from "./keymap-utils";
import { useFocus } from "@/context/focus";

/**
 * Hook for handling keyboard events with declarative command mapping
 * @param mode - The mode to use for key mapping lookup
 * @param onCommand - Callback invoked when a mapped command is triggered
 * @param enabled - Optional reactive condition to enable/disable handling (e.g., focus state)
 */
export function useKeyHandler(
  mode: Mode,
  onCommand: (command: Command) => void,
  enabled: () => boolean = () => true,
) {
  const { isModalOpen } = useFocus();

  useKeyboard((event) => {
    // Skip if not enabled (e.g., not focused)
    if (!enabled()) {
      return;
    }

    // A single key press is dispatched to every registered handler with the
    // same event instance. If an earlier handler already consumed it (e.g. the
    // sidebar's `return` that switched focus to the content pane), don't act on
    // it again — otherwise the same keystroke would also fire the newly-focused
    // pane's `return` command.
    if (event.defaultPrevented) {
      return;
    }

    const command = handleKeyEvent(event, mode, isModalOpen());
    if (command) {
      onCommand(command);
    }
  });
}
