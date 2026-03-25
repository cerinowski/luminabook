import { NextResponse } from 'next/server';

export const maxDuration = 60; // Força limite máximo da Vercel Hobby (60s)

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        console.log('NANO BANANA ENGINE: Gerando...', { prompt });

        try {
            const seed = Math.floor(Math.random() * 1000000);
            const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

            const res = await fetch(pollUrl);
            if (res.ok) {
                const buffer = await res.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                return NextResponse.json({ base64: `data:image/jpeg;base64,${base64}`, engine: 'Nano-Banana' });
            }
        } catch (pollError: any) {
            console.error('NANO BANANA FAILED (Poll), trying HF...', pollError.message);
        }

        if (apiKey) {
            try {
                const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({ inputs: prompt }),
                    signal: AbortSignal.timeout(20000)
                });
                if (hfRes.ok) {
                    const buffer = await hfRes.arrayBuffer();
                    return NextResponse.json({ base64: `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`, engine: 'HF-Schnell' });
                }
            } catch (hfErr) { }
        }

        return NextResponse.json({ error: "Todas as IAs falharam. Usando Modo de Segurança (Gradiente)." }, { status: 500 });

    } catch (error: any) {
        console.error('HF Proxy Catch:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
