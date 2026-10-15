// functions/api/sync.js (Cloudflare Pages Functions + KV)
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const key = (url.searchParams.get("key") || "").trim();
  if (!key) return Response.json({ ok: false, error: "合言葉が指定されていません" }, { status: 400 });

  const raw = await context.env.TRIP_KV.get(`share:${key}`);
  if (!raw) return Response.json({ ok: false, error: "指定された合言葉のデータが見つかりません" }, { status: 404 });

  const record = JSON.parse(raw);
  return Response.json({ ok: true, updatedAt: record.updatedAt, payload: record.payload });
}

export async function onRequestPost(context) {
  const body = await context.request.json();
  const key = String(body.key || "").trim();
  const pin = String(body.pin || "0000").trim();
  const payload = body.payload;

  if (key.length < 3 || key.length > 30 || !payload) {
    return Response.json({ ok: false, error: "合言葉またはデータが不正です" }, { status: 400 });
  }

  const kvKey = `share:${key}`;
  const existingRaw = await context.env.TRIP_KV.get(kvKey);
  const pinHash = await sha256(pin);

  if (existingRaw) {
    const existing = JSON.parse(existingRaw);
    if (existing.pinHash !== pinHash) {
      return Response.json({ ok: false, error: "上書き用PINコードが一致しません" }, { status: 403 });
    }
  }

  const record = { pinHash, updatedAt: new Date().toISOString(), payload };
  // 60日間保持
  await context.env.TRIP_KV.put(kvKey, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 60 });
  return Response.json({ ok: true });
}