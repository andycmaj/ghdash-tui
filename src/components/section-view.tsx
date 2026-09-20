// Content pane: renders the selected section (Feed / Actions / Mergeability)
// with a per-item cursor so `o` can open the focused item's URL. The section
// bodies live in ./sections/*; this file owns navigation, scrolling, and keys.

import {
  createMemo,
  createEffect,
  createSignal,
  on,
  Match,
  Switch,
} from "solid-js";
import { createStore } from "solid-js/store";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { useGithub } from "../context/github";
import { useFocus } from "../context/focus";
import { useToast } from "../context/toast";
import { useKeyHandler } from "../keyboard/useKeyHandler";
import { Commands } from "../commands";
import { focusBorder } from "../theme/theme";
import { useTheme } from "@/hooks/useTheme";
import { PaneHeader } from "./pane-header";
import { Footer } from "./footer";
import { openUrl } from "@/utils/open-url";
import { SectionKey } from "@/github/types";
import { PrInfo } from "./pr-info";
import { FeedSection } from "./sections/feed-section";
import {
  ActionsSection,
  buildActionsNodes,
  type ActionsNode,
} from "./sections/actions-section";
import { MergeabilitySection } from "./sections/mergeability-section";

const SIDEBAR_WIDTH = 44;

export function SectionView() {
  const { state } = useGithub();
  const { state: focusState, openModal } = useFocus();
  const { showToast } = useToast();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();

  let scrollRef: ScrollBoxRenderable | undefined;

  const isFocused = createMemo(() => focusState.activePane === "content");

  const [cursor, setCursor] = createSignal(0);

  // Per-workflow expand/collapse overrides for the Actions tree. Absent an
  // explicit toggle, a workflow follows its status-derived default: expanded
  // while failing or in progress, collapsed once complete and successful.
  const [expanded, setExpanded] = createStore<Record<string, boolean>>({});
  const isExpanded = (key: string, defaultOpen: boolean) =>
    expanded[key] ?? defaultOpen;

  // Whether job annotations are rendered under the Actions tree (toggled by `a`).
  const [showAnnotations, setShowAnnotations] = createSignal(true);

  // Usable text width inside the content pane (minus sidebar, borders, padding).
  const bodyWidth = createMemo(() => {
    const w = dimensions().width - SIDEBAR_WIDTH - 8;
    return Math.max(20, w);
  });

  const viewportHeight = createMemo(() => scrollRef?.viewport.height ?? 20);

  // Flattened Actions tree: workflow rows, each followed by its jobs when open.
  const actionsNodes = createMemo<ActionsNode[]>(() =>
    buildActionsNodes(state.checks, isExpanded),
  );

  // URL for each navigable item in the active section (undefined → PR url).
  const itemUrls = createMemo<(string | undefined)[]>(() => {
    switch (state.selectedSection) {
      case SectionKey.Info:
        // Three cards (title / description / labels); `o` opens the PR itself.
        return state.pr ? [undefined, undefined, undefined] : [];
      case SectionKey.Feed:
        return state.feed.map((f) => f.url);
      case SectionKey.Actions:
        return actionsNodes().map((n) =>
          n.kind === "workflow" ? n.group.url : n.check.url,
        );
      case SectionKey.Mergeability:
        return state.mergeBlockers.map(() => undefined);
      default:
        return [];
    }
  });

  const itemCount = createMemo(() => itemUrls().length);

  // Reset the cursor to the top whenever the section changes.
  createEffect(
    on(
      () => state.selectedSection,
      () => setCursor(0),
    ),
  );

  // Keep the cursor within bounds as the underlying list changes (polling).
  createEffect(
    on(itemCount, (count) => {
      if (cursor() > count - 1) setCursor(Math.max(0, count - 1));
    }),
  );

  function childId(index: number): string {
    return `sv-${state.selectedSection}-${index}`;
  }

  function moveCursor(next: number) {
    const count = itemCount();
    if (count === 0) return;
    const clamped = Math.max(0, Math.min(next, count - 1));
    setCursor(clamped);
    scrollRef?.scrollChildIntoView(childId(clamped));
  }

  function openSelected() {
    const url = itemUrls()[cursor()] ?? state.pr?.url;
    if (url) {
      openUrl(url);
      showToast("Opening in browser");
    }
  }

  useKeyHandler(
    "content",
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
          moveCursor(itemCount() - 1);
          break;
        case Commands.SCROLL_PAGEUP:
          moveCursor(cursor() - pageStep());
          break;
        case Commands.SCROLL_PAGEDOWN:
          moveCursor(cursor() + pageStep());
          break;
        case Commands.OPEN_IN_BROWSER:
          openSelected();
          break;
        case Commands.TOGGLE_EXPAND:
          activate();
          break;
        case Commands.CARD_EDIT:
          editCurrentCard();
          break;
        case Commands.TOGGLE_ANNOTATIONS:
          setShowAnnotations((v) => !v);
          break;
      }
    },
    isFocused,
  );

  // Enter expands a workflow in the Actions tree, or edits the active card in
  // the PR Info view.
  function activate() {
    if (state.selectedSection === SectionKey.Info) {
      editCurrentCard();
      return;
    }
    if (state.selectedSection !== SectionKey.Actions) return;
    const node = actionsNodes()[cursor()];
    if (node?.kind === "workflow") {
      // node.expanded already resolves override-or-default, so flip that.
      setExpanded(node.group.key, !node.expanded);
      scrollRef?.scrollChildIntoView(childId(cursor()));
    }
  }

  // Open the edit modal for the active PR Info card (0 title / 1 body / 2 labels).
  function editCurrentCard() {
    if (state.selectedSection !== SectionKey.Info || !state.pr) return;
    switch (cursor()) {
      case 0:
        openModal("editTitle");
        break;
      case 1:
        openModal("editBody");
        break;
      case 2:
        openModal("editLabels");
        break;
    }
  }

  function pageStep(): number {
    return Math.max(1, Math.floor(viewportHeight() / 4));
  }

  const title = createMemo(() => {
    switch (state.selectedSection) {
      case SectionKey.Info:
        return "PR Info";
      case SectionKey.Feed:
        return "Feed";
      case SectionKey.Actions:
        return "Actions";
      case SectionKey.Mergeability:
        return "Mergeability";
      default:
        return "";
    }
  });

  // Only show the selection marker when this pane holds focus.
  const activeCursor = createMemo(() => (isFocused() ? cursor() : -1));

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      marginTop={1}
      marginBottom={1}
      marginRight={1}
      paddingLeft={isFocused() ? 0 : 1}
      {...focusBorder(theme, isFocused())}
    >
      <PaneHeader title={title()} />

      <scrollbox
        ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
        flexGrow={1}
        paddingLeft={2}
        paddingRight={1}
        stickyScroll={false}
      >
        <Switch>
          <Match when={state.selectedSection === SectionKey.Info}>
            <PrInfo
              width={bodyWidth()}
              selected={activeCursor}
              idFor={childId}
            />
          </Match>
          <Match when={state.selectedSection === SectionKey.Feed}>
            <FeedSection
              width={bodyWidth()}
              selected={activeCursor}
              idFor={childId}
            />
          </Match>
          <Match when={state.selectedSection === SectionKey.Actions}>
            <ActionsSection
              width={bodyWidth()}
              selected={activeCursor}
              idFor={childId}
              nodes={actionsNodes}
              showAnnotations={showAnnotations}
            />
          </Match>
          <Match when={state.selectedSection === SectionKey.Mergeability}>
            <MergeabilitySection
              width={bodyWidth()}
              selected={activeCursor}
              idFor={childId}
            />
          </Match>
        </Switch>
      </scrollbox>

      <Footer />
    </box>
  );
}
