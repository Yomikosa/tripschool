const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // /api/sync への通信（クラウド保存・パスワード照合インポート）を処理
    if (url.pathname === "/api/sync") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (!env.TRIP_KV) {
        return new Response(
          JSON.stringify({ error: "Cloudflare KV (TRIP_KV) が紐付いていません。wrangler.toml の id 設定を確認してください。" }),
          { status: 500, headers: corsHeaders }
        );
      }

      // POST: 予定データのクラウドアップロード
      if (request.method === "POST") {
        try {
          const body = await request.json();
          const roomId = String(body.roomId || "").trim().toLowerCase();
          const passHash = String(body.passHash || "").trim();
          const payload = body.payload;

          if (!roomId || !/^[a-z0-9_-]{3,32}$/.test(roomId)) {
            return new Response(
              JSON.stringify({ error: "共有IDは半角英数字・ハイフン（3〜32文字）で指定してください。" }),
              { status: 400, headers: corsHeaders }
            );
          }

          if (!passHash || !payload || typeof payload !== "object") {
            return new Response(
              JSON.stringify({ error: "パスワードまたは予定データが不足しています。" }),
              { status: 400, headers: corsHeaders }
            );
          }

          const kvKey = `trip_data:${roomId}`;
          const existingRaw = await env.TRIP_KV.get(kvKey);

          // 既に同じ共有IDが存在する場合はパスワードハッシュを照合
          if (existingRaw) {
            const existingRecord = JSON.parse(existingRaw);
            if (existingRecord.passHash !== passHash) {
              return new Response(
                JSON.stringify({ error: "この共有IDは既に使用されており、パスワードが一致しません。" }),
                { status: 403, headers: corsHeaders }
              );
            }
          }

          const recordToSave = {
            roomId,
            passHash,
            updatedAt: new Date().toISOString(),
            payload
          };

          // 180日間保存
          await env.TRIP_KV.put(kvKey, JSON.stringify(recordToSave), {
            expirationTtl: 60 * 60 * 24 * 180
          });

          return new Response(
            JSON.stringify({ ok: true, roomId, updatedAt: recordToSave.updatedAt }),
            { status: 200, headers: corsHeaders }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "サーバー保存処理中にエラーが発生しました。" }),
            { status: 500, headers: corsHeaders }
          );
        }
      }

      // GET: パスワード照合＆予定データのインポート
      if (request.method === "GET") {
        try {
          const roomId = String(url.searchParams.get("roomId") || "").trim().toLowerCase();
          const passHash = String(url.searchParams.get("passHash") || "").trim();

          if (!roomId || !passHash) {
            return new Response(
              JSON.stringify({ error: "共有IDとパスワードを入力してください。" }),
              { status: 400, headers: corsHeaders }
            );
          }

          const kvKey = `trip_data:${roomId}`;
          const existingRaw = await env.TRIP_KV.get(kvKey);

          if (!existingRaw) {
            return new Response(
              JSON.stringify({ error: "指定された共有IDのデータが見つかりません。" }),
              { status: 404, headers: corsHeaders }
            );
          }

          const record = JSON.parse(existingRaw);
          if (record.passHash !== passHash) {
            return new Response(
              JSON.stringify({ error: "パスワードが一致しません。" }),
              { status: 403, headers: corsHeaders }
            );
          }

          return new Response(
            JSON.stringify({
              ok: true,
              roomId: record.roomId,
              updatedAt: record.updatedAt,
              payload: record.payload
            }),
            { status: 200, headers: corsHeaders }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "データの取得中にエラーが発生しました。" }),
            { status: 500, headers: corsHeaders }
          );
        }
      }
    }

    // /api/sync 以外のアクセスは静的ファイル（index.html等）を返す
    return env.ASSETS.fetch(request);
  }
};
