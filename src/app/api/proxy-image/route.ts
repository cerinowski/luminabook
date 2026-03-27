import { NextResponse } from 'next/server';

export const maxDuration = 60;

const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 1000) return false;

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;

    return isPng || isJpeg;
};

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
        }

        console.log(`[G18 PROXY] Fetching: ${url.substring(0, 100)}...`);

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'image/*'
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            console.error(`[G18 PROXY] Fetch failed for ${url}: ${res.status}`);
            return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (!isValidImage(buffer)) {
            console.warn("[G18 PROXY] Rejeitado por integridade:", buffer.length);
            return NextResponse.json({ error: 'Integrity Check Failed' }, { status: 500 });
        }

        let finalType = 'image/jpeg';
        if (buffer[0] === 0x89) finalType = 'image/png';

        const b64 = buffer.toString('base64');

        console.log(`[G18 PROXY] Success: ${Math.round(buffer.length / 1024)}KB`);
        return NextResponse.json({
            base64: `data:${finalType};base64,${b64}`,
            size: buffer.length,
            engine: 'Proxy-Iron'
        });

    } catch (error: any) {
        console.error("[G18 PROXY ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
