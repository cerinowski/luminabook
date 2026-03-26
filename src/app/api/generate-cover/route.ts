import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        console.log('--- NANO BANANA G6 GENERATION ---', { prompt });

        if (geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey.trim());
                // MODELO OFICIAL DE GERAÇÃO DE IMAGEM DO GEMINI (NANO-BANANA GRADE)
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

                const result = await model.generateContent(prompt);
                const response = await result.response;

                // O Imagen 3 retorna a imagem em formato binário ou base64 no inlineData
                const candidates = response.candidates;
                if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
                    const base64 = candidates[0].content.parts[0].inlineData.data;
                    const mimeType = candidates[0].content.parts[0].inlineData.mimeType || 'image/png';

                    return NextResponse.json({
                        base64: `data:${mimeType};base64,${base64}`,
                        engine: 'Nano-Banana (Imagen-3)'
                    });
                }
            } catch (geminiErr: any) {
                console.error("Gemini Imagen 3 Failed:", geminiErr.message);
                // Se o modelo Imagen 3 não estiver disponível, o erro será capturado aqui
            }
        }

        // FALLBACK HUGGINGFACE (TIER 1)
        const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();
        if (hfKey) {
            try {
                const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                    headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({ inputs: prompt }),
                    signal: AbortSignal.timeout(20000)
                });
                if (hfRes.ok) {
                    const buffer = await hfRes.arrayBuffer();
                    return NextResponse.json({
                        base64: `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`,
                        engine: 'Nano-Fallback (Flux)'
                    });
                }
            } catch (e) { }
        }

        return NextResponse.json({
            error: "Habilite o Imagen 3 no Google AI Studio ou use uma chave HuggingFace válida.",
            status: 504
        }, { status: 504 });

    } catch (error: any) {
        console.error('ENGINE CRITICAL ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
