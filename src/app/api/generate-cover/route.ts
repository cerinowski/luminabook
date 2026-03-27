import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import OpenAI from "openai";

export const maxDuration = 60; // 1 minuto de resiliência total

const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 15000) return false;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    return isPng || isJpeg;
};

export async function POST(req: Request) {
    try {
        const { prompt, model: requestedModel } = await req.json();

        const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim()?.replace(/["']/g, "");
        const hfKey = process.env.HUGGINGFACE_API_KEY?.trim()?.replace(/["']/g, "");
        const openAIKey = process.env.OPENAI_API_KEY?.trim()?.replace(/["']/g, "");

        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        console.log(`--- G24 SURVIVOR ENGINE (${requestedModel || 'Auto-Chain'}) ---`);

        // --- MÁQUINA DE SOBREVIVÊNCIA (STAGES) ---

        // STAGE 1: DALL-E 3 (Se solicitado ou se houver chave)
        if ((requestedModel === 'dalle' || (!requestedModel && openAIKey)) && openAIKey) {
            try {
                const openai = new OpenAI({ apiKey: openAIKey });
                const response = await openai.images.generate({
                    model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "b64_json"
                });
                const b64 = response.data[0].b64_json;
                if (b64) {
                    return NextResponse.json({ base64: `data:image/png;base64,${b64}`, engine: 'DALL-E 3 (Premium)' });
                }
            } catch (e: any) { console.error("DALL-E Fail:", e.message); }
        }

        // STAGE 2: GEMINI ELITE (A Melhor Grátis)
        if ((requestedModel === 'gemini' || !requestedModel) && geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
                const result = await model.generateContent(prompt);
                const b64 = result.response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
                if (b64) {
                    const buf = Buffer.from(b64, 'base64');
                    if (isValidImage(buf)) {
                        return NextResponse.json({ base64: `data:image/png;base64,${b64}`, engine: 'Gemini Imagen 3 (Elite)' });
                    }
                }
            } catch (e: any) {
                console.error("Gemini Error:", e.message);
                if (requestedModel === 'gemini') return NextResponse.json({ error: `Gemini Falhou: ${e.message}` }, { status: 500 });
            }
        }

        // STAGE 3: FLUX (HF)
        if ((requestedModel === 'flux' || !requestedModel) && hfKey) {
            try {
                const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                    headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                    method: "POST", body: JSON.stringify({ inputs: prompt }),
                    signal: AbortSignal.timeout(20000)
                });
                if (hfRes.ok) {
                    const buf = Buffer.from(await hfRes.arrayBuffer());
                    if (isValidImage(buf)) {
                        return NextResponse.json({ base64: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'Flux HF (Stable)' });
                    }
                }
            } catch (e: any) { console.error("HF Fail:", e.message); }
        }

        // STAGE 4: POLLINATIONS BYPASS (O QUE SEMPRE FUNCIONA POR ÚLTIMO)
        try {
            const seed = Math.floor(Math.random() * 999999);
            const url = `https://pollinations.ai/p/${encodeURIComponent(prompt.substring(0, 450))}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
            const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (isValidImage(buf)) {
                    return NextResponse.json({ base64: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'Survivor Bypass' });
                }
            }
        } catch (e: any) { console.error("Pollinations Fail:", e.message); }

        return NextResponse.json({ error: "TODAS AS IAs FALHARAM. Verifique suas chaves de API." }, { status: 504 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
