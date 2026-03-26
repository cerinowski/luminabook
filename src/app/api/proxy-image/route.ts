import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

        console.log(`[G17 PROXY] Fetching: ${url.substring(0, 50)}...`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Fetch Fail: ${response.status}` }, { status: 500 });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // --- G17 UNBREAKABLE VALIDATION ---
        const b64 = buffer.toString('base64');
        const sizeKB = Math.round(buffer.length / 1024);

        // 1. Check for HTML (Common for error pages)
        const sample = buffer.toString('utf8', 0, 100).toLowerCase();
        if (sample.includes('<!doctype') || sample.includes('<html') || sample.includes('{ "error"')) {
            console.error('[G17] Blocked: Response is HTML/JSON Error, not image.');
            return NextResponse.json({ error: 'Invalid Data Format' }, { status: 500 });
        }

        // 2. Check for Minimum Size (Real AI art in HD is > 20KB)
        if (buffer.length < 10000) {
            console.error('[G17] Blocked: Image too small produced (placeholder?). Size:', sizeKB, 'KB');
            return NextResponse.json({ error: 'Placeholder Detected' }, { status: 500 });
        }

        // 3. Detect MIME
        let contentType = response.headers.get('content-type') || 'image/jpeg';
        if (buffer[0] === 0x89 && buffer[1] === 0x50) contentType = 'image/png';
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) contentType = 'image/jpeg';

        console.log(`[G17] Delivered: ${sizeKB}KB`);
        return NextResponse.json({
            base64: `data:${contentType};base64,${b64}`,
            size: buffer.length,
            engine: 'Proxy-Unbreakable'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
