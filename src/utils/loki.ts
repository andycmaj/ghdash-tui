// Builds a Grafana Explore deep-link into the Loki logs for a PR's preview
// environment. Each PR is deployed into a `dev-<number>` Kubernetes namespace,
// so the link pre-fills a LogQL selector for that namespace over the last hour.

const LOKI_EXPLORE_BASE = "https://logs.dev.valstro.engineering/explore";

export function lokiLogsUrl(prNumber: number): string {
  // Mirrors the pane shape Grafana Explore encodes into the URL; `mia` is the
  // (arbitrary) pane id Grafana assigns to a single Explore pane.
  const panes = {
    mia: {
      datasource: "Loki",
      queries: [
        {
          refId: "A",
          expr: `{namespace="dev-${prNumber}"}`,
          queryType: "range",
          datasource: { type: "loki", uid: "Loki" },
          editorMode: "builder",
          direction: "backward",
        },
      ],
      range: { from: "now-1h", to: "now" },
    },
  };

  const params = new URLSearchParams({
    schemaVersion: "1",
    panes: JSON.stringify(panes),
    orgId: "1",
  });

  return `${LOKI_EXPLORE_BASE}?${params.toString()}`;
}
