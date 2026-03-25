import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { title, description } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
            }
        });

        const prompt = `You are a Luxury Book Cover Designer. 
    Based on the title: "${title || 'Untitled'}" and the user's description: "${description || 'Surprise me with something elegant'}", 
    create a high-end visual theme.
    
    Rules:
    1. Colors MUST be sophisticated and high-contrast (e.g., Deep Navy + Gold, Charcoal + Emerald).
    2. Provide perfectly valid #HEX codes.
    3. image_generation_prompt must be a PURE visual description, HIGHLY REALISTIC PHOTOGRAPHY. 
    4. NO surrealism, NO floating organs, NO disjointed metaphors. 
    5. Title must be cleaned (no colons).

    JSON Format:
    {
      "title": "Clean Title",
      "primary_color": "#HEX",
      "secondary_color": "#HEX",
      "image_generation_prompt": "A realistic photograph of...",
      "design_mood": "Short mood description"
    }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) throw new Error("JSON_NOT_FOUND");
        const theme = JSON.parse(jsonMatch[0]);

        return NextResponse.json(theme);
    } catch (error: any) {
        console.error("Cover Theme Error:", error);
        return NextResponse.json({
            title: "eBook Premium",
            primary_color: "#1a1830",
            secondary_color: "#E93DE5",
            image_generation_prompt: "Luxury abstract textures, professional photography",
            design_mood: "Elegant Default"
        });
    }
}
