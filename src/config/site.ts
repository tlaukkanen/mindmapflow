export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "MindMapFlow",
  description:
    "MindMapFlow - Meet MindMapFlow, your ultimate brainstorming companion. Designed to unleash creativity and enhance productivity, MindMapFlow transforms complex ideas into clear, structured visuals.",
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
  footerItems: [
    {
      label: "Privacy Policy",
      href: "/privacy",
    },
    {
      label: "Terms of Service",
      href: "/terms",
    },
  ],
  internalLinks: {
    editor: "/editor",
    privacy: "/privacy",
    terms: "/terms",
  },
  links: {
    github: "https://github.com/tlaukkanen/mindmapflow",
    twitter: "https://twitter.com/tlaukkanen",
    docs: "https://www.mindmapflow.com",
    sponsor: "https://buymeacoffee.com/tlaukkanen",
  },
};
