import { NextRequest, NextResponse } from "next/server";
import { createPresignedDownloadUrl, getJsonObject } from "@/lib/r2";
import type { TransferMeta, GetTransferResponse } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const metaKey = `transfers/${id}/meta.json`;

    const meta = await getJsonObject<TransferMeta>(metaKey);
    if (!meta) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    const fileKey = `transfers/${id}/${meta.filename}`;
    const downloadUrl = await createPresignedDownloadUrl(fileKey);

    const response: GetTransferResponse = { meta, downloadUrl };
    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/transfer/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
