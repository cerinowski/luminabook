import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

        console.log(`[G13 PROXY] Fetching: ${url.substring(0, 100)}...`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Downstream Fail: ${response.status}` }, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // --- G13 INTELLIGENT SNIFFING ---
        // Verifica se o buffer "parece" uma imagem (Magic Bytes ou tamanho mínimo)
        if (buffer.length < 1000) {
            const text = buffer.toString('utf8');
            console.error('[G13] Invalid Image Buffer. Content:', text.substring(0, 100));
            return NextResponse.json({ error: 'Invalid Image Data' }, { status: 500 });
        }

        // Detectamos o tipo real se possível
        let contentType = response.headers.get('content-type') || 'image/jpeg';

        // Se o buffer começar com "GIF8" (GIF), "PNG" (PNG), "ÿØÿ" (JPEG)
        // Isso é opcional mas garante o MIME correto
        if (buffer[0] === 0x89 && buffer[1] === 0x50) contentType = 'image/png';
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) contentType = 'image/jpeg';

        console.log(`[G13] Success: ${buffer.length} bytes delivered.`);
        const base64 = buffer.toString('base64');
        return NextResponse.json({
            base64: `data:${contentType};base64,${base64}`,
            size: buffer.length
        });

    } catch (error: any) {
        console.error('SERVER PROXY ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
