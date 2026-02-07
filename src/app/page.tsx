"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent, type FormEvent } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type Step = "username" | "upload" | "done";

function sanitizeUsername(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}_${h}${min}`;
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

// Recursively read all files from a directory entry
async function readDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];

  function readEntries(dirEntry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
    return new Promise((resolve) => {
      const reader = dirEntry.createReader();
      const allEntries: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((entries) => {
          if (entries.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...entries);
            readBatch();
          }
        });
      };
      readBatch();
    });
  }

  function fileFromEntry(fileEntry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve) => {
      fileEntry.file((f) => resolve(f));
    });
  }

  async function traverse(entry: FileSystemEntry, path: string) {
    if (entry.isFile) {
      const file = await fileFromEntry(entry as FileSystemFileEntry);
      Object.defineProperty(file, "relativePath", { value: path + file.name });
      files.push(file);
    } else if (entry.isDirectory) {
      const entries = await readEntries(entry as FileSystemDirectoryEntry);
      for (const e of entries) {
        await traverse(e, path + entry.name + "/");
      }
    }
  }

  const entries = await readEntries(entry);
  for (const e of entries) {
    await traverse(e, entry.name + "/");
  }

  return files;
}

// ─── Logo Component ───
function Logo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v10m0 0l-4-4m4 4l4-4" />
          <path d="M6 19h12" />
        </svg>
      </div>
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          AC<span className="text-accent">Transfert</span>
        </h1>
        <p className="text-[11px] text-muted tracking-widest uppercase">
          Drop &middot; Name &middot; Done
        </p>
      </div>
    </div>
  );
}

// ─── Step 1: Username ───
function UsernameStep({
  username,
  setUsername,
  onContinue,
}: {
  username: string;
  setUsername: (v: string) => void;
  onContinue: () => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim()) onContinue();
  };

  return (
    <div className="card p-8 w-full max-w-md animate-slide-up">
      <h2 className="font-display text-2xl font-bold mb-2 text-foreground">
        Qui envoie ?
      </h2>
      <p className="text-muted text-sm mb-6">
        Entrez votre nom pour identifier le transfert.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={username}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          placeholder="Votre nom ou pseudo"
          className="input-field"
          autoFocus
        />
        <button
          type="submit"
          disabled={!username.trim()}
          className="btn-primary w-full"
        >
          Continuer
        </button>
      </form>
    </div>
  );
}

// ─── Step 2: Upload ───
function UploadStep({
  username,
  onEdit,
  onDone,
}: {
  username: string;
  onEdit: () => void;
  onDone: (filename: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: File[], forceZip = false) => {
      if (files.length === 0) return;
      setIsProcessing(true);

      try {
        const safe = sanitizeUsername(username);
        const ts = formatDate();

        if (files.length === 1 && !forceZip) {
          const ext = getFileExtension(files[0].name);
          const outName = `${safe}_${ts}${ext ? `.${ext}` : ""}`;
          saveAs(files[0], outName);
          onDone(outName);
        } else {
          const zip = new JSZip();
          for (const file of files) {
            const path =
              (file as File & { relativePath?: string }).relativePath || file.name;
            zip.file(path, file);
          }
          const blob = await zip.generateAsync({ type: "blob" });
          const outName = `${safe}_${ts}.zip`;
          saveAs(blob, outName);
          onDone(outName);
        }
      } catch {
        setIsProcessing(false);
      }
    },
    [username, onDone]
  );

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const items = e.dataTransfer.items;
      if (!items) return;

      const allFiles: File[] = [];
      let hasDirectory = false;

      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          entries.push(entry);
          if (entry.isDirectory) hasDirectory = true;
        }
      }

      if (hasDirectory) {
        for (const entry of entries) {
          if (entry.isDirectory) {
            const dirFiles = await readDirectoryEntries(
              entry as FileSystemDirectoryEntry
            );
            allFiles.push(...dirFiles);
          } else if (entry.isFile) {
            const file = await new Promise<File>((resolve) => {
              (entry as FileSystemFileEntry).file(resolve);
            });
            allFiles.push(file);
          }
        }
        await processFiles(allFiles, true);
      } else {
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
      }
    },
    [processFiles]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const handleFolderSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f) => {
      if (f.webkitRelativePath) {
        Object.defineProperty(f, "relativePath", {
          value: f.webkitRelativePath,
        });
      }
      return f;
    });
    await processFiles(mapped, true);
  };

  return (
    <div className="card p-8 w-full max-w-lg animate-slide-up">
      {/* Username badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
            <span className="text-accent text-sm font-semibold">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-foreground">{username}</span>
        </div>
        <button onClick={onEdit} className="text-xs text-muted hover:text-accent transition-colors">
          modifier
        </button>
      </div>

      {isProcessing ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in">
          <div className="spinner" />
          <p className="text-sm text-muted">Preparation du transfert...</p>
        </div>
      ) : (
        <>
          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`dropzone flex flex-col items-center justify-center py-16 px-8 cursor-pointer mb-5 ${
              isDragging ? "dropzone-active" : ""
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-foreground font-medium mb-1">
              Glissez vos fichiers ici
            </p>
            <p className="text-xs text-muted">
              Fichiers ou dossiers
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              className="btn-secondary flex-1 text-center"
              onClick={() => fileInputRef.current?.click()}
            >
              Fichiers
            </button>
            <button
              className="btn-secondary flex-1 text-center"
              onClick={() => folderInputRef.current?.click()}
            >
              Dossier
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is not in the types
            webkitdirectory="true"
            className="hidden"
            onChange={handleFolderSelect}
          />
        </>
      )}
    </div>
  );
}

// ─── Step 3: Done ───
function DoneStep({
  filename,
  onReset,
}: {
  filename: string;
  onReset: () => void;
}) {
  return (
    <div className="card p-8 w-full max-w-md animate-slide-up text-center">
      <div className="flex justify-center mb-6">
        <div className="checkmark-circle">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path
              className="checkmark-path"
              d="M10 18l6 6 10-12"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <h2 className="font-display text-2xl font-bold mb-2 text-foreground">
        Transfert termine
      </h2>
      <p className="text-sm text-muted mb-1">Votre fichier a ete telecharge :</p>
      <p className="text-sm text-accent font-medium mb-8 break-all">
        {filename}
      </p>
      <button onClick={onReset} className="btn-primary w-full">
        Nouveau transfert
      </button>
    </div>
  );
}

// ─── Main Page ───
export default function Home() {
  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [downloadedFile, setDownloadedFile] = useState("");

  const handleContinue = () => setStep("upload");
  const handleEditUsername = () => setStep("username");
  const handleDone = (filename: string) => {
    setDownloadedFile(filename);
    setStep("done");
  };
  const handleReset = () => {
    setUsername("");
    setDownloadedFile("");
    setStep("username");
  };

  return (
    <main className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Logo */}
      <div className="mb-16">
        <Logo />
      </div>

      {/* Steps */}
      {step === "username" && (
        <UsernameStep
          username={username}
          setUsername={setUsername}
          onContinue={handleContinue}
        />
      )}
      {step === "upload" && (
        <UploadStep
          username={username}
          onEdit={handleEditUsername}
          onDone={handleDone}
        />
      )}
      {step === "done" && (
        <DoneStep filename={downloadedFile} onReset={handleReset} />
      )}
    </main>
  );
}
