import { SharedViewer } from "@/components/editor/shared-viewer";

interface SharedPageProps {
  params: {
    id: string;
  };
}

export default function SharedPage({ params }: SharedPageProps) {
  return <SharedViewer shareId={params.id} />;
}
