import { NextRequest } from "next/server";
import { PDFParse } from "pdf-parse";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
]);

function isTextFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return (
    TEXT_MIME_TYPES.has(file.type) ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".xml")
  );
}

function trimExtractedText(text: string) {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "File size cannot exceed 8MB" }, { status: 400 });
  }

  try {
    let content = "";
    const lowerName = file.name.toLowerCase();

    if (isTextFile(file)) {
      content = trimExtractedText(await file.text());
    } else if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
      const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
      try {
        const result = await parser.getText();
        content = trimExtractedText(result.text);
      } finally {
        await parser.destroy();
      }
    } else {
      return Response.json({ error: "Unsupported file format" }, { status: 400 });
    }

    if (!content) {
      return Response.json({ error: "No usable text could be extracted from this file" }, { status: 400 });
    }

    return Response.json({
      attachment: {
        kind: "text",
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        content,
      },
    });
  } catch (err) {
    console.error("File extract error:", err);
    return Response.json({ error: "File parsing failed. Try another file." }, { status: 500 });
  }
}
