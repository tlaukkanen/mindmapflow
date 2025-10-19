import { SharedViewer } from "@/components/editor/shared-viewer";

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
