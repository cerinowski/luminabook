import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const maxDuration = 60;

// VALIDAÇÃO FERROVIÁRIA G18 - PADRÃO SAAS PROFISSIONAL
const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 30000) return false; // Book cover HD > 30KB

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;

    return isPng || isJpeg;
};

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();
        const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();

        if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

        console.log('--- NANO BANANA G18 IRON PIXEL START ---');

        // PRIORIDADE 1: GEMINI IMAGEN 3 (ELITE)
        if (geminiKey) {
            try {
                console.log("[G18] Trying Gemini...");
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
                const result = await model.generateContent(prompt);

                const candidates = result.response.candidates;
                if (candidates && candidates[0]?.content?.parts[0]?.inlineData) {
                    const b64 = candidates[0].content.parts[0].inlineData.data;
                    const buf = Buffer.from(b64, 'base64');
                    if (isValidImage(buf)) {
                        console.log("[G18] Gemini Success:", buf.length, "bytes");
                        return NextResponse.json({
                            base64: `data:image/png;base64,${b64}`,
                            engine: 'Gemini (Elite)',
                            size: buf.length
                        });
                    }
                }
            } catch (e: any) { console.error("[G18] Gemini Error:", e?.message); }
        }

        // PRIORIDADE 2: HF FLUX (STABLE)
        if (hfKey) {
            try {
                console.log("[G18] Trying HF Flux...");
                const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                    headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                    method: "POST", body: JSON.stringify({ inputs: prompt }),
                    signal: AbortSignal.timeout(20000)
                });

                const contentType = hfRes.headers.get("content-type") || "";
                if (hfRes.ok && contentType.startsWith("image/")) {
                    const buf = Buffer.from(await hfRes.arrayBuffer());
                    if (isValidImage(buf)) {
                        console.log("[G18] HF Success:", buf.length, "bytes");
                        return NextResponse.json({
                            base64: `data:image/jpeg;base64,${buf.toString('base64')}`,
                            engine: 'Flux (Stable)',
                            size: buf.length
                        });
                    }
                } else {
                    console.error("[G18] HF Rejeitado. Content-Type:", contentType);
                }
            } catch (e: any) { console.error("[G18] HF Error:", e?.message); }
        }

        // PRIORIDADE 3: EMERGENCY (PROVISIONADO)
        try {
            console.log("[G18] Trying Emergency...");
            const seed = Math.floor(Math.random() * 999999);
            const url = `https://pollinations.ai/p/${encodeURIComponent(prompt.substring(0, 500))}?width=800&height=1200&seed=${seed}&model=flux&nologo=true`;
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.startsWith("image/")) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (isValidImage(buf)) {
                    return NextResponse.json({
                        base64: `data:image/jpeg;base64,${buf.toString('base64')}`,
                        engine: 'Bypass (Validated)',
                        size: buf.length
                    });
                }
            }
        } catch (e: any) { console.error("[G18] Emergency Error:", e?.message); }

        return NextResponse.json({ error: "All engines exhausted or returned invalid data" }, { status: 504 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
