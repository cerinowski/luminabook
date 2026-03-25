import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const apiKey = process.env.HUGGINGFACE_API_KEY;

        if (!prompt || !apiKey) {
            return NextResponse.json({ error: 'Missing prompt or API key' }, { status: 400 });
        }

        console.log('HF Inference [v4.3]:', prompt.slice(0, 50));

        // Usamos black-forest-labs/FLUX.1-schnell para velocidade máxima e menos falhas
        const model = "black-forest-labs/FLUX.1-schnell";

        const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
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
            const errText = await response.text();
            console.error(`HF Error [${response.status}]:`, errText);
            return NextResponse.json({ error: `HF Error: ${response.status}` }, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        return NextResponse.json({ base64: `data:${contentType};base64,${base64}` });
    } catch (error: any) {
        console.error('Master HF Catch:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
