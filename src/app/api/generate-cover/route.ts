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

        console.log('Solicitando capa pro HuggingFace via FLUX.1-schnell...');

        // Usando o modelo FLUX.1-schnell que tem extrema habilidade com escrita de textos
        const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            console.error('HF API Failed:', response.status);
            const errorText = await response.text();
            console.error('Detalhes do erro HF:', errorText);
            return NextResponse.json({ error: 'Failed to generate image on HuggingFace API' }, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        console.log('Capa da HuggingFace recebida com sucesso! Tamanho:', base64.length);

        return NextResponse.json({ base64: `data:${contentType};base64,${base64}` });
    } catch (error: any) {
        console.error('HF Proxy Catch:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
