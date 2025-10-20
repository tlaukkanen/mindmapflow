import type { Metadata } from "next";

import { headers } from "next/headers";

import { SharedViewer } from "@/components/editor/shared-viewer";
import { siteConfig } from "@/config/site";
import { logger } from "@/services/logger";

type SharedPageParams = {
  id?: string | string[];
};

interface SharedPageProps {
  params?: Promise<SharedPageParams>;
}

export default async function SharedPage({ params }: SharedPageProps) {
  const resolvedParams = params ? await params : undefined;
  const rawId = resolvedParams?.id;
  const normalizedId = Array.isArray(rawId) ? rawId[0] : rawId;
  const shareId = normalizedId ?? "";

  return <SharedViewer shareId={shareId} />;
}

export const dynamic = "force-dynamic";

type SharedGenerateMetadataProps = {
  params?: Promise<SharedPageParams>;
};

function resolveShareId(rawId: SharedPageParams["id"]): string {
  if (!rawId) {
    return "";
  }

  return Array.isArray(rawId) ? (rawId[0] ?? "") : rawId;
}

async function resolveOrigin(): Promise<string> {
  const headerList = await headers();
  const forwardedProto = headerList.get("x-forwarded-proto");
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost ?? headerList.get("host");
  const protocol =
    forwardedProto ?? (host?.startsWith("localhost") ? "http" : "https");
  const fallbackOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mindmapflow.com";

  return host ? `${protocol}://${host}` : fallbackOrigin;
}

export async function generateMetadata({
  params,
}: SharedGenerateMetadataProps): Promise<Metadata> {
  const resolvedParams = params ? await params : undefined;
  const shareId = resolveShareId(resolvedParams?.id);
  const origin = await resolveOrigin();
  const metadataBase = new URL(origin);
  const defaultDescription =
    "Explore a shared mind map created with MindMapFlow.";

  if (!shareId) {
    return {
      metadataBase,
      title: `${siteConfig.name} – Shared Mindmap`,
      description: defaultDescription,
      openGraph: {
        title: `${siteConfig.name} – Shared Mindmap`,
        description: defaultDescription,
        url: `${origin}/shared`,
        siteName: siteConfig.name,
        images: [
          {
            url: `${origin}/favicon-512x512.png`,
            alt: siteConfig.name,
          },
        ],
      },
    };
  }

  try {
    const shareResponse = await fetch(`${origin}/api/shares/${shareId}`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (shareResponse.status === 404) {
      return {
        metadataBase,
        title: `Shared Mindmap Not Found – ${siteConfig.name}`,
        description: "This shared mind map link is invalid or has expired.",
        openGraph: {
          title: `Shared Mindmap Not Found – ${siteConfig.name}`,
          description: "This shared mind map link is invalid or has expired.",
          url: `${origin}/shared/${shareId}`,
          siteName: siteConfig.name,
          images: [
            {
              url: `${origin}/favicon-512x512.png`,
              alt: siteConfig.name,
            },
          ],
        },
      };
    }

    if (!shareResponse.ok) {
      throw new Error(
        `Failed to resolve share metadata: ${shareResponse.status}`,
      );
    }

    const payload = (await shareResponse.json()) as {
      title?: string;
      share?: { id: string; ownerEmail: string; createdAt: string };
      thumbnailPath?: string | null;
      nodes?: unknown;
      edges?: unknown;
      paletteId?: string | null;
    };

    const title =
      typeof payload.title === "string" && payload.title.trim().length > 0
        ? payload.title.trim()
        : payload.share?.id
          ? `Mind map ${payload.share.id}`
          : `Mind map ${shareId}`;
    const description = `View the shared mind map "${title}" from ${siteConfig.name}.`;
    const imageUrl = payload.thumbnailPath
      ? `${origin}${payload.thumbnailPath}`
      : `${origin}/favicon-512x512.png`;

    return {
      metadataBase,
      title: `${title} – ${siteConfig.name}`,
      description,
      openGraph: {
        title,
        description,
        url: `${origin}/shared/${shareId}`,
        siteName: siteConfig.name,
        images: [
          {
            url: imageUrl,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    logger.error("Failed to generate metadata for shared mindmap", error);

    return {
      metadataBase,
      title: `${siteConfig.name} – Shared Mindmap`,
      description: defaultDescription,
      openGraph: {
        title: `${siteConfig.name} – Shared Mindmap`,
        description: defaultDescription,
        url: `${origin}/shared/${shareId}`,
        siteName: siteConfig.name,
        images: [
          {
            url: `${origin}/favicon-512x512.png`,
            alt: siteConfig.name,
          },
        ],
      },
    };
  }
}
