"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

export default function EditorRootPage() {
  const router = useRouter();

  useEffect(() => {
    const newMindMapId = nanoid(10);

    router.replace(`/editor/${newMindMapId}`);
  }, [router]);

  return null;
}
