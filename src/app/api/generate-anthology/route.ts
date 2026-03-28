import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 2000,
        responseMimeType: "application/json"
      }
    });

    const prompt = `You are a Luxury Document Architect. 
        Diagram a high-end, multi-page A4 document based on:
        Title: "${title}"
        Description: "${description}"

        Rules:
        1. Create 3 to 6 pages. First MUST be "cover".
        2. Others: "intro", "features", "content", "quote", "closing".
        3. illustration_prompt: High-definition, NO-TEXT, descriptive visual for DALL-E 3.
        4. global_mood: One word (Luxury, Dramatic, Minimalist, Vibrant).
        5. RETURN VALID JSON ONLY. No markdown.

        JSON structure:
        {
          "global_style": { "primary_color": "#HEX", "secondary_color": "#HEX", "global_mood": "..." },
          "pages": [
            { "type": "cover", "title": "...", "subtitle": "...", "illustration_prompt": "..." }
          ]
        }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Anthology Architecture Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
