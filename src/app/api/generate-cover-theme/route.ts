import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    let title = "";
    let description = "";
    try {
        const body = await req.json();
        title = body.title;
        description = body.description;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
            }
        });

        const prompt = `You are a Luxury Book Cover Designer. 
    Based on the title: "${title || 'Untitled'}" and description: "${description || 'Surprise me with something elegant'}", 
    create a high-end visual theme.
    
    Rules:
    1. Colors: Highly sophisticated, designer palettes (e.g. Sage & Teracotta, Midnight & Gold).
    2. image_generation_prompt: CREATE A VISUAL METAPHOR FOR THE TITLE.
       - NEVER SHOW A BOOK OR A EBOOK IN THE IMAGE. 
       - If it's about Health/Gut: show "Vibrant organic botanical patterns, glowing microscopic ecosystems, or fresh macro photography of vital ingredients."
       - If it's about Fitness: show "Dynamic abstract energy flow, stone/marble textures, or human vitality motifs."
       - If it's about Finance: show "Modern steel architecture, geometric growth patterns, or glass textures."
    3. Style: HIGHLY REALISTIC or REFINED EDITORIAL ILLUSTRATION. 8k, professional photography.
    4. NO TEXT in the image. Pure background art only.
    5. Clean the title (no colons).

    JSON Format:
    {
      "title": "${title}",
      "primary_color": "#HEX",
      "secondary_color": "#HEX",
      "image_generation_prompt": "A high-end book cover using a visual metaphor for ${title}, specifically [Detailed Metaphor], 8k, professional, UNIFORM BACKGROUND, NO TEXT",
      "design_mood": "Short mood description"
    }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) throw new Error("JSON_NOT_FOUND");
        const theme = JSON.parse(jsonMatch[0]);
        theme.title = title || theme.title;

        console.log("SUCCESSFUL THEME GENERATED:", theme); // DEBUG

        return NextResponse.json(theme);
    } catch (error: any) {
        console.error("Cover Theme Error:", error);
        return NextResponse.json({
            title: title || "Título Luxo",
            primary_color: "#1a1830",
            secondary_color: "#E93DE5",
            image_generation_prompt: `A professional luxury book cover background, premium abstract textures, 8k, professional photography, NO TEXT`,
            design_mood: "Elegant Default"
        });
    }
}
