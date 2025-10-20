import type { Metadata } from "next";

import { headers } from "next/headers";

import { SharedViewer } from "@/components/editor/shared-viewer";
import { siteConfig } from "@/config/site";
import { storageService } from "@/lib/storage";
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
    const mapping = await storageService.getShareMapping(shareId);

    if (!mapping) {
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

    const title =
      mapping.title && mapping.title.length > 0
        ? mapping.title
        : `Mind map ${mapping.mindMapId}`;
    const description = `View the shared mind map "${title}" from ${siteConfig.name}.`;
    const imageUrl = mapping.thumbnailBlobName
      ? `${origin}/api/shares/${mapping.id}/thumbnail`
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
