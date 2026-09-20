// Shared modal shell - provides consistent positioning, background, and escape-to-close

import { createMemo, type JSX } from "solid-js";
import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import {
  ThemeContext,
  useThemeName,
  useTerminalSurface,
} from "@/context/theme";
import { getModalTheme } from "@/theme/theme";

export type ModalSize = "sm" | "md" | "lg";

// Preferred width per size; the actual width is clamped to the terminal so the
// modal never overflows a narrow pane (e.g. a half-width tmux split).
export const SIZE_CONFIG: Record<ModalSize, { width: number }> = {
  sm: { width: 50 },
  md: { width: 60 },
  lg: { width: 100 },
};

// Leave a couple of columns of breathing room on each side of the modal.
const MODAL_MARGIN = 4;

interface ModalProps {
  size?: ModalSize;
  onClose: () => void;
  children: JSX.Element;
  // Allow modals to handle additional keys alongside escape
  onKeyboard?: (evt: Parameters<Parameters<typeof useKeyboard>[0]>[0]) => void;
}

export function Modal(props: ModalProps) {
  // Modals are overlays, so they need an opaque surface even when the active
  // theme is transparent; getModalTheme is a no-op for opaque themes. The
  // surface adapts to the detected terminal colors once available.
  const name = useThemeName();
  const terminal = useTerminalSurface();
  const dimensions = useTerminalDimensions();
  const modalTheme = createMemo(() => getModalTheme(name, terminal()));

  // Clamp the preferred width to what the terminal can actually show, then
  // center by offsetting half the resolved width.
  const width = createMemo(() => {
    const preferred = SIZE_CONFIG[props.size ?? "md"].width;
    const available = Math.max(20, dimensions().width - MODAL_MARGIN);
    return Math.min(preferred, available);
  });
  const marginLeft = createMemo(() => -Math.floor(width() / 2));

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      evt.preventDefault();
      props.onClose();
      return;
    }
    props.onKeyboard?.(evt);
  });

  return (
    <ThemeContext.Provider value={modalTheme()}>
      <box
        position="absolute"
        top={2}
        left="50%"
        marginLeft={marginLeft()}
        width={width()}
        backgroundColor={modalTheme().contentPane}
        border={false}
        flexDirection="column"
      >
        {props.children}
      </box>
    </ThemeContext.Provider>
  );
}
