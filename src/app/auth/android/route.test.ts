import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /auth/android", () => {
  it("meneruskan kode PKCE ke pasticuan://auth-callback secara aman", async () => {
    const req = new Request("https://pasti-cuan-app.vercel.app/auth/android?code=abc123");
    const res = GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const html = await res.text();
    expect(html).toContain("pasticuan://auth-callback?code=abc123");
  });

  it("menolak query kosong dan memberi error=auth_gagal serta escape karakter berbahaya", async () => {
    const req = new Request("https://pasti-cuan-app.vercel.app/auth/android?error=access_denied&error_description=%3Cscript%3E");
    const res = GET(req);
    const html = await res.text();
    expect(html).toContain("pasticuan://auth-callback?error=access_denied");
    expect(html).not.toContain("<script>location.replace(\"pasticuan://auth-callback?error=access_denied&error_description=<script>");

    const emptyRes = GET(new Request("https://pasti-cuan-app.vercel.app/auth/android"));
    const emptyHtml = await emptyRes.text();
    expect(emptyHtml).toContain("pasticuan://auth-callback?error=auth_gagal");
  });
});
