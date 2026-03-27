import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const maxDuration = 60; // 1 minuto de resiliência total

const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 20000) return false;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    return isPng || isJpeg;
};

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();
        const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();

        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        console.log('--- G23 UNBREAKABLE ENGINE (60S CHAIN) ---');

        // --- STAGE 1: GEMINI IMAGEN 3 (ELITE) ---
        if (geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
                const result = await model.generateContent(prompt);
                const candidates = result.response.candidates;
                if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
                    const b64 = candidates[0].content.parts[0].inlineData.data;
                    const buf = Buffer.from(b64, 'base64');
                    if (isValidImage(buf)) {
                        return NextResponse.json({ base64: `data:image/png;base64,${b64}`, engine: 'Gemini (Elite)' });
                    }
                }
            } catch (e: any) { console.error("[G23] Gemini Skip:", e.message); }
        }

        // --- STAGE 2: HF FLUX (STABLE) ---
        if (hfKey) {
            try {
                const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                    headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                    method: "POST", body: JSON.stringify({ inputs: prompt }),
                    signal: AbortSignal.timeout(20000)
                });
                if (hfRes.ok) {
                    const buf = Buffer.from(await hfRes.arrayBuffer());
                    if (isValidImage(buf)) {
                        return NextResponse.json({ base64: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'HF Flux (Stable)' });
                    }
                }
            } catch (e: any) { console.error("[G23] HF Skip:", e.message); }
        }

        // --- STAGE 3: POLLINATIONS (UNSTOPPABLE BYPASS) ---
        try {
            const seed = Math.floor(Math.random() * 999999);
            const url = `https://pollinations.ai/p/${encodeURIComponent(prompt.substring(0, 400))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (isValidImage(buf)) {
                    return NextResponse.json({ base64: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'Bypass (Validated)' });
                }
            }
        } catch (e: any) { console.error("[G23] Pollinations Skip:", e.message); }

        return NextResponse.json({ error: "All engines exhausted" }, { status: 504 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
