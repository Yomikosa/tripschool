export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // /api/sync へのリクエストをキャッチ
    if (url.pathname.startsWith("/api/sync")) {
      
      // CORS（クロスドメイン）プリフライト対応
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // 【POST】クラウドへアップロード (KVへ保存)
      if (request.method === "POST") {
        try {
          const body = await request.json();
          const roomId = body.roomId;
          
          // roomIdをキーにしてKV空間にJSONデータを保存
          await env.TRIP_KV.put(`room_${roomId}`, JSON.stringify(body));

          return Response.json({ ok: true, message: "Saved to KV" }, { headers: corsHeaders });
        } catch (err) {
          return Response.json({ error: "Bad Request" }, { status: 400, headers: corsHeaders });
        }
      }

      // 【GET】クラウドからインポート (KVから取得)
      if (request.method === "GET") {
        const roomId = url.searchParams.get("roomId");
        const passHash = url.searchParams.get("passHash");

        if (!roomId) {
          return Response.json({ error: "共有IDが指定されていません" }, { status: 400, headers: corsHeaders });
        }

        // KVからデータを取得
        const dataStr = await env.TRIP_KV.get(`room_${roomId}`);
        if (!dataStr) {
          return Response.json({ error: "指定されたIDのデータが存在しません" }, { status: 404, headers: corsHeaders });
        }

        const data = JSON.parse(dataStr);
        // パスワード（ハッシュ値）の照合
        if (data.passHash !== passHash) {
          return Response.json({ error: "パスワードが一致しません" }, { status: 403, headers: corsHeaders });
        }

        return Response.json({ ok: true, payload: data.payload }, { headers: corsHeaders });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    // 万が一、該当しないAPIエンドポイントが叩かれた場合
    return new Response("Not Found", { status: 404 });
  },
};
