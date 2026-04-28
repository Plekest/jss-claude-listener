import { put, list, get } from "@vercel/blob";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { RunRecord } from "./types";

const RUNS_PREFIX = "runs/";
const LOCAL_DATA_DIR = path.join(process.cwd(), "data", "runs");

function useLocalFs(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required in production. Provision Vercel Blob in Storage tab and redeploy.",
    );
  }
  return true;
}

function safeFilename(id: string): string {
  return id.replace(/[:.]/g, "-") + ".json";
}

async function readBlobJson(pathname: string): Promise<RunRecord | null> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  try {
    return (await new Response(result.stream).json()) as RunRecord;
  } catch {
    return null;
  }
}

export async function saveRun(
  record: RunRecord,
): Promise<{ url: string; pathname: string }> {
  if (useLocalFs()) {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
    const filename = safeFilename(record.id);
    const fullPath = path.join(LOCAL_DATA_DIR, filename);
    await fs.writeFile(fullPath, JSON.stringify(record));
    return { url: `file://${fullPath}`, pathname: `${RUNS_PREFIX}${filename}` };
  }

  const pathname = `${RUNS_PREFIX}${record.id}.json`;
  const result = await put(pathname, JSON.stringify(record), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return { url: result.url, pathname: result.pathname };
}

export async function listRuns(): Promise<RunRecord[]> {
  if (useLocalFs()) {
    let files: string[];
    try {
      files = await fs.readdir(LOCAL_DATA_DIR);
    } catch {
      return [];
    }
    const records = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            const content = await fs.readFile(path.join(LOCAL_DATA_DIR, f), "utf-8");
            return JSON.parse(content) as RunRecord;
          } catch {
            return null;
          }
        }),
    );
    return records
      .filter((r): r is RunRecord => r !== null)
      .sort((a, b) => (a.runAt < b.runAt ? 1 : -1));
  }

  const { blobs } = await list({ prefix: RUNS_PREFIX });
  const records = await Promise.all(blobs.map((b) => readBlobJson(b.pathname)));
  return records
    .filter((r): r is RunRecord => r !== null)
    .sort((a, b) => (a.runAt < b.runAt ? 1 : -1));
}

export async function getRun(id: string): Promise<RunRecord | null> {
  if (useLocalFs()) {
    try {
      const content = await fs.readFile(
        path.join(LOCAL_DATA_DIR, safeFilename(id)),
        "utf-8",
      );
      return JSON.parse(content) as RunRecord;
    } catch {
      return null;
    }
  }

  return readBlobJson(`${RUNS_PREFIX}${id}.json`);
}
