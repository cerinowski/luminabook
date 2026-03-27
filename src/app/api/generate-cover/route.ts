import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import OpenAI from "openai";

export const maxDuration = 30;

function buildPlaceholder(title: string) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#050510;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a1a3a;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="45%" text-anchor="middle" fill="#6366f1" font-weight="900" font-size="60" font-family="Montserrat, Arial, sans-serif" opacity="0.5">LUMINA</text>
        <text x="50%" y="52%" text-anchor="middle" fill="#ffffff" font-weight="900" font-size="44" font-family="Montserrat, Arial, sans-serif">ARTE EM PROCESSAMENTO</text>
        <text x="50%" y="58%" text-anchor="middle" fill="#ffffff" font-size="24" font-family="Montserrat, Arial, sans-serif" opacity="0.3">${title.substring(0, 50).toUpperCase()}</text>
        <rect x="256" y="650" width="512" height="4" fill="#ffffff" opacity="0.1" rx="2" />
      </svg>
    `.trim();
    const b64 = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${b64}`;
}

const isValidImage = (buffer: Buffer) => {
    if (!buffer || buffer.length < 3000) return false;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    return isPng || isJpeg;
};

export async function POST(req: Request) {
    let currentTitle = "Capas Lumina";
    let lastError = "Nenhum erro registrado";
    try {
        const { prompt, title, model: requestedModel } = await req.json();
        currentTitle = title || "Capas Lumina";

        const geminiKey = (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim()?.replace(/["']/g, "");
        const openAIKey = process.env.OPENAI_API_KEY?.trim()?.replace(/["']/g, "");

        console.log(`--- G26 IRON ENGINE [DEBUG] ---`);
        console.log(`OpenAI Key: ${openAIKey ? 'Present' : 'MISSING'}`);
        console.log(`Gemini Key: ${geminiKey ? 'Present' : 'MISSING'}`);

        // STAGE 1: DALL-E 3
        if (openAIKey && (requestedModel === 'dalle' || !requestedModel || requestedModel === 'auto')) {
            try {
                const openai = new OpenAI({ apiKey: openAIKey });
                const response = await openai.images.generate({
                    model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "b64_json"
                });
                if (response.data?.[0]?.b64_json) {
                    return NextResponse.json({ ok: true, image: `data:image/png;base64,${response.data[0].b64_json}`, engine: 'DALL-E 3' });
                }
            } catch (e: any) {
                lastError = `OpenAI: ${e.message}`;
                console.error(`[OPENAI] ${e.message}`);
            }
        } else if (!openAIKey) {
            lastError = "OpenAI Key Missing";
        }

        // STAGE 2: GEMINI
        if (geminiKey && (requestedModel === 'gemini' || !requestedModel || requestedModel === 'auto')) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
                const result = await model.generateContent(prompt);
                const b64 = result.response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
                if (b64) {
                    return NextResponse.json({ ok: true, image: `data:image/png;base64,${b64}`, engine: 'Gemini' });
                }
            } catch (e: any) {
                lastError = `Gemini: ${e.message}`;
                console.error(`[GEMINI] ${e.message}`);
            }
        } else if (!geminiKey) {
            lastError = lastError.includes("OpenAI") ? "Both Keys Missing" : "Gemini Key Missing";
        }

        // STAGE 3: POLLINATIONS (Server-Side)
        try {
            const url = `https://pollinations.ai/p/${encodeURIComponent(prompt.substring(0, 300))}?width=1024&height=1024&seed=${Math.floor(Math.random() * 999999)}&model=flux&nologo=true`;
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (isValidImage(buf)) {
                    return NextResponse.json({ ok: true, image: `data:image/jpeg;base64,${buf.toString('base64')}`, engine: 'Server Relay' });
                }
            } else {
                lastError = `Relay Status: ${res.status}`;
            }
        } catch (e: any) {
            lastError = `Pollinations: ${e.message}`;
            console.error(`[POLLINATIONS] ${e.message}`);
        }

        // STAGE 4: PLACEHOLDER
        return NextResponse.json({
            ok: true,
            image: buildPlaceholder(currentTitle),
            engine: `Safety: ${lastError.substring(0, 30)}`
        });

    } catch (error: any) {
        console.error(`[FATAL] ${error.message}`);
        return NextResponse.json({
            ok: true,
            image: buildPlaceholder(currentTitle),
            engine: `Fatal: ${error.message.substring(0, 20)}`
        });
    }
}
