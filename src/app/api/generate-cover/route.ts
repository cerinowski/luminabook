import { NextResponse } from 'next/server';

export const maxDuration = 60; // Força limite máximo da Vercel Hobby (60s)

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const apiKey = process.env.HUGGINGFACE_API_KEY;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'HUGGINGFACE_API_KEY is missing' }, { status: 500 });
        }

        console.log('Solicitando capa pro HuggingFace (Tiered Strategy)...');

        const models = [
            "black-forest-labs/FLUX.1-dev",
            "black-forest-labs/FLUX.1-schnell"
        ];

        let lastResponse = null;
        for (const model of models) {
            try {
                console.log(`Tentando modelo: ${model}...`);
                const response = await fetch(
                    `https://router.huggingface.co/hf-inference/models/${model}`,
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                        method: "POST",
                        body: JSON.stringify({
                            inputs: prompt,
                            parameters: model.includes('dev') ? { guidance_scale: 3.5, num_inference_steps: 28 } : {}
                        }),
                        cache: 'no-store',
                        signal: AbortSignal.timeout(25000) // 25s por tentativa
                    }
                );

                if (response.ok) {
                    lastResponse = response;
                    break;
                }
                const errorBody = await response.text();
                console.warn(`Modelo ${model} falhou: ${response.status} - ${errorBody}`);
                lastResponse = response; // Store for final error reporting
            } catch (e) {
                console.error(`Erro ao tentar ${model}:`, e);
            }
        }

        if (!lastResponse || !lastResponse.ok) {
            const status = lastResponse?.status || 504;
            console.error('All models failed or timed out.');
            return NextResponse.json({
                error: `Failed on all models (Status ${status}). HuggingFace might be overloaded or rate-limiting.`,
                status
            }, { status: 504 });
        }

        const arrayBuffer = await lastResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = lastResponse.headers.get('content-type') || 'image/jpeg';

        console.log('Capa recebida via Tiered Logic! Tamanho:', base64.length);
        return NextResponse.json({ base64: `data:${contentType};base64,${base64}` });
    } catch (error: any) {
        console.error('HF Proxy Catch:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
