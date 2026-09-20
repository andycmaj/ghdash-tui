// Toast notification component - displays temporary messages

import { Show } from "solid-js";
import { useTheme } from "../hooks/useTheme";
import { contrastingForeground } from "../theme/color";
import { useToast } from "../context/toast";

export function Toast() {
  const theme = useTheme();
  const { toast } = useToast();

  return (
    <Show when={toast()}>
      {(current) => {
        // Error toasts get a wider, distinctly-colored surface: API/throttle
        // messages are longer than the usual one-line status blips and need to
        // read as a problem, not a confirmation.
        const isError = () => current().variant === "error";
        const bg = () =>
          isError() ? (theme.error ?? theme.primary) : theme.primary;
        const width = () => (isError() ? 50 : 30);

        return (
          <box
            position="absolute"
            top={1}
            left="50%"
            marginLeft={-Math.floor(width() / 2)}
            width={width()}
            backgroundColor={bg()}
            justifyContent="center"
            padding={1}
          >
            <text fg={contrastingForeground(bg())} wrapMode="word">
              {current().message}
            </text>
          </box>
        );
      }}
    </Show>
  );
}
