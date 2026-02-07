"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import type { GetTransferResponse } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PageState = "loading" | "ready" | "not-found" | "error";

export default function DownloadPage() {
  const params = useParams();
  const id = params.id as string;
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<GetTransferResponse | null>(null);

  useEffect(() => {
    async function fetchTransfer() {
      try {
        const res = await fetch(`/api/transfer/${id}`);
        if (res.status === 404) {
          setState("not-found");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }
        const json: GetTransferResponse = await res.json();
        setData(json);
        setState("ready");
      } catch {
        setState("error");
      }
    }
    fetchTransfer();
  }, [id]);

  const handleDownload = () => {
    if (data?.downloadUrl) {
      window.location.href = data.downloadUrl;
    }
  };

  return (
    <main className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      <div className="mb-16">
        <Logo />
      </div>

      {state === "loading" && (
        <div className="card p-8 w-full max-w-md animate-slide-up flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-sm text-muted">Chargement du transfert...</p>
        </div>
      )}

      {state === "not-found" && (
        <div className="card p-8 w-full max-w-md animate-slide-up text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold mb-2 text-foreground">
            Transfert introuvable
          </h2>
          <p className="text-sm text-muted">
            Ce transfert a peut-etre expire ou n&apos;existe pas.
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="card p-8 w-full max-w-md animate-slide-up text-center">
          <h2 className="font-display text-2xl font-bold mb-2 text-foreground">
            Erreur
          </h2>
          <p className="text-sm text-muted">
            Impossible de charger ce transfert. Reessayez plus tard.
          </p>
        </div>
      )}

      {state === "ready" && data && (
        <div className="card p-8 w-full max-w-md animate-slide-up text-center">
          {/* Download icon */}
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>

          <h2 className="font-display text-2xl font-bold mb-1 text-foreground">
            {data.meta.filename}
          </h2>
          <p className="text-sm text-muted mb-5">
            {formatBytes(data.meta.size)}
          </p>

          {/* Sender info */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center">
              <span className="text-accent text-xs font-semibold">
                {data.meta.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-muted">
              Envoye par <span className="text-foreground font-medium">{data.meta.username}</span>
            </span>
          </div>

          <p className="text-xs text-muted mb-6">
            {formatDate(data.meta.createdAt)}
          </p>

          <button onClick={handleDownload} className="btn-primary w-full">
            Telecharger
          </button>
        </div>
      )}
    </main>
  );
}
