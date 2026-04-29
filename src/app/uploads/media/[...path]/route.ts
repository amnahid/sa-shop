import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const mediaRoots = [
  path.join(process.cwd(), "uploads", "media"),
  path.join(process.cwd(), "public", "uploads", "media"),
];

const contentTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

function isSafeSegment(segment: string) {
  return /^[a-zA-Z0-9._-]+$/.test(segment);
}

function getContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return contentTypeByExtension[extension] || "application/octet-stream";
}

async function findMediaFile(relativePath: string) {
  for (const root of mediaRoots) {
    const absolutePath = path.join(root, relativePath);
    if (!absolutePath.startsWith(root)) continue;

    try {
      const fileStats = await stat(absolutePath);
      if (!fileStats.isFile()) continue;
      return absolutePath;
    } catch {
      continue;
    }
  }

  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  const segments = params.path || [];

  if (segments.length === 0 || segments.some((segment) => !isSafeSegment(segment))) {
    return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
  }

  const relativePath = segments.join(path.sep);
  const matchedFile = await findMediaFile(relativePath);
  if (!matchedFile) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const bytes = await readFile(matchedFile);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": getContentType(matchedFile),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

