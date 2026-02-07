import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { createPresignedUploadUrl, putJsonObject } from "@/lib/r2";
import type { TransferMeta, CreateTransferRequest, CreateTransferResponse } from "@/lib/types";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resend = new Resend((process.env.RESEND_API_KEY || "").trim());

function generateId(): string {
  return crypto.randomBytes(6).toString("base64url");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTransferRequest = await request.json();

    if (!body.filename || !body.size || !body.email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(body.email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
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
      email: body.email,
      createdAt: new Date().toISOString(),
    };
    await putJsonObject(metaKey, meta);

    // Send email notification (non-blocking)
    const origin = request.headers.get("origin") || "https://actransfert.vercel.app";
    const downloadLink = `${origin}/d/${id}`;

    resend.emails.send({
      from: "ACTransfert <onboarding@resend.dev>",
      to: body.email,
      subject: "Vous avez recu un fichier via ACTransfert",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: #FF6B35; border-radius: 12px; padding: 10px; margin-bottom: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v10m0 0l-4-4m4 4l4-4"/><path d="M6 19h12"/></svg>
            </div>
            <h1 style="font-size: 20px; color: #1a1a1a; margin: 0;">AC<span style="color: #FF6B35;">Transfert</span></h1>
          </div>
          <div style="background: #f8f8fa; border-radius: 16px; padding: 24px; text-align: center;">
            <p style="color: #666; font-size: 14px; margin: 0 0 8px;">Un fichier vous a ete envoye :</p>
            <p style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 4px;">${meta.filename}</p>
            <p style="color: #999; font-size: 13px; margin: 0 0 24px;">${formatBytes(meta.size)}</p>
            <a href="${downloadLink}" style="display: inline-block; background: #FF6B35; color: white; text-decoration: none; font-weight: 600; padding: 12px 32px; border-radius: 12px; font-size: 15px;">Telecharger</a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">Ce lien expire dans 7 jours.</p>
        </div>
      `,
    }).catch((err) => {
      console.error("Failed to send email:", err);
    });

    const response: CreateTransferResponse = { id, uploadUrl };
    return NextResponse.json(response);
  } catch (err) {
    console.error("POST /api/transfer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
