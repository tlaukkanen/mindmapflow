import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { storageService } from "@/lib/storage";

async function getAuthenticatedUserEmail(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.email) {
    throw new Error("Unauthorized: No user email found");
  }

  return token.email;
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = await getAuthenticatedUserEmail(request);
    const { diagramId, nodes, edges } = await request.json();

    if (!diagramId) {
      return new NextResponse("Diagram ID is required", { status: 400 });
    }

    await storageService.saveMindMap(userEmail, diagramId, nodes, edges);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    console.error("Error saving diagram:", error);

    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = await getAuthenticatedUserEmail(request);
    const { searchParams } = new URL(request.url);
    const diagramId = searchParams.get("id");

    if (!diagramId) {
      return new NextResponse("Diagram ID is required", { status: 400 });
    }

    const diagram = await storageService.loadMindMap(userEmail, diagramId);

    if (!diagram) {
      return new NextResponse("Diagram not found", { status: 404 });
    }

    return NextResponse.json(diagram);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    console.error("Error loading diagram:", error);

    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
