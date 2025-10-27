import { title, subtitle } from "@/components/primitives";

const featureComparison = [
  {
    feature: "Cloud sync & storage",
    description:
      "Every diagram auto-saves to secure cloud storage so you can pick up from any device.",
    free: "Up to 5 mindmaps",
    pro: "Unlimited mindmaps & extended retention",
  },
  {
    feature: "Canvas productivity",
    description:
      "Copy, paste, delete, add note nodes, and switch layouts without breaking your flow.",
    free: "Included",
    pro: "Included",
  },
  {
    feature: "Visual formatting",
    description:
      "Bold, italic, underline, strike, alignment, and quick theming keep boards presentation ready.",
    free: "Rich text styling, tags, and quick theming",
    pro: "Rich text styling, tags, and quick theming",
  },
  {
    feature: "Sharing & exporting",
    description:
      "Share read-only links, manage invites, or export polished PNG snapshots in seconds.",
    free: "Export mindmaps as crisp images",
    pro: "Create and manage cloud share links",
  },
  {
    feature: "AI suggestions",
    description:
      "Let MindMapFlow surface follow-up ideas that expand branches with one click.",
    free: "Manual expansion",
    pro: "Context-aware AI subnode suggestions",
  },
];

const keyboardHighlights = [
  "Slash (/) opens the global search palette and highlights matching nodes as you type.",
  "Ctrl/Cmd + C and Ctrl/Cmd + V duplicate selections instantly.",
  "N drops a fresh note node without reaching for the toolbar.",
  "Arrow keys move between nodes when you want precise navigation.",
  "Ctrl/Cmd + S captures a manual save on top of auto-save.",
  "Escape clears dialogs and menus the moment you need space.",
];

const builderHighlights = [
  "Auto layout modes (horizontal, vertical, radial) keep complex trees readable in one click.",
  "Format toolbar adds typography controls, handy hyperlinks, and project tags in context.",
  "Theme Selector swaps curated palettes and typography presets without leaving the canvas.",
  "Toolbar quick actions handle load, save, copy, paste, delete, and note insertion instantly.",
];

const cloudHighlights = [
  "Auto-save watches every edit and writes it to cloud storage with version safety checks.",
  "Unsaved change warnings protect your work before navigating away or closing a tab.",
  "Shareable links put stakeholders one click away from the latest mindmap snapshot.",
];

export default function FeaturesPage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16">
      <header className="flex flex-col items-start gap-4">
        <p className={title({ size: "lg", class: "text-left" })}>
          Features built for flow
        </p>
        <p className={subtitle()}>
          MindMapFlow helps you capture ideas, arrange them in seconds, and keep
          your boards polished from the first sketch to the final export.
        </p>
      </header>

      <div className="space-y-6">
        <p className={title({ size: "sm", class: "text-left" })}>
          Free vs Pro plans
        </p>
        <p className="text-body max-w-2xl">
          Start with the Free plan to explore lightning-fast diagramming.
          Upgrade to Pro for unlimited cloud storage, AI-powered ideation, and
          richer collaboration controls when your mindmaps grow with your team.
        </p>
        <div className="overflow-hidden rounded-lg border border-panels-border bg-white shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-panels-border text-left text-xs sm:text-sm">
              <thead className="bg-stone-200">
                <tr className="text-body uppercase tracking-wide">
                  <th className="px-4 py-3 sm:px-6">Feature</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-6">
                    What it unlocks
                  </th>
                  <th className="px-4 py-3 sm:px-6">Free</th>
                  <th className="px-4 py-3 sm:px-6">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panels-border text-body">
                {featureComparison.map((row) => (
                  <tr key={row.feature} className="align-top">
                    <td className="px-4 py-4 font-semibold text-heading sm:px-6">
                      {row.feature}
                    </td>
                    <td className="hidden px-4 py-4 text-body opacity-90 sm:table-cell sm:px-6">
                      {row.description}
                    </td>
                    <td className="px-4 py-4 text-body opacity-90 sm:px-6">
                      {row.free}
                    </td>
                    <td className="px-4 py-4 font-semibold text-heading sm:px-6">
                      {row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-panels-border bg-white p-6 shadow-md">
          <p className={title({ size: "sm", class: "text-left" })}>
            Build beautiful maps faster
          </p>
          <ul className="space-y-3 text-body">
            {builderHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-4 rounded-lg border border-panels-border bg-white p-6 shadow-md">
          <p className={title({ size: "sm", class: "text-left" })}>
            Keyboard-first for power users
          </p>
          <ul className="space-y-3 text-body">
            {keyboardHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-panels-border bg-white p-6 shadow-md">
        <p className={title({ size: "sm", class: "text-left" })}>
          Cloud-first peace of mind
        </p>
        <ul className="space-y-3 text-body">
          {cloudHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-body opacity-80">
          Whether you are planning a product roadmap or sketching creative
          concepts, every change is captured, synced, and ready to present.
        </p>
      </div>

      <footer className="flex flex-col items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-6 text-body">
        <p className={title({ size: "sm", class: "text-left" })}>
          Ready to start mapping?
        </p>
        <p className="max-w-2xl">
          Join the invite-only beta to secure your spot. Explore MindMapFlow
          Free today and unlock Pro when you need limitless canvases and AI
          firepower.
        </p>
      </footer>
    </section>
  );
}
