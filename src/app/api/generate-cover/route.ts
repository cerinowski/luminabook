import { NextResponse } from 'next/server';

export const maxDuration = 60; // Força limite máximo da Vercel Hobby (60s)

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        console.log('Iniciando Geração com Lumina-Glow (Nano Banana Style)...');
        try {
            // Pollinations.ai - Highly Stable Public Endpoint
            const seed = Math.floor(Math.random() * 999999);
            const pollUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

            const pollRes = await fetch(pollUrl, { signal: AbortSignal.timeout(30000) });
            if (pollRes.ok) {
                const arrayBuffer = await pollRes.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                return NextResponse.json({ base64: `data:image/jpeg;base64,${base64}`, engine: 'Lumina-Glow' });
            }
        } catch (e) {
            console.error('Lumina-Glow Falhou:', e);
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'HUGGINGFACE_API_KEY is missing' }, { status: 500 });
        }

        console.log('Tentando Fallback: HuggingFace (Tiered Strategy)...');
        const models = [
            "black-forest-labs/FLUX.1-dev",
            "black-forest-labs/FLUX.1-schnell",
            "stabilityai/stable-diffusion-xl-base-1.0",
            "runwayml/stable-diffusion-v1-5",
            "prompthero/openjourney",
            "stabilityai/stable-diffusion-2-1"
        ];

        let lastResponse = null;
        for (const model of models) {
            try {
                console.log(`Tentando modelo: ${model}...`);
                const response = await fetch(
                    `https://api-inference.huggingface.co/models/${model}`,
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
            return NextResponse.json({
                error: `Todas as IAs falharam (Status ${status}). Tente uma descrição mais simples.`,
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
