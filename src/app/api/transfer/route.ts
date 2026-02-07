import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createPresignedUploadUrl, putJsonObject } from "@/lib/r2";
import type { TransferMeta, CreateTransferRequest, CreateTransferResponse } from "@/lib/types";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

function generateId(): string {
  return crypto.randomBytes(6).toString("base64url");
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTransferRequest = await request.json();

    if (!body.filename || !body.size || !body.username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (body.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 2 GB)" }, { status: 413 });
    }

    const id = generateId();
    const fileKey = `transfers/${id}/${body.filename}`;
    const metaKey = `transfers/${id}/meta.json`;

    const uploadUrl = await createPresignedUploadUrl(
      fileKey,
      body.contentType || "application/octet-stream",
      body.size
    );

    const meta: TransferMeta = {
      id,
      filename: body.filename,
      size: body.size,
      contentType: body.contentType || "application/octet-stream",
      username: body.username,
      createdAt: new Date().toISOString(),
    };
    await putJsonObject(metaKey, meta);

    const response: CreateTransferResponse = { id, uploadUrl };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/transfer error:", message);
    return NextResponse.json({ error: "Internal server error", debug: message }, { status: 500 });
  }
}
