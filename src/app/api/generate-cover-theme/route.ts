import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

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
    1. Colors MUST be sophisticated and high-contrast.
    2. Provide perfectly valid #HEX codes.
    3. image_generation_prompt MUST include specific instructions to write the title "${title}" in the artwork. 
       Example: "A professional book cover with the title '${title}' clearly written in large, elegant, high-contrast typography..."
    4. NO surrealism, NO floating organs. MUST BE PHOTOREALISTIC or high-end illustration.
    5. Ensure the title in the prompt is spelled EXACTLY as "${title}".

    JSON Format:
    {
      "title": "${title}",
      "primary_color": "#HEX",
      "secondary_color": "#HEX",
      "image_generation_prompt": "A professional book cover with the title '${title}' written in...",
      "design_mood": "Short mood description"
    }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) throw new Error("JSON_NOT_FOUND");
        const theme = JSON.parse(jsonMatch[0]);
        theme.title = title || theme.title; // Force user title

        return NextResponse.json(theme);
    } catch (error: any) {
        console.error("Cover Theme Error:", error);
        return NextResponse.json({
            title: title || "Título Luxo",
            primary_color: "#1a1830",
            secondary_color: "#E93DE5",
            image_generation_prompt: `A professional luxury book cover with the title "${title || 'Premium'}" written in elegant, high-contrast typography over a premium abstract background, 8k, professional photography`,
            design_mood: "Elegant Default"
        });
    }
}
