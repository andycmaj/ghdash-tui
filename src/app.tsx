// Main App component

import { createEffect, onCleanup, onMount, Show } from "solid-js";
import { useRenderer } from "@opentui/solid";
import { GithubProvider, useGithub } from "./context/github";
import { FocusProvider, useFocus } from "./context/focus";
import { ToastProvider, useToast } from "./context/toast";
import { ThemeProvider } from "./context/theme";
import type { ThemeName } from "./theme/theme";
import { Toast } from "./components/toast";
import { setGlobalRenderer } from "./global-renderer";
import { Header } from "./components/header";
import { SectionTree } from "./components/section-tree";
import { SectionView } from "./components/section-view";
import {
  CommandPalette,
  type PaletteOption,
} from "./components/command-palette";
import { KeyboardHelp } from "./components/keyboard-help";
import { useTheme } from "./hooks/useTheme";
import { useKeyHandler } from "./keyboard/useKeyHandler";
import { Commands } from "./commands";
import { KeyEvent } from "@opentui/core";
import { MergeConfirmModal } from "./components/merge-confirm-modal";
import { PrEditModal } from "./components/pr-edit-modal";
import { PrLabelsModal } from "./components/pr-labels-modal";
import { PrOpenModal } from "./components/pr-open-modal";
import { canMerge } from "./github/status-utils";
import { openUrl } from "./utils/open-url";
import { copyToClipboard } from "./utils/copy-to-clipboard";
import { lokiLogsUrl } from "./utils/loki";
import type { PRSpec } from "./github/pr-spec";

function AppContent() {
  const renderer = useRenderer();

  // Register renderer globally for emergency cleanup
  onMount(() => {
    setGlobalRenderer(renderer);
  });
  onCleanup(() => {
    setGlobalRenderer(null);
  });

  // Debug console activation with the backtick key
  const debugKeyHandler = (key: KeyEvent) => {
    if (key.name === "`") {
      renderer.console.toggle();
    }
  };
  renderer.keyInput.on("keypress", debugKeyHandler);
  onCleanup(() => renderer.keyInput.off("keypress", debugKeyHandler));

  const {
    cyclePane,
    sidebarVisible,
    toggleSidebar,
    activeModal,
    openModal,
    closeModal,
    isModalOpen,
  } = useFocus();
  const { state, refresh } = useGithub();
  const { showToast } = useToast();
  const theme = useTheme();

  // Surface background fetch/API failures (e.g. GitHub rate-limit throttling) as
  // an error toast. state.error is otherwise only visible as a red status dot and
  // a truncated footer line, which is easy to miss. Fire once per distinct
  // message so a persisting error during retry backoff doesn't re-toast on every
  // poll; a recovery (error -> null) re-arms it.
  let lastErrorToast: string | null = null;
  createEffect(() => {
    const err = state.error;
    if (err && err !== lastErrorToast) {
      showToast(err, 6000, "error");
    }
    lastErrorToast = err;
  });

  function executeCommand(command: string) {
    switch (command) {
      case Commands.APP_QUIT:
        renderer.destroy();
        process.exit(0);
      case Commands.SIDEBAR_TOGGLE:
        toggleSidebar();
        break;
      case Commands.FOCUS_NEXT:
      case Commands.FOCUS_PREV:
        cyclePane();
        break;
      case Commands.PALETTE_OPEN:
        openModal("palette");
        break;
      case Commands.HELP_OPEN:
        openModal("help");
        break;
      case Commands.OPEN_PR_LIST:
        openModal("openPr");
        break;
      case Commands.COPY_PR_LINK:
        if (state.pr) {
          copyToClipboard(state.pr.url).then((ok) =>
            showToast(
              ok ? "PR link copied" : "Could not copy link",
              2000,
              ok ? undefined : "error",
            ),
          );
        } else {
          showToast("No PR loaded");
        }
        break;
      case Commands.PR_REFRESH:
        refresh();
        showToast("Refreshing…", 1500);
        break;
      case Commands.MERGE_PR:
        if (canMerge(state.pr, state.mergeBlockers)) {
          openModal("mergeConfirm");
        } else {
          showToast("PR is not ready to merge");
        }
        break;
      case Commands.OPEN_LOKI_LOGS:
        if (state.pr) {
          openUrl(lokiLogsUrl(state.pr.number));
          showToast(`Opening logs for dev-${state.pr.number}`);
        } else {
          showToast("No PR loaded");
        }
        break;
    }
  }

  // App-level keyboard handling (disabled when any modal is open)
  useKeyHandler("app", executeCommand, () => !isModalOpen());

  function handlePaletteSelect(option: PaletteOption) {
    executeCommand(option.command);
  }

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={theme.background}
    >
      {/* Main content: SectionTree (sidebar) + SectionView */}
      <box flexDirection="row" flexGrow={1}>
        <Show when={sidebarVisible()}>
          <SectionTree />
        </Show>
        <SectionView />
      </box>

      {/* Command Palette overlay */}
      <Show when={activeModal() === "palette"}>
        <CommandPalette
          onClose={() => closeModal()}
          onSelect={handlePaletteSelect}
        />
      </Show>

      {/* Keyboard Help overlay */}
      <Show when={activeModal() === "help"}>
        <KeyboardHelp onClose={() => closeModal()} />
      </Show>

      {/* Merge confirmation overlay */}
      <Show when={activeModal() === "mergeConfirm"}>
        <MergeConfirmModal onClose={() => closeModal()} />
      </Show>

      {/* PR editing overlays */}
      <Show when={activeModal() === "editTitle"}>
        <PrEditModal field="title" onClose={() => closeModal()} />
      </Show>
      <Show when={activeModal() === "editBody"}>
        <PrEditModal field="body" onClose={() => closeModal()} />
      </Show>
      <Show when={activeModal() === "editLabels"}>
        <PrLabelsModal onClose={() => closeModal()} />
      </Show>

      {/* Open one of my PRs */}
      <Show when={activeModal() === "openPr"}>
        <PrOpenModal onClose={() => closeModal()} />
      </Show>

      {/* Header - only shown when sidebar is hidden */}
      <Show when={!sidebarVisible()}>
        <box flexShrink={0}>
          <Header />
        </box>
      </Show>
    </box>
  );
}

export interface AppProps {
  theme?: ThemeName;
  pollMs?: number;
  tokenOverride?: string;
  prSpec?: PRSpec;
}

export function App(props: AppProps) {
  return (
    <ThemeProvider name={props.theme}>
      <GithubProvider
        pollMs={props.pollMs}
        tokenOverride={props.tokenOverride}
        prSpec={props.prSpec}
      >
        <FocusProvider>
          <ToastProvider>
            <AppContent />
            <Toast />
          </ToastProvider>
        </FocusProvider>
      </GithubProvider>
    </ThemeProvider>
  );
}
