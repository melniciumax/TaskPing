import { NextRequest, NextResponse } from "next/server";
import build from "@/lib/taskping_build.json";

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address) return NextResponse.json({ ok: false, error: "No address" }, { status: 400 });

    const params = new URLSearchParams({
      apikey: "YourApiKeyToken",
      module: "contract",
      action: "verifysourcecode",
      contractaddress: address,
      sourceCode: build.source,
      codeformat: "solidity-single-file",
      contractname: "TaskPing",
      compilerversion: build.compilerVersion,
      optimizationUsed: build.optimizer.enabled ? "1" : "0",
      runs: String(build.optimizer.runs),
      evmversion: build.evmVersion,
      licenseType: "3",
      constructorArguements: "",
    });

    const resp = await fetch("https://testnet.arcscan.app/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        Origin: "https://testnet.arcscan.app",
        Referer: "https://testnet.arcscan.app/verifyContract",
      },
      body: params.toString(),
    });

    const data = await resp.json();
    if (data.status === "1") return NextResponse.json({ ok: true, guid: data.result });
    return NextResponse.json({ ok: false, error: data.result || data.message });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
