import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "./index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
const WEB_DIR = path.join(__dirname, "..", "web");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendError(
  res: http.ServerResponse,
  statusCode: number,
  message: string,
): void {
  sendJson(res, statusCode, { error: message });
}

async function serveStaticFile(
  res: http.ServerResponse,
  filePath: string,
): Promise<void> {
  try {
    const fullPath = path.join(WEB_DIR, filePath);
    const normalizedPath = path.normalize(fullPath);

    if (!normalizedPath.startsWith(WEB_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const stat = await fs.promises.stat(normalizedPath);

    if (stat.isDirectory()) {
      await serveStaticFile(res, path.join(filePath, "index.html"));
      return;
    }

    const content = await fs.promises.readFile(normalizedPath);
    res.writeHead(200, { "Content-Type": getMimeType(normalizedPath) });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
}

async function handleApiResolve(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "Method not allowed");
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks).toString("utf-8");

    let parsedBody: { url?: string };
    try {
      parsedBody = JSON.parse(body);
    } catch {
      sendError(res, 400, "Invalid JSON");
      return;
    }

    const { url } = parsedBody;

    if (!url || typeof url !== "string") {
      sendError(res, 400, "Missing or invalid 'url' field");
      return;
    }

    const result = await resolve(url);
    sendJson(res, 200, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error resolving URL:", message);
    sendError(res, 500, message);
  }
}

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  console.log(`${req.method} ${pathname}`);

  if (pathname === "/api/resolve") {
    await handleApiResolve(req, res);
    return;
  }

  const filePath = pathname === "/" ? "/index.html" : pathname;
  await serveStaticFile(res, filePath);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error("Unhandled error:", error);
    res.writeHead(500);
    res.end("Internal Server Error");
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving static files from ${WEB_DIR}`);
  console.log(`🔌 API endpoint: http://localhost:${PORT}/api/resolve`);
});

export { server };
