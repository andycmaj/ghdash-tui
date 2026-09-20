// Command Palette component - filterable command list with grouping

import { TextAttributes } from "@opentui/core";
import type { ScrollBoxRenderable } from "@opentui/core";
import { createMemo, For, Show } from "solid-js";
import { useTheme } from "@/hooks/useTheme";
import { contrastingForeground } from "@/theme/color";
import { useListNavigation } from "@/hooks/useListNavigation";
import { Modal } from "./modal/modal";
import { ModalHeader } from "./modal/modal-header";
import { ModalFilterInput } from "./modal/modal-filter-input";
import { useFocus } from "../context/focus";
import { useGithub } from "../context/github";
import { canMerge } from "@/github/status-utils";
import {
  getHelpMappingsForMode,
  formatKeyDisplay,
  type Command,
} from "../keyboard/keymap-utils";
import { Commands } from "../commands";
import { truncate } from "../utils/truncate";

export interface PaletteOption {
  title: string;
  value: string;
  description?: string;
  category: string;
  command: Command;
}

interface CommandPaletteProps {
  onClose: () => void;
  onSelect: (option: PaletteOption) => void;
}

export function CommandPalette(props: CommandPaletteProps) {
  const theme = useTheme();
  const { state: focusState } = useFocus();
  const { state } = useGithub();

  let scrollRef: ScrollBoxRenderable | undefined;

  // Options derived from the keymap: app-level bindings plus the active pane's,
  // plus contextual PR actions (e.g. merge, only when the PR is ready).
  const options = createMemo(() => {
    const result: PaletteOption[] = [];
    const seen = new Set<Command>();

    if (canMerge(state.pr, state.mergeBlockers)) {
      result.push({
        title: "Merge PR — add to merge queue",
        value: `command:${Commands.MERGE_PR}`,
        description: `#${state.pr!.number}`,
        category: "PR Actions",
        command: Commands.MERGE_PR,
      });
    }

    const appBindings = getHelpMappingsForMode("app");
    const modeBindings = getHelpMappingsForMode(focusState.activePane);

    for (const [category, bindings] of [
      ["Commands", appBindings],
      ["This View", modeBindings],
    ] as const) {
      for (const mapping of bindings) {
        if (seen.has(mapping.command)) continue;
        seen.add(mapping.command);
        result.push({
          title: mapping.showInHelpAs ?? mapping.description,
          value: `command:${mapping.command}`,
          description: formatKeyDisplay(mapping),
          category,
          command: mapping.command,
        });
      }
    }

    return result;
  });

  const nav = useListNavigation({
    itemCount: () => flat().length,
    scrollRef: () => scrollRef,
  });

  const filtered = createMemo(() => {
    const needle = nav.filter().toLowerCase();
    if (!needle) return options();

    return options().filter(
      (opt) =>
        opt.title.toLowerCase().includes(needle) ||
        opt.category.toLowerCase().includes(needle) ||
        (opt.description?.toLowerCase().includes(needle) ?? false),
    );
  });

  const grouped = createMemo(() => {
    const groups = new Map<string, PaletteOption[]>();
    const categoryOrder = ["PR Actions", "Commands", "This View"];

    for (const opt of filtered()) {
      const existing = groups.get(opt.category) ?? [];
      existing.push(opt);
      groups.set(opt.category, existing);
    }

    const result: [string, PaletteOption[]][] = [];
    for (const cat of categoryOrder) {
      const opts = groups.get(cat);
      if (opts && opts.length > 0) {
        result.push([cat, opts]);
      }
    }
    return result;
  });

  const flat = createMemo(() => {
    const result: PaletteOption[] = [];
    for (const [, opts] of grouped()) {
      result.push(...opts);
    }
    return result;
  });

  const selected = createMemo(() => flat()[nav.selected()]);

  function handleSelect() {
    const opt = selected();
    if (!opt) return;
    // Close the palette first so commands that open their own modal (e.g.
    // merge confirm) aren't immediately dismissed by this close.
    props.onClose();
    props.onSelect(opt);
  }

  function handleKeyboard(evt: {
    name: string;
    ctrl?: boolean;
    preventDefault: () => void;
  }) {
    if (evt.name === "up" || (evt.ctrl && evt.name === "k")) {
      evt.preventDefault();
      nav.move(-1);
      return;
    }

    if (evt.name === "down" || (evt.ctrl && evt.name === "j")) {
      evt.preventDefault();
      nav.move(1);
      return;
    }

    if (evt.name === "return") {
      evt.preventDefault();
      handleSelect();
      return;
    }
  }

  const maxHeight = 20;

  return (
    <Modal size="md" onClose={props.onClose} onKeyboard={handleKeyboard}>
      <ModalHeader title="Commands" />

      <ModalFilterInput
        onInput={(v) => nav.setFilter(v)}
        placeholder="Type to filter..."
      />

      <Show
        when={grouped().length > 0}
        fallback={
          <box paddingLeft={2} paddingRight={2} paddingBottom={1}>
            <text fg={theme.textMuted}>No results found</text>
          </box>
        }
      >
        <scrollbox
          ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
          maxHeight={maxHeight}
          paddingLeft={1}
          paddingRight={1}
          paddingBottom={1}
        >
          <For each={grouped()}>
            {([category, categoryOptions], groupIndex) => (
              <>
                <box paddingTop={groupIndex() > 0 ? 1 : 0} paddingLeft={1}>
                  <text fg={theme.accent} attributes={TextAttributes.BOLD}>
                    {category}
                  </text>
                </box>

                <For each={categoryOptions}>
                  {(option) => {
                    const isSelected = () => option.value === selected()?.value;

                    return (
                      <box
                        flexDirection="row"
                        backgroundColor={
                          isSelected() ? theme.primary : undefined
                        }
                        paddingLeft={2}
                        paddingRight={2}
                        justifyContent="space-between"
                      >
                        <text
                          fg={
                            isSelected()
                              ? contrastingForeground(theme.primary)
                              : theme.text
                          }
                        >
                          {option.title}
                        </text>
                        <Show when={option.description}>
                          <text
                            style={{
                              fg: isSelected()
                                ? contrastingForeground(theme.primary)
                                : theme.textMuted,
                            }}
                          >
                            {" "}
                            {truncate(option.description!, 20)}
                          </text>
                        </Show>
                      </box>
                    );
                  }}
                </For>
              </>
            )}
          </For>
        </scrollbox>
      </Show>
    </Modal>
  );
}
