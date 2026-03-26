import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    const start = Date.now();
    try {
        const { prompt } = await req.json();
        const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();

        console.log(`[G6.5 START] PROMPT: ${prompt?.substring(0, 50)}...`);

        // 1. ENGINE NANO-BANANA (HF FLUX SCHNELL - THE FASTEST ON EARTH)
        // Tentamos o mais rápido primeiro para garantir que o 504 não aconteça.
        if (hfKey) {
            try {
                console.log("[G6.5] Trying Turbo-Nano (HF)...");
                const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                    headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({ inputs: prompt }),
                    signal: AbortSignal.timeout(6000) // CUTOFF RIGIDO DE 6 SEGUNDOS
                });
                if (hfRes.ok) {
                    const buffer = await hfRes.arrayBuffer();
                    console.log(`[G6.5 SUCCESS] HF Delivered in ${Date.now() - start}ms`);
                    return NextResponse.json({
                        base64: `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`,
                        engine: 'Nano-Banana (Turbo)'
                    });
                }
                console.warn("[G6.5] HF Failed or Busy:", hfRes.status);
            } catch (e: any) {
                console.error("[G6.5] HF Error:", e.message);
            }
        }

        // 2. ENGINE GEMINI (IMAGEN 3 - THE QUALITY PATH)
        if (geminiKey) {
            try {
                console.log("[G6.5] Trying Premium-Nano (Gemini)...");
                const genAI = new GoogleGenerativeAI(geminiKey.trim());
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const candidates = response.candidates;
                if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
                    console.log(`[G6.5 SUCCESS] Gemini Delivered in ${Date.now() - start}ms`);
                    return NextResponse.json({
                        base64: `data:image/png;base64,${candidates[0].content.parts[0].inlineData.data}`,
                        engine: 'Nano-Banana (G6.5)'
                    });
                }
            } catch (geminiErr: any) {
                console.error("[G6.5] Gemini Error:", geminiErr.message);
            }
        }

        // 3. ENGINE INSTANT-NANO (CORS BYPASS & SPEED)
        // Se tudo acima falhou ou demorou demais, usamos o link direto mascarado.
        const seed = Math.floor(Math.random() * 100000);
        // Usamos Pollinations como último recurso absoluto, mas retornamos como Base64 via Proxy para estabilidade.
        const fallbackUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt || "abstract art")}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

        console.log("[G6.5] Emergency Fallback Active...");
        return NextResponse.json({
            base64: fallbackUrl, // O frontend vai tratar como URL de emergência
            engine: 'Nano-Instant (G6.5)'
        });

    } catch (error: any) {
        console.error('[G6.5 CRITICAL ERROR]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
