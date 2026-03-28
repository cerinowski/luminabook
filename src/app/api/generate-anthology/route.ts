import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  let title = "Lumina Document";
  let description = "";
  try {
    const body = await req.json();
    title = body.title || title;
    description = body.description || description;

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

    let text = "";

    // TRY GEMINI 2.0 FLASH
    try {
      const model20 = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 1, maxOutputTokens: 2000, responseMimeType: "application/json" }
      });
      const result = await model20.generateContent(prompt);
      text = (await result.response).text();
    } catch (e20: any) {
      console.warn("Gemini 2.0 Failed, retrying 1.5...", e20.message);
      // TRY GEMINI 1.5 FLASH
      const model15 = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 1, maxOutputTokens: 2000, responseMimeType: "application/json" }
      });
      const result = await model15.generateContent(prompt);
      text = (await result.response).text();
    }

    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Anthology Architecture Final Error:", error);
    // FALLBACK HARDCODED (SEGURANÇA TOTAL)
    return NextResponse.json({
      global_style: { primary_color: "#6366f1", secondary_color: "#a855f7", global_mood: "Luxury" },
      pages: [
        { type: "cover", title: title || "Lumina", subtitle: "Automated Blueprint", illustration_prompt: `A high-end conceptual visual for ${title}` },
        { type: "intro", title: "Introdução", content: description || "Explore o conteúdo desta antologia dinâmica.", illustration_prompt: "Minimalist geometric patterns" }
      ]
    });
  }
}
