export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/sync") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204 });
      }
      if (request.method === "POST") {
        // ここに KV 処理
        return Response.json({ ok: true, source: "worker" });
      }
      if (request.method === "GET") {
        return Response.json({ ok: true, method: "GET" });
      }
      return new Response("Method Not Allowed", { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
};
