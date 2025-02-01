export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "AivoMind",
  description:
    "AivoMind - Accelerate your Azure cloud architecture design process with AI-powered diagramming, security suggestions, cost estimates, and Infrastructure as Code export capabilities.",
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
    github: "https://github.com/tlaukkanen/aivomind",
    twitter: "https://twitter.com/tlaukkanen",
    docs: "https://www.aivomind.com",
    sponsor: "https://buymeacoffee.com/tlaukkanen",
  },
};
