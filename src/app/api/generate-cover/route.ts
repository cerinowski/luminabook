import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();

        if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

        console.log('--- NANO BANANA G7 START ---');

        // 1. ENGINE GEMINI (IMAGEN 3)
        const geminiTask = async () => {
            if (!geminiKey) throw new Error("No Gemini Key");
            const genAI = new GoogleGenerativeAI(geminiKey.trim());
            const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const candidates = response.candidates;
            if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
                return {
                    base64: `data:image/png;base64,${candidates[0].content.parts[0].inlineData.data}`,
                    engine: 'Nano-Banana (G7)'
                };
            }
            throw new Error("Gemini Fail");
        };

        // 2. ENGINE HF FLUX (TURBO SPEED)
        const hfTask = async () => {
            if (!hfKey) throw new Error("No HF Key");
            const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
                signal: AbortSignal.timeout(6500)
            });
            if (!hfRes.ok) throw new Error("HF Fail");
            const buffer = await hfRes.arrayBuffer();
            return {
                base64: `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`,
                engine: 'Nano-Flux (G7)'
            };
        };

        // 3. ENGINE INSTANT-NANO (SERVER-SIDE PROXY FALLBACK)
        // Se após 5 segundos nada aconteceu, tentamos o Pollinations NO SERVIDOR para devolver Base64
        const fallbackTask = async () => {
            await new Promise(r => setTimeout(r, 5500));
            const seed = Math.floor(Math.random() * 99999);
            const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;
            console.log("[G7] Using Rapid-Proxy Fallback...");
            const fbRes = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (fbRes.ok) {
                const buffer = await fbRes.arrayBuffer();
                return {
                    base64: `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`,
                    engine: 'Nano-Instant (G7)'
                };
            }
            throw new Error("All Engines Failed");
        };

        try {
            // Corrida de 3 motores em paralelo. O primeiro que der OK ganha.
            const result = await Promise.any([geminiTask(), hfTask(), fallbackTask()]);
            return NextResponse.json(result);
        } catch (anyErr: any) {
            console.error("G7 FATAL:", anyErr.message);
            return NextResponse.json({ error: "API Timeout", status: 504 }, { status: 504 });
        }

    } catch (error: any) {
        console.error('G7 ENGINE ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
