import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const maxDuration = 10; // Reduzido para garantir resposta rápida

const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 30000) return false;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    return isPng || isJpeg;
};

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();

        if (!geminiKey) return NextResponse.json({ error: 'Gemini Key Missing' }, { status: 500 });

        console.log('--- G19 ELITE BACKEND (SINGLE ENGINE) ---');

        // APENAS GEMINI - SE FALHAR, O FRONT RESOLVE O FALLBACK
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8500); // Morte súbita em 8.5s

        const result = await model.generateContent(prompt);
        clearTimeout(timeoutId);

        const candidates = result.response.candidates;
        if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
            const b64 = candidates[0].content.parts[0].inlineData.data;
            const buf = Buffer.from(b64, 'base64');
            if (isValidImage(buf)) {
                return NextResponse.json({
                    base64: `data:image/png;base64,${b64}`,
                    engine: 'Gemini (Elite)'
                });
            }
        }

        return NextResponse.json({ error: "Gemini invalid or slow" }, { status: 503 });

    } catch (error: any) {
        console.error("[G19] Backend Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
