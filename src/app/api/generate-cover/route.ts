import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();
        const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();

        if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

        console.log('--- NANO BANANA G15 SAAS MASTER START ---');

        const isValid = (buf: Buffer) => buf && buf.length > 3000;

        // PRIORIDADE 1: GEMINI IMAGEN 3 (ELITE)
        if (geminiKey) {
            try {
                console.log("[G15] Trying Gemini...");
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
                const result = await model.generateContent(prompt);
                const candidates = result.response.candidates;
                if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
                    const b64 = candidates[0].content.parts[0].inlineData.data;
                    if (isValid(Buffer.from(b64, 'base64'))) {
                        return NextResponse.json({ base64: `data:image/png;base64,${b64}`, engine: 'Gemini (Elite)' });
                    }
                }
            } catch (e) { console.log("[G15] Gemini Skip."); }
        }

        // PRIORIDADE 2: HF FLUX (STABLE)
        if (hfKey) {
            try {
                console.log("[G15] Trying HF Flux...");
                const res = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                    headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                    method: "POST", body: JSON.stringify({ inputs: prompt }),
                    // Aumentamos o tempo para 20s (Vercel local aguenta)
                    signal: AbortSignal.timeout(20000)
                });
                if (res.ok) {
                    const buf = Buffer.from(await res.arrayBuffer());
                    if (isValid(buf)) {
                        return NextResponse.json({ base64: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'Flux (Stable)' });
                    }
                }
            } catch (e) { console.log("[G15] HF Skip."); }
        }

        // PRIORIDADE 3: EMERGENCY (INSTANT) - SEM DELAY
        try {
            console.log("[G15] Trying Emergency...");
            const seed = Math.floor(Math.random() * 999999);
            const url = `https://pollinations.ai/p/${encodeURIComponent(prompt.substring(0, 500))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (isValid(buf)) {
                    return NextResponse.json({ base64: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'Instant (Bypass)' });
                }
            }
        } catch (e) { console.log("[G15] Emergency Fail."); }

        return NextResponse.json({ error: "All engines exhausted" }, { status: 504 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
