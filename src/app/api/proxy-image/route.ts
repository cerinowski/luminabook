import { NextResponse } from 'next/server';

export const maxDuration = 60; // Força limite máximo da Vercel Hobby (60s) para não derrubar o fetch da imagem 8k

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/jpeg, image/png, image/*;q=0.8'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error('Proxy Failed:', response.status, url);
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        return NextResponse.json({ base64: `data:${contentType};base64,${base64}` });
    } catch (error: any) {
        console.error('Proxy Catch:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
