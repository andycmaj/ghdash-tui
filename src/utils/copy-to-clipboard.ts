import { $ } from "bun";

// Under WSL, process.platform is "linux" but the Linux clipboard tools have no
// display to talk to; hand the text to the Windows clipboard instead.
function isWsl(): boolean {
  if (process.platform !== "linux") return false;
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true;
  try {
    return require("node:fs")
      .readFileSync("/proc/version", "utf8")
      .toLowerCase()
      .includes("microsoft");
  } catch {
    return false;
  }
}

// Candidate clipboard commands to try in order; each reads the text from stdin.
// The first that exits 0 wins.
function copiers(): string[][] {
  if (process.platform === "darwin") return [["pbcopy"]];
  if (process.platform === "win32") return [["clip"]];
  if (isWsl()) return [["clip.exe"]];
  // Wayland first, then the two common X11 tools.
  return [
    ["wl-copy"],
    ["xclip", "-selection", "clipboard"],
    ["xsel", "--clipboard", "--input"],
  ];
}

// Copy text to the system clipboard. Best-effort; returns true if a copier
// succeeded, false if none is available, so callers can toast accordingly.
export async function copyToClipboard(text: string): Promise<boolean> {
  const input = new Blob([text]);
  for (const [cmd, ...args] of copiers()) {
    try {
      const { exitCode } = await $`${cmd} ${args} < ${input}`.nothrow().quiet();
      if (exitCode === 0) return true;
    } catch {
      // try the next copier
    }
  }
  return false;
}
