import { NextResponse } from 'next/server';

export const maxDuration = 60;

const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 1000) return false;

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;

    return isPng || isJpeg;
};

export async function POST(req: Request) {
    let currentUrl = "";
    try {
        const { url } = await req.json();
        currentUrl = url;

        if (!url || typeof url !== 'string') {
            throw new Error("URL inválida ou ausente");
        }

        console.log(`[G18 PROXY] Target: ${url.substring(0, 100)}...`);

        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' },
            cache: 'no-store',
            signal: AbortSignal.timeout(15000) // Aumentado para 15s
        });

        if (!res.ok) {
            throw new Error(`Upstream returned ${res.status}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
            throw new Error(`Upstream não retornou imagem (tipo: ${contentType})`);
        }

        const b64 = buffer.toString('base64');

        return NextResponse.json({
            base64: `data:${contentType};base64,${b64}`,
            size: buffer.length,
            engine: 'Proxy-Iron (Flux)'
        });

    } catch (error: any) {
        console.error("[G18 PROXY FAILURE]", error.message);

        // ULTIMO RECURSO: Retornar um placeholder vibrante (sem ambiguidade)
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
            <rect width="100%" height="100%" fill="#ff0040"/>
            <text x="50%" y="45%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-size="60" font-weight="bold" font-family="sans-serif">FALLBACK IRON</text>
            <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-size="30" font-family="sans-serif">IMAGEM REAL NÃO FOI CARREGADA</text>
            <text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-size="20" font-family="monospace" opacity="0.8">${error.message.substring(0, 50)}</text>
          </svg>
        `.trim();
        const placeholderB64 = Buffer.from(svg).toString("base64");

        return NextResponse.json({
            base64: `data:image/svg+xml;base64,${placeholderB64}`,
            error: error.message,
            isFallback: true,
            engine: 'Proxy-Fallback'
        });
    }
}
