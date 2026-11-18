// Pemantul login Google untuk aplikasi Android.
// Supabase Auth hanya boleh redirect ke domain web yang terdaftar, jadi aplikasi memakai halaman ini sebagai
// `redirect_to`, lalu halaman ini meneruskan `code` (PKCE) ke skema aplikasi `pasticuan://auth-callback`.
// Pertukaran kode -> sesi dilakukan aplikasi sendiri dengan code_verifier miliknya, jadi kode ini tidak berguna
// tanpa aplikasi yang memulai login.

const SKEMA_APP = "pasticuan://auth-callback";
const PARAM_DITERUSKAN = ["code", "error", "error_code", "error_description"] as const;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const out = new URLSearchParams();
  for (const k of PARAM_DITERUSKAN) {
    const v = url.searchParams.get(k);
    if (v) out.set(k, v.slice(0, 1000));
  }
  if (!out.has("code") && !out.has("error")) out.set("error", "auth_gagal");
  const tujuan = `${SKEMA_APP}?${out.toString()}`;
  const tujuanHtml = escapeHtml(tujuan);

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Kembali ke aplikasi Pasti Cuan</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f3ee;color:#1d2b22;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box}
  main{max-width:360px;text-align:center}
  a{display:inline-block;margin-top:16px;padding:14px 22px;border-radius:999px;background:#1d2b22;color:#fff;text-decoration:none;font-weight:600}
  p{line-height:1.5;color:#4a5a50}
</style>
</head>
<body>
<main>
  <h1 style="font-size:20px">Membuka aplikasi Pasti Cuan…</h1>
  <p>Kalau aplikasi tidak terbuka otomatis, ketuk tombol di bawah.</p>
  <a href="${tujuanHtml}">Buka aplikasi</a>
</main>
<script>location.replace(${JSON.stringify(tujuan).replace(/</g, "\\u003c")});</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
