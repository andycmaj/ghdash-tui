// Section list (sidebar): Feed / Actions / Mergeability for the current PR.

import { createSignal, createMemo, For, Show, createSelector } from "solid-js";
import { useGithub } from "../context/github";
import { useFocus } from "../context/focus";
import { useKeyHandler } from "../keyboard/useKeyHandler";
import { focusBorder, prStatusColor } from "../theme/theme";
import { contrastingForeground } from "@/theme/color";
import { useTheme } from "@/hooks/useTheme";
import { Header } from "./header";
import { PaneHeader } from "./pane-header";
import { useToast } from "../context/toast";
import { Commands } from "@/commands";
import { countChecks, prStatusLabel } from "@/github/status-utils";
import { PRStatus, SectionKey } from "@/github/types";
import { truncate } from "@/utils/truncate";
import { openUrl } from "@/utils/open-url";

interface SectionDef {
  key: SectionKey;
  label: string;
}

const SECTIONS: SectionDef[] = [
  { key: SectionKey.Feed, label: "Feed" },
  { key: SectionKey.Actions, label: "Actions" },
  { key: SectionKey.Mergeability, label: "Mergeability" },
];

export function SectionTree() {
  const { state, selectSection } = useGithub();
  const { state: focusState, setActivePane } = useFocus();
  const { showToast } = useToast();
  const theme = useTheme();

  // Navigable rows: the PR header (index 0 → Info) followed by the sections.
  const NAV_COUNT = SECTIONS.length + 1;
  const keyForIndex = (index: number): SectionKey =>
    index === 0 ? SectionKey.Info : SECTIONS[index - 1].key;

  const initialIndex =
    state.selectedSection === SectionKey.Info
      ? 0
      : SECTIONS.findIndex((s) => s.key === state.selectedSection) + 1;
  const [cursor, setCursor] = createSignal(initialIndex < 0 ? 0 : initialIndex);
  const isSelected = createSelector(cursor);
  const headerSelected = createMemo(() => cursor() === 0);

  const isFocused = createMemo(() => focusState.activePane === "sections");

  // Right-aligned summary for each section.
  function sectionSummary(key: SectionKey): {
    text: string;
    color: string | undefined;
  } {
    switch (key) {
      case SectionKey.Feed:
        return { text: `${state.feed.length}`, color: theme.textMuted };
      case SectionKey.Actions: {
        const c = countChecks(state.checks);
        if (c.total === 0) return { text: "—", color: theme.textMuted };
        if (c.failure > 0)
          return { text: `✗ ${c.failure}`, color: theme.error };
        if (c.running + c.pending > 0)
          return { text: `◐ ${c.running + c.pending}`, color: theme.info };
        return { text: `✓ ${c.success}`, color: theme.success };
      }
      case SectionKey.Mergeability: {
        const pr = state.pr;
        if (pr?.status === PRStatus.Merged)
          return { text: "merged", color: theme.accent };
        if (pr?.status === PRStatus.Closed)
          return { text: "closed", color: theme.error };
        if (pr?.mergeQueue) return { text: "queued", color: theme.info };
        const unmet = state.mergeBlockers.filter((b) => !b.satisfied).length;
        if (state.mergeBlockers.length === 0)
          return { text: "—", color: theme.textMuted };
        return unmet > 0
          ? { text: `! ${unmet}`, color: theme.warning }
          : { text: "ready", color: theme.success };
      }
      default:
        return { text: "", color: theme.textMuted };
    }
  }

  function moveCursor(next: number) {
    const clamped = Math.max(0, Math.min(next, NAV_COUNT - 1));
    setCursor(clamped);
    // Content follows the cursor immediately.
    selectSection(keyForIndex(clamped));
  }

  useKeyHandler(
    "sections",
    (command) => {
      switch (command) {
        case Commands.NAV_DOWN:
          moveCursor(cursor() + 1);
          break;
        case Commands.NAV_UP:
          moveCursor(cursor() - 1);
          break;
        case Commands.NAV_TOP:
          moveCursor(0);
          break;
        case Commands.NAV_BOTTOM:
          moveCursor(NAV_COUNT - 1);
          break;
        case Commands.SECTION_SELECT:
          selectSection(keyForIndex(cursor()));
          setActivePane("content");
          break;
        case Commands.OPEN_IN_BROWSER:
          if (state.pr) {
            openUrl(state.pr.url);
            showToast("Opening in browser");
          }
          break;
      }
    },
    isFocused,
  );

  const prTitleColor = createMemo(() =>
    state.pr ? prStatusColor(theme, state.pr.status) : theme.primary,
  );

  const headerBg = createMemo(() => {
    if (!headerSelected()) return undefined;
    return isFocused() ? theme.primary : theme.secondary;
  });
  const headerFg = createMemo(() => {
    if (!headerSelected()) return theme.text;
    return contrastingForeground(
      (isFocused() ? theme.primary : theme.secondary) ?? "#ffffff",
    );
  });

  return (
    <box
      flexDirection="column"
      backgroundColor={theme.contentPane}
      flexGrow={0}
      flexShrink={0}
      marginTop={1}
      marginBottom={1}
      marginLeft={1}
      width={42}
      paddingLeft={isFocused() ? 0 : 1}
      {...focusBorder(theme, isFocused())}
    >
      <PaneHeader
        title={state.pr ? `PR #${state.pr.number}` : "No PR"}
        color={prTitleColor()}
      >
        <Show when={state.pr}>
          <box flexDirection="row" gap={1}>
            <Show when={state.pr!.mergeQueue}>
              <text fg={theme.info}>
                [queued
                {state.pr!.mergeQueue!.position != null
                  ? ` #${state.pr!.mergeQueue!.position}`
                  : ""}
                ]
              </text>
            </Show>
            <Show when={state.pr!.status !== PRStatus.Open}>
              <text fg={prTitleColor()}>
                [{prStatusLabel(state.pr!.status)}]
              </text>
            </Show>
          </box>
        </Show>
      </PaneHeader>

      {/* PR title + branch — selectable (opens the PR Info view). */}
      <box
        flexDirection="column"
        paddingLeft={2}
        paddingRight={2}
        backgroundColor={headerBg()}
      >
        <Show
          when={state.pr}
          fallback={
            <text fg={theme.textMuted}>
              {state.error ? truncate(state.error, 36) : "Loading…"}
            </text>
          }
        >
          <text fg={headerFg()} attributes={headerSelected() ? 1 : 0}>
            {truncate(state.pr!.title, 36)}
          </text>
          <text fg={headerSelected() ? headerFg() : theme.textMuted}>
            {truncate(`${state.pr!.headRef} → ${state.pr!.baseRef}`, 36)}
          </text>
        </Show>
      </box>

      {/* Section list */}
      <box flexDirection="column" flexGrow={1} paddingTop={1} paddingLeft={1}>
        <For each={SECTIONS}>
          {(section, index) => {
            const selectedRow = createMemo(() => isSelected(index() + 1));
            const summary = createMemo(() => sectionSummary(section.key));
            const bg = createMemo(() => {
              if (!selectedRow()) return undefined;
              return isFocused() ? theme.primary : theme.secondary;
            });
            const fg = createMemo(() => {
              if (selectedRow()) {
                return contrastingForeground(
                  (isFocused() ? theme.primary : theme.secondary) ?? "#ffffff",
                );
              }
              return theme.text;
            });
            return (
              <box
                flexDirection="row"
                justifyContent="space-between"
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={bg()}
              >
                <text fg={fg()} attributes={selectedRow() ? 1 : 0}>
                  {section.label}
                </text>
                <text fg={selectedRow() ? fg() : summary().color}>
                  {summary().text}
                </text>
              </box>
            );
          }}
        </For>
      </box>

      {/* Connection/poll status at bottom of sidebar */}
      <Header narrow={true} />
    </box>
  );
}
