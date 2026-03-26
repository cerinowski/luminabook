import { NextResponse } from 'next/server';

export const maxDuration = 60;

// VALIDAÇÃO FERROVIÁRIA G18
const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 30000) return false;

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;

    return isPng || isJpeg;
};

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

        console.log(`[G18 PROXY] Fetching: ${url.substring(0, 50)}...`);

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'image/*'
            },
            cache: 'no-store'
        });

        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || !contentType.startsWith("image/")) {
            console.error("[G18 PROXY] Rejeitado. Status:", res.status, "Content-Type:", contentType);
            return NextResponse.json({ error: 'Invalid data type or fetch error' }, { status: 500 });
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (!isValidImage(buffer)) {
            console.error("[G18 PROXY] Rejeitado por integridade (Small/Non-Image). Size:", Math.round(buffer.length / 1024), "KB");
            return NextResponse.json({ error: 'Integrity Check Failed' }, { status: 500 });
        }

        const b64 = buffer.toString('base64');
        let finalType = contentType;
        if (buffer[0] === 0x89) finalType = 'image/png';
        if (buffer[0] === 0xFF) finalType = 'image/jpeg';

        console.log(`[G18 PROXY] Success: ${Math.round(buffer.length / 1024)}KB`);
        return NextResponse.json({
            base64: `data:${finalType};base64,${b64}`,
            size: buffer.length,
            engine: 'Proxy-Iron'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
