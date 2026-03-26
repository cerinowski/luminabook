import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();

        if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

        console.log('--- NANO BANANA G9 UNBREAKABLE START ---');

        // VALIDANDO BUFFER (SE FOR MENOR QUE 5KB É LIXO/ERRO)
        const isValidImage = (buffer: Buffer) => buffer.length > 5000;

        // 1. ENGINE GEMINI (IMAGEN 3)
        const geminiTask = async () => {
            if (!geminiKey) throw new Error("No Gemini Key");
            try {
                const genAI = new GoogleGenerativeAI(geminiKey.trim());
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const candidates = response.candidates;
                if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
                    const base64Data = candidates[0].content.parts[0].inlineData.data;
                    const buffer = Buffer.from(base64Data, 'base64');
                    if (isValidImage(buffer)) {
                        return { base64: `data:image/png;base64,${base64Data}`, engine: 'Nano-Banana (G9)' };
                    }
                }
            } catch (e) { }
            throw new Error("Gemini Fail");
        };

        // 2. ENGINE HF FLUX (TURBO)
        const hfTask = async () => {
            if (!hfKey) throw new Error("No HF Key");
            try {
                const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                    headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({ inputs: prompt }),
                    signal: AbortSignal.timeout(7000)
                });
                if (hfRes.ok) {
                    const arrayBuffer = await hfRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    if (isValidImage(buffer)) {
                        return { base64: `data:image/jpeg;base64,${buffer.toString('base64')}`, engine: 'Nano-Flux (G9)' };
                    }
                }
            } catch (e) { }
            throw new Error("HF Fail");
        };

        // 3. ENGINE EMERGENCY (POLLINATIONS PROXY) - AGORA COM VALIDAÇÃO REAL
        const emergencyTask = async () => {
            // Esperamos um pouco para dar chance aos motores de elite
            await new Promise(r => setTimeout(r, 6000));
            const seed = Math.floor(Math.random() * 999999);
            const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;

            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    const ab = await res.arrayBuffer();
                    const buf = Buffer.from(ab);
                    if (isValidImage(buf)) {
                        return { base64: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'Nano-Instant (G9)' };
                    }
                }
            } catch (e) { }
            throw new Error("Emergency Fail");
        };

        try {
            // RACE inteligente. O primeiro que VALIDAR ganha.
            const result = await Promise.any([geminiTask(), hfTask(), emergencyTask()]);
            return NextResponse.json(result);
        } catch (anyErr: any) {
            console.error("G9 CRITICAL:", anyErr.message);
            return NextResponse.json({ error: "API Timeout/Failure", status: 504 }, { status: 504 });
        }

    } catch (error: any) {
        console.error('SERVER FATAL:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
