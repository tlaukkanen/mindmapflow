export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "MindMapFlow",
  description:
    "MindMapFlow - Accelerate your Azure cloud architecture design process with AI-powered diagramming, security suggestions, cost estimates, and Infrastructure as Code export capabilities.",
  navItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Features",
      href: "/features",
    },
    {
      label: "Pricing",
      href: "/pricing",
    },
  ],
  navMenuItems: [
    {
      label: "Editor",
      href: "/editor",
    },
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Features",
      href: "/features",
    },
    {
      label: "Pricing",
      href: "/pricing",
    },
  ],
  internalLinks: {
    editor: "/editor",
  },
  links: {
    github: "https://github.com/tlaukkanen/mindmapflow",
    twitter: "https://twitter.com/tlaukkanen",
    docs: "https://www.mindmapflow.com",
    sponsor: "https://buymeacoffee.com/tlaukkanen",
  },
};
