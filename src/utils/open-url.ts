import { $ } from "bun";

// Under WSL, process.platform is "linux" but xdg-open usually can't reach a
// browser. Detect WSL so we can hand the URL to the Windows side instead.
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

// Candidate opener commands to try in order; the first that exits 0 wins.
function openers(url: string): string[][] {
  if (process.platform === "darwin") return [["open", url]];
  if (process.platform === "win32") return [["cmd", "/c", "start", "", url]];
  if (isWsl()) {
    // wslview (wslu) is the clean path; fall back to invoking Windows directly.
    return [
      ["wslview", url],
      ["cmd.exe", "/c", "start", "", url],
      ["powershell.exe", "-NoProfile", "Start-Process", url],
    ];
  }
  return [["xdg-open", url]];
}

// Open a URL in the user's default browser. Best-effort; errors are swallowed
// so the TUI is never disrupted by a failed launch.
export async function openUrl(url: string): Promise<void> {
  for (const [cmd, ...args] of openers(url)) {
    try {
      const { exitCode } = await $`${cmd} ${args}`.nothrow().quiet();
      if (exitCode === 0) return;
    } catch {
      // try the next opener
    }
  }
}
