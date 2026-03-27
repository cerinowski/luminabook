import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import OpenAI from "openai";

export const maxDuration = 30; // AUMENTADO PARA 30s (CONFORME DIAGNÓSTICO CHARLES)

const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 10000) return false;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    return isPng || isJpeg;
};

export async function POST(req: Request) {
    try {
        const { prompt, model: requestedModel } = await req.json();

        const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim()?.replace(/["']/g, "");
        const openAIKey = process.env.OPENAI_API_KEY?.trim()?.replace(/["']/g, "");

        console.log(`--- G26 ENGINE (30s LIMIT) ---`);

        // STAGE 1: DALL-E 3 (Elite)
        if (openAIKey && (requestedModel === 'dalle' || !requestedModel || requestedModel === 'auto')) {
            try {
                const openai = new OpenAI({ apiKey: openAIKey });
                const response = await openai.images.generate({
                    model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "b64_json"
                });
                if (response.data && response.data[0] && response.data[0].b64_json) {
                    return NextResponse.json({ base64: `data:image/png;base64,${response.data[0].b64_json}`, engine: 'DALL-E 3 (Elite)' });
                }
            } catch (e: any) {
                console.error(`[OPENAI ERROR] ${e.message}`, e);
            }
        }

        // STAGE 2: GEMINI (Imagen 3)
        if (geminiKey && (requestedModel === 'gemini' || !requestedModel || requestedModel === 'auto')) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                // Usando o modelo mais recente de imagem disponível no SDK
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
                const result = await model.generateContent(prompt);
                const b64 = result.response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
                if (b64) {
                    return NextResponse.json({ base64: `data:image/png;base64,${b64}`, engine: 'Gemini (Elite)' });
                }
            } catch (e: any) {
                console.error(`[GEMINI ERROR] ${e.message}`, e);
            }
        }

        // STAGE 3: POLLINATIONS (Server-Side Bypass)
        try {
            console.log(`[STAGE 3] Pollinations Start...`);
            const url = `https://pollinations.ai/p/${encodeURIComponent(prompt.substring(0, 300))}?width=1024&height=1024&seed=${Math.floor(Math.random() * 999999)}&model=flux&nologo=true`;
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) }); // Aumentado para 15s já que a rota permite 30s
            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                const buf = Buffer.from(arrayBuffer);
                if (isValidImage(buf)) {
                    return NextResponse.json({ base64: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'Server Bypass' });
                }
            }
        } catch (e: any) {
            console.error(`[POLLINATIONS ERROR] ${e.message}`);
        }

        return NextResponse.json({ error: "Server engines failed. Use Browser-Power bypass." }, { status: 503 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
