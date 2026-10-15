export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // APIルートの処理
    if (url.pathname === "/api/sync") {
      // 同一オリジンなら不要な場合もありますが、ローカルデバッグ時のためにCORSヘッダーを追加
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // 【POST処理】クラウドへのアップロード（KVへの保存）
      if (request.method === "POST") {
        try {
          const body = await request.json();
          // KVバインディング "TRIP_KV" を使用して保存する例
          // await env.TRIP_KV.put(`room_${body.roomId}`, JSON.stringify(body));

          return Response.json({ ok: true, source: "worker" }, { headers: corsHeaders });
        } catch (e) {
          return Response.json({ error: "Bad Request" }, { status: 400, headers: corsHeaders });
        }
      }

      // 【GET処理】クラウドからのインポート（KVからの取得）
      if (request.method === "GET") {
        const roomId = url.searchParams.get("roomId");
        // const data = await env.TRIP_KV.get(`room_${roomId}`, "json");
        // if (!data) return Response.json({ error: "Not Found" }, { status: 404, headers: corsHeaders });

        return Response.json({ ok: true, method: "GET", roomId }, { headers: corsHeaders });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    // --- /api/sync 以外のすべてのリクエストは静的ファイルとして配信 ---
    return env.ASSETS.fetch(request);
  },
};
