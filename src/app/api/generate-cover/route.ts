import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        console.log('--- NANO BANANA ENGINE START ---', { prompt });

        // ORDEM DE PRIORIDADE: O QUE FUNCIONAR PRIMEIRO GANHA
        const models = [
            "black-forest-labs/FLUX.1-schnell",
            "black-forest-labs/FLUX.1-dev"
        ];

        // 1. TENTA HUGGINGFACE (TIERED)
        if (apiKey) {
            for (const model of models) {
                try {
                    console.log(`Tentando HF: ${model}...`);
                    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                            "x-use-cache": "false"
                        },
                        method: "POST",
                        body: JSON.stringify({ inputs: prompt }),
                        signal: AbortSignal.timeout(15000)
                    });

                    if (res.ok) {
                        const buffer = await res.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        return NextResponse.json({
                            base64: `data:image/jpeg;base64,${base64}`,
                            engine: `Nano-${model.split('/').pop()}`
                        });
                    }
                } catch (e) {
                    console.warn(`HF ${model} falhou, tentando próximo...`);
                }
            }
        }

        // 2. TENTA POLLINATIONS (SE TUDO FALHAR)
        try {
            console.log('Fallback: Pollinations...');
            const seed = Math.floor(Math.random() * 999999);
            const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;
            const pollRes = await fetch(pollUrl);
            if (pollRes.ok) {
                const buffer = await pollRes.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                return NextResponse.json({
                    base64: `data:image/jpeg;base64,${base64}`,
                    engine: 'Nano-Pollinations'
                });
            }
        } catch (pollErr) {
            console.error('Pollinations tbm falhou:', pollErr);
        }

        return NextResponse.json({
            error: "Todas as IAs falharam. Tente novamente em instantes.",
            status: 504
        }, { status: 504 });

    } catch (error: any) {
        console.error('ENGINE CRITICAL ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
