import { createClient } from "npm:@supabase/supabase-js@2";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const PUBLIC_SOLANA_RPC = "https://api.mainnet-beta.solana.com";

const DEFI_PROGRAM_IDS = new Set([
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", // Meteora DLMM
  "zapvX9M3uf5pvy4wRPAbQgdQsM1xmuiFnkfHKPvwMiz", // Meteora Zap
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter v6
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB", // Jupiter v4
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CLMM
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C", // Raydium CPMM
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca Whirlpool
]);

const KNOWN_SYMBOLS: Record<string, string> = {
  [SOL_MINT]: "SOL",
  [USDC_MINT]: "USDC",
  [USDT_MINT]: "USDT",
  "DoGEV7LASBkQbibMc5k5vKnTZoMg423GpJ5QtJEGfm7R": "DOGE",
};

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function fetchJsonWithRetry(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 120)}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function rpcCall(
  primaryUrl: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const payload = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  };
  try {
    const res = (await fetchJsonWithRetry(primaryUrl, payload)) as {
      result?: unknown;
      error?: { message?: string };
    };
    if (res.error) throw new Error(res.error.message ?? "RPC error");
    return res.result;
  } catch (primaryErr) {
    if (primaryUrl === PUBLIC_SOLANA_RPC) throw primaryErr;
    const res = (await fetchJsonWithRetry(PUBLIC_SOLANA_RPC, payload)) as {
      result?: unknown;
      error?: { message?: string };
    };
    if (res.error) throw new Error(res.error.message ?? "Public RPC error");
    return res.result;
  }
}

async function fetchJupiterPrices(
  mints: string[],
): Promise<Record<string, { usdPrice?: number; liquidity?: number }>> {
  const unique = [...new Set(mints.filter(Boolean))];
  const out: Record<string, { usdPrice?: number; liquidity?: number }> = {};
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const data = (await fetchJsonWithRetry(
      `https://api.jup.ag/price/v3?ids=${chunk.join(",")}`,
    )) as Record<string, { usdPrice?: number; liquidity?: number }>;
    Object.assign(out, data);
  }
  return out;
}

function getWibDateAndTime(now: Date): { tanggal: string; jam: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    tanggal: `${get("year")}-${get("month")}-${get("day")}`,
    jam: `${hour}:${get("minute")}:${get("second")}`,
  };
}

function safeNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mintSymbol(mint: string): string {
  return KNOWN_SYMBOLS[mint] ?? `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}

interface TokenAccountEntry {
  pubkey?: string;
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: { uiAmount?: number | null; uiAmountString?: string };
        };
      };
    };
  };
}

interface ParsedTx {
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    fee?: number;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      owner?: string;
      uiTokenAmount?: { uiAmount?: number | null; uiAmountString?: string };
    }>;
    postTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      owner?: string;
      uiTokenAmount?: { uiAmount?: number | null; uiAmountString?: string };
    }>;
    innerInstructions?: Array<{
      instructions?: Array<{ programId?: string }>;
    }>;
  };
  transaction?: {
    message?: {
      accountKeys?: Array<{ pubkey?: string } | string>;
      instructions?: Array<{
        programId?: string;
        parsed?: {
          type?: string;
          info?: Record<string, unknown>;
        };
      }>;
    };
  };
}

function extractCounterparty(tx: ParsedTx, wallet: string, arah: "masuk" | "keluar"): string {
  const ixs = tx.transaction?.message?.instructions ?? [];
  for (const ix of ixs) {
    const info = ix.parsed?.info;
    if (!info) continue;
    const src = String(info.source ?? info.authority ?? "");
    const dst = String(info.destination ?? "");
    if (arah === "keluar" && dst && dst !== wallet) return dst;
    if (arah === "masuk" && src && src !== wallet) return src;
  }
  const keys = (tx.transaction?.message?.accountKeys ?? []).map((k) =>
    typeof k === "string" ? k : (k.pubkey ?? ""),
  );
  const other = keys.find(
    (k) => k && k !== wallet && k !== "11111111111111111111111111111111",
  );
  return other ?? "tidak_diketahui";
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const reqSecret = req.headers.get("x-cron-secret") ?? "";
  if (!constantTimeEqual(reqSecret, cronSecret)) {
    return new Response(JSON.stringify({ kode: "TIDAK_BERHAK", pesan: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const heliusKey = Deno.env.get("HELIUS_API_KEY") ?? "";
  const rpcUrl = heliusKey
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
    : PUBLIC_SOLANA_RPC;

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const url = new URL(req.url);
  const forceFlow = url.searchParams.get("force_flow") === "1";

  try {
    const { data: cfg, error: cfgErr } = await sb
      .from("pengaturan_pool")
      .select("*")
      .eq("id", 1)
      .single();
    if (cfgErr || !cfg) throw new Error(`Gagal baca pengaturan_pool: ${cfgErr?.message}`);

    const wallet: string = cfg.alamat_wallet_pool;
    const ambangLikuiditas = Number(cfg.ambang_likuiditas_token_usd ?? 10000);
    const ambangDust = Number(cfg.ambang_dust_usd ?? 1);

    // 1. Meteora open pools
    const meteoraOpen = (await fetchJsonWithRetry(
      `https://dlmm.datapi.meteora.ag/portfolio/open?user=${wallet}`,
    )) as {
      solPrice?: string | number;
      total?: { balances?: string | number; unclaimedFees?: string | number };
      pools?: Array<{ poolAddress?: string; poolStateUpdatedAtBlockTime?: number }>;
    };

    const openPools = meteoraOpen.pools ?? [];
    const posisiDetail: Array<Record<string, unknown>> = [];
    const allMints = new Set<string>([SOL_MINT]);

    // 2. Meteora positions per pool
    for (const pool of openPools) {
      if (!pool.poolAddress) continue;
      const pnl = (await fetchJsonWithRetry(
        `https://dlmm.datapi.meteora.ag/positions/${pool.poolAddress}/pnl?user=${wallet}&status=open`,
      )) as {
        tokenX?: string;
        tokenY?: string;
        positions?: Array<{
          positionAddress?: string;
          unrealizedPnl?: {
            balanceTokenX?: { amount?: string | number };
            balanceTokenY?: { amount?: string | number };
            unclaimedFeeTokenX?: { amount?: string | number };
            unclaimedFeeTokenY?: { amount?: string | number };
          };
        }>;
      };

      const mintX = pnl.tokenX ?? "";
      const mintY = pnl.tokenY ?? "";
      if (mintX) allMints.add(mintX);
      if (mintY) allMints.add(mintY);

      let jumlahX = 0;
      let jumlahY = 0;
      let feeX = 0;
      let feeY = 0;
      for (const pos of pnl.positions ?? []) {
        const u = pos.unrealizedPnl;
        jumlahX += safeNum(u?.balanceTokenX?.amount);
        jumlahY += safeNum(u?.balanceTokenY?.amount);
        feeX += safeNum(u?.unclaimedFeeTokenX?.amount);
        feeY += safeNum(u?.unclaimedFeeTokenY?.amount);
      }
      posisiDetail.push({
        pool: pool.poolAddress,
        mint_x: mintX,
        mint_y: mintY,
        jumlah_x: jumlahX,
        jumlah_y: jumlahY,
        fee_x: feeX,
        fee_y: feeY,
      });
    }

    // 3. Solana RPC: native SOL + SPL Token + Token-2022
    const [balRes, splRes, t22Res] = await Promise.all([
      rpcCall(rpcUrl, "getBalance", [wallet]) as Promise<{ value?: number }>,
      rpcCall(rpcUrl, "getTokenAccountsByOwner", [
        wallet,
        { programId: TOKEN_PROGRAM },
        { encoding: "jsonParsed" },
      ]) as Promise<{ value?: TokenAccountEntry[] }>,
      rpcCall(rpcUrl, "getTokenAccountsByOwner", [
        wallet,
        { programId: TOKEN_2022_PROGRAM },
        { encoding: "jsonParsed" },
      ]) as Promise<{ value?: TokenAccountEntry[] }>,
    ]);

    const solNative = safeNum(balRes?.value) / 1e9;
    const tokenWalletMap = new Map<string, number>();
    for (const acc of [...(splRes?.value ?? []), ...(t22Res?.value ?? [])]) {
      const info = acc.account?.data?.parsed?.info;
      const mint = info?.mint;
      const amt = safeNum(info?.tokenAmount?.uiAmountString ?? info?.tokenAmount?.uiAmount);
      if (mint && amt > 0) {
        tokenWalletMap.set(mint, (tokenWalletMap.get(mint) ?? 0) + amt);
        allMints.add(mint);
      }
    }

    // 4. Jupiter Price API v3 (single batch call if <= 50 mints)
    let prices: Record<string, { usdPrice?: number; liquidity?: number }> = {};
    try {
      prices = await fetchJupiterPrices([...allMints]);
    } catch {
      // Fallback hanya untuk SOL bila Jupiter sementara gagal
      prices = {};
    }

    const hargaSolUsd =
      safeNum(prices[SOL_MINT]?.usdPrice) || safeNum(meteoraOpen.solPrice);
    if (hargaSolUsd <= 0) {
      throw new Error("Harga SOL tidak tersedia dari Jupiter maupun Meteora");
    }

    const getTokenUsdPrice = (mint: string): number => {
      if (!mint) return 0;
      if (mint === SOL_MINT) return hargaSolUsd;
      const entry = prices[mint];
      const p = safeNum(entry?.usdPrice);
      const liq = safeNum(entry?.liquidity);
      if (p <= 0) return 0;
      if (mint === USDC_MINT || mint === USDT_MINT) return p;
      return liq >= ambangLikuiditas ? p : 0;
    };

    // 5. Hitung total nilai pool (BR-17)
    let dlmmUsd = 0;
    let feeBelumKlaimUsd = 0;
    for (const p of posisiDetail) {
      const px = getTokenUsdPrice(String(p.mint_x));
      const py = getTokenUsdPrice(String(p.mint_y));
      dlmmUsd += safeNum(p.jumlah_x) * px + safeNum(p.jumlah_y) * py;
      feeBelumKlaimUsd += safeNum(p.fee_x) * px + safeNum(p.fee_y) * py;
    }

    const solNativeUsd = solNative * hargaSolUsd;
    let tokenLainUsd = 0;
    const tokenWalletDetail: Array<{ mint: string; jumlah: number; usd: number }> = [];
    for (const [mint, jumlah] of tokenWalletMap.entries()) {
      const px = getTokenUsdPrice(mint);
      const usd = jumlah * px;
      tokenLainUsd += usd;
      tokenWalletDetail.push({ mint, jumlah, usd: Number(usd.toFixed(6)) });
    }

    const totalUsdRaw = dlmmUsd + feeBelumKlaimUsd + solNativeUsd + tokenLainUsd;
    if (!Number.isFinite(totalUsdRaw) || totalUsdRaw <= 0) {
      throw new Error(`Total nilai pool tidak valid: ${totalUsdRaw}`);
    }

    const nilaiUsd = Number(totalUsdRaw.toFixed(2));
    const saldoSol = Number((totalUsdRaw / hargaSolUsd).toFixed(9));
    const now = new Date();
    const dibacaPada = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString();

    const hargaMap: Record<string, number> = {};
    for (const m of allMints) {
      const p = getTokenUsdPrice(m);
      if (p > 0) hargaMap[m] = p;
    }

    const rincian = {
      posisi: posisiDetail,
      harga: hargaMap,
      dlmm_usd: Number(dlmmUsd.toFixed(4)),
      fee_belum_klaim_usd: Number(feeBelumKlaimUsd.toFixed(4)),
      sol_native: Number(solNative.toFixed(9)),
      sol_native_usd: Number(solNativeUsd.toFixed(4)),
      token: tokenWalletDetail,
      data_pool_pada: openPools[0]?.poolStateUpdatedAtBlockTime ?? null,
      meteora_usd:
        safeNum(meteoraOpen.total?.balances) + safeNum(meteoraOpen.total?.unclaimedFees),
    };

    const { data: titikRow, error: titikErr } = await sb
      .from("titik_nilai")
      .upsert(
        {
          dibaca_pada: dibacaPada,
          resolusi: "1m",
          sumber: "baca",
          nilai_usd: nilaiUsd,
          saldo_sol: saldoSol,
          harga_sol_usd: Number(hargaSolUsd.toFixed(6)),
          rincian,
        },
        { onConflict: "dibaca_pada,resolusi" },
      )
      .select("id")
      .single();

    if (titikErr) throw new Error(`Gagal simpan titik_nilai: ${titikErr.message}`);

    // 7. Snapshot harian otomatis >= jam_snapshot_otomatis WIB (BR-18)
    let snapshotDibuat = false;
    const wib = getWibDateAndTime(now);
    const jamTarget = String(cfg.jam_snapshot_otomatis ?? "08:00:00");
    if (wib.jam >= jamTarget) {
      const { data: existingSnap } = await sb
        .from("snapshot")
        .select("id")
        .eq("tanggal", wib.tanggal)
        .maybeSingle();

      if (!existingSnap) {
        const { error: snapErr } = await sb.from("snapshot").insert({
          tanggal: wib.tanggal,
          nilai_usd: nilaiUsd,
          saldo_sol: saldoSol,
          sumber: "otomatis",
          titik_nilai_id: titikRow?.id ?? null,
        });
        if (!snapErr) snapshotDibuat = true;
      }
    }

    // 6. Deteksi arus onchain tiap 5 menit (OQ-14 & BR-19)
    let arusBaru = 0;
    let flowChecked = false;
    const lastFlowMs = cfg.last_flow_check_at ? Date.parse(cfg.last_flow_check_at) : 0;
    if (forceFlow || !lastFlowMs || now.getTime() - lastFlowMs >= 4.5 * 60 * 1000) {
      flowChecked = true;
      const sigParams: Record<string, unknown> = { limit: 25 };
      if (cfg.last_signature) sigParams.until = cfg.last_signature;

      const sigs = (await rpcCall(rpcUrl, "getSignaturesForAddress", [
        wallet,
        sigParams,
      ])) as Array<{ signature: string; blockTime?: number | null; err?: unknown }>;

      if (sigs && sigs.length > 0) {
        const newestSig = sigs[0].signature;

        // Pada run perdana (last_signature masih null), cukup catat cursor terbaru agar transaksi pra-rilis tidak terduplikasi dengan impor awal.
        if (cfg.last_signature) {
          const ordered = [...sigs].filter((s) => s.err === null).reverse();
          for (const s of ordered) {
            const tx = (await rpcCall(rpcUrl, "getTransaction", [
              s.signature,
              { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
            ])) as ParsedTx | null;
            if (!tx || !tx.meta) continue;

            const progIds = new Set<string>();
            for (const ix of tx.transaction?.message?.instructions ?? []) {
              if (ix.programId) progIds.add(ix.programId);
            }
            for (const inner of tx.meta.innerInstructions ?? []) {
              for (const ix of inner.instructions ?? []) {
                if (ix.programId) progIds.add(ix.programId);
              }
            }
            const isDefiOrSwap = [...progIds].some((p) => DEFI_PROGRAM_IDS.has(p));
            if (isDefiOrSwap) continue;

            // Hitung delta token milik wallet
            const preTok = new Map<string, number>();
            const postTok = new Map<string, number>();
            for (const b of tx.meta.preTokenBalances ?? []) {
              if (b.owner === wallet) {
                const v = safeNum(b.uiTokenAmount?.uiAmountString ?? b.uiTokenAmount?.uiAmount);
                preTok.set(b.mint, (preTok.get(b.mint) ?? 0) + v);
              }
            }
            for (const b of tx.meta.postTokenBalances ?? []) {
              if (b.owner === wallet) {
                const v = safeNum(b.uiTokenAmount?.uiAmountString ?? b.uiTokenAmount?.uiAmount);
                postTok.set(b.mint, (postTok.get(b.mint) ?? 0) + v);
              }
            }

            const deltas: Array<{ mint: string; delta: number }> = [];
            const touchedMints = new Set([...preTok.keys(), ...postTok.keys()]);
            for (const m of touchedMints) {
              const d = (postTok.get(m) ?? 0) - (preTok.get(m) ?? 0);
              if (Math.abs(d) > 1e-9) deltas.push({ mint: m, delta: d });
            }

            // Cek delta native SOL (kecuali fee payer biaya transaksi kecil)
            const keys = (tx.transaction?.message?.accountKeys ?? []).map((k) =>
              typeof k === "string" ? k : (k.pubkey ?? ""),
            );
            const walletIdx = keys.indexOf(wallet);
            if (walletIdx >= 0 && tx.meta.preBalances && tx.meta.postBalances) {
              const preLam = tx.meta.preBalances[walletIdx] ?? 0;
              const postLam = tx.meta.postBalances[walletIdx] ?? 0;
              const feeLam = walletIdx === 0 ? (tx.meta.fee ?? 0) : 0;
              const netSol = (postLam - preLam + feeLam) / 1e9;
              if (Math.abs(netSol) > 1e-6) {
                deltas.push({ mint: SOL_MINT, delta: netSol });
              }
            }

            // Abaikan jika terlihat seperti swap (ada aset masuk dan keluar sekaligus)
            const hasIn = deltas.some((d) => d.delta > 0);
            const hasOut = deltas.some((d) => d.delta < 0);
            if (hasIn && hasOut) continue;

            const extraMints = deltas
              .map((d) => d.mint)
              .filter((m) => m !== SOL_MINT && m !== USDC_MINT && m !== USDT_MINT && !prices[m]);
            if (extraMints.length > 0) {
              try {
                Object.assign(prices, await fetchJupiterPrices(extraMints));
              } catch {
                // ignore
              }
            }

            const waktuIso = tx.blockTime
              ? new Date(tx.blockTime * 1000).toISOString()
              : now.toISOString();

            for (let idx = 0; idx < deltas.length; idx++) {
              const d = deltas[idx];
              const arah = d.delta > 0 ? "masuk" : "keluar";
              const jumlah = Math.abs(d.delta);
              const px =
                d.mint === USDC_MINT || d.mint === USDT_MINT
                  ? 1
                  : d.mint === SOL_MINT
                  ? hargaSolUsd
                  : safeNum(prices[d.mint]?.usdPrice);
              const nilaiFlowUsd = Number((jumlah * px).toFixed(2));
              const isDust = nilaiFlowUsd < ambangDust;

              const { error: insFlowErr } = await sb.from("arus_onchain").upsert(
                {
                  signature: s.signature,
                  urutan: idx,
                  waktu: waktuIso,
                  arah,
                  mint: d.mint,
                  simbol: mintSymbol(d.mint),
                  jumlah: Number(jumlah.toFixed(9)),
                  nilai_usd: nilaiFlowUsd,
                  alamat_lawan: extractCounterparty(tx, wallet, arah),
                  status: isDust ? "bukan_arus" : "belum",
                  catatan: isDust ? "dust otomatis" : null,
                },
                { onConflict: "signature,urutan", ignoreDuplicates: true },
              );
              if (!insFlowErr) arusBaru++;
            }
          }
        }

        await sb
          .from("pengaturan_pool")
          .update({
            last_signature: newestSig,
            last_flow_check_at: now.toISOString(),
            diubah_pada: now.toISOString(),
          })
          .eq("id", 1);
      } else {
        await sb
          .from("pengaturan_pool")
          .update({
            last_flow_check_at: now.toISOString(),
            diubah_pada: now.toISOString(),
          })
          .eq("id", 1);
      }
    }

    const summary = {
      titik_nilai_id: titikRow?.id ?? null,
      dibaca_pada: dibacaPada,
      nilai_usd: nilaiUsd,
      saldo_sol: saldoSol,
      harga_sol_usd: Number(hargaSolUsd.toFixed(4)),
      snapshot_dibuat: snapshotDibuat,
      flow_checked: flowChecked,
      arus_baru: arusBaru,
      durasi_ms: Date.now() - startedAt,
    };

    await sb.from("job_log").insert({
      job_name: "baca-wallet",
      status: "ok",
      detail: summary,
    });

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const msg = rawMsg.replace(/api-key=[^&\s]+/gi, "api-key=***");
    await sb.from("job_log").insert({
      job_name: "baca-wallet",
      status: "error",
      detail: { error: msg, durasi_ms: Date.now() - startedAt },
    });
    return new Response(JSON.stringify({ kode: "GAGAL", pesan: msg }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
});
