import "@xyflow/react/dist/style.css";
import "react-loading-skeleton/dist/skeleton.css";
import "@/styles/globals.css";
import { Metadata } from "next";
import clsx from "clsx";
import { CssBaseline } from "@mui/material";
import { Toaster } from "sonner";
import { getServerSession } from "next-auth";

import SessionProvider from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon-512x512.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <SessionProvider session={session}>
      <CssBaseline>
        <html suppressHydrationWarning lang="en">
          <head />
          {/*<GoogleAnalytics gaId="G-FRF..." /> */}
          <body
            className={clsx(
              "h-[100dvh] overflow-hidden font-sans antialiased",
              fontSans.variable,
            )}
            id="root"
          >
            <ThemeProvider>
              <Toaster expand position="top-right" />
              {children}
            </ThemeProvider>
          </body>
        </html>
      </CssBaseline>
    </SessionProvider>
  );
}
