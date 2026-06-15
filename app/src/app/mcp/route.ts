import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createTokenMeshMcpServer } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type, Last-Event-ID, MCP-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonRpcError(status: number, message: string) {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message,
      },
      id: null,
    },
    { status, headers: corsHeaders }
  );
}

async function handleMcpRequest(req: Request) {
  const server = createTokenMeshMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(req);
    return withCors(response);
  } catch (err) {
    console.error("MCP request failed:", err);
    return jsonRpcError(500, "Internal MCP server error.");
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  return handleMcpRequest(req);
}

export async function GET() {
  return jsonRpcError(405, "Method not allowed. TokenMesh MCP is served over Streamable HTTP POST.");
}

export async function DELETE() {
  return jsonRpcError(405, "Method not allowed. Stateless TokenMesh MCP does not keep sessions.");
}
