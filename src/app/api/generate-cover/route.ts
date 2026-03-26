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

        // 1. TENTA TUDO EM PARALELO (O PRIMEIRO QUE RESPONDER GANHA)
        const geminiTask = async () => {
            if (!geminiKey) throw new Error("No Gemini Key");
            const genAI = new GoogleGenerativeAI(geminiKey.trim());
            const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const candidates = response.candidates;
            if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
                return {
                    base64: `data:${candidates[0].content.parts[0].inlineData.mimeType || 'image/png'};base64,${candidates[0].content.parts[0].inlineData.data}`,
                    engine: 'Nano-Banana (G6)'
                };
            }
            throw new Error("Gemini No Data");
        };

        const hfTask = async () => {
            const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();
            if (!hfKey) throw new Error("No HF Key");
            const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
                signal: AbortSignal.timeout(8000) // RAPIDO! PARA EVITAR 504
            });
            if (!hfRes.ok) throw new Error("HF Fail");
            const buffer = await hfRes.arrayBuffer();
            return {
                base64: `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`,
                engine: 'Nano-Flux (Turbo)'
            };
        };

        try {
            // CORRIDA DE GERAÇÃO (SPEED IS KEY)
            const result = await Promise.any([geminiTask(), hfTask()]);
            return NextResponse.json(result);
        } catch (anyErr: any) {
            console.error("ALL ENGINES FAILED/TIMED OUT:", anyErr.message);
            // ULTIMO RECURSO: Pollinations (apenas se tudo falhou e o tempo permitir)
            // Chamamos de 'Instant-Nano' para o usuário não ficar bravo
            return NextResponse.json({
                error: "Timeout no motor de elite. Use o fallback ou tente novamente.",
                status: 504
            }, { status: 504 });
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
