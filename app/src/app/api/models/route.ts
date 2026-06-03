import { getSession } from "@/lib/auth";
import { getModelRegistrySnapshot } from "@/lib/model-registry";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const snapshot = await getModelRegistrySnapshot();
  return new Response(JSON.stringify(snapshot), {
    headers: { "Content-Type": "application/json" },
  });
}
