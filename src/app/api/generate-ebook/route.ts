import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60; // Previne Vercel Timeout 504

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

const MODELS_TO_TRY = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite-preview-02-05",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function generateFallbackEbook(content: string) {
  console.log("Fallback Mode Activated: Manually structuring content...");

  // Basic Title Extraction
  const lines = content.split('\n').filter(l => l.trim());
  const title = lines[0]?.slice(0, 80) || "Seu Novo eBook";

  // Rule-based Chapter Splitting
  // Look for "Capítulo", "Módulo", "Parte" or just large blocks
  const chapterMarkers = /(?:Capítulo|Módulo|Parte|#)\s*\d+|(?:\n\n(?=[A-Z][^a-z]{5,}))/g;
  const rawChapters = content.split(chapterMarkers).filter(c => c.length > 50);

  const chapters = rawChapters.length > 0 ? rawChapters.map((text, i) => ({
    title: text.split('\n')[0].trim().slice(0, 50) || `Capítulo ${i + 1}`,
    content: text.trim()
  })) : [{
    title: "Introdução e Conteúdo Principal",
    content: content
  }];

  // Keyword extraction for image (naive but effective)
  const commonWords = ["o", "a", "de", "do", "da", "em", "um", "para", "com", "é", "que"];
  const keywords = content.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4 && !commonWords.includes(w))
    .slice(0, 5)
    .join(", ");

  const paletes = [
    { primary: "#1a1830", secondary: "#E93DE5", mood: "Midnight Luxury" },
    { primary: "#0a2e15", secondary: "#2ecc71", mood: "Forest Clinical" },
    { primary: "#2c0a0a", secondary: "#e74c3c", mood: "Crimson Editorial" },
    { primary: "#0a1a2e", secondary: "#3498db", mood: "Oceanic Tech" },
    { primary: "#1c1c1c", secondary: "#f1c40f", mood: "Sunset Gold" }
  ];
  const palette = paletes[Math.floor(Math.random() * paletes.length)];

  return {
    title: title,
    chapters: chapters,
    visual_theme: {
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      layout_type: "bold_graphic",
      image_generation_prompt: `High-end editorial masterpiece photography of ${keywords || 'abstract concept'}, 8k, cinematic lighting, professional composition`,
      design_mood: palette.mood
    },
    is_fallback: true
  };
}

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    let lastError: any = null;
    let ebookData = null;

    // Dual-Pass Recursive Strategy
    for (let pass = 1; pass <= 2; pass++) {
      for (let i = 0; i < MODELS_TO_TRY.length; i++) {
        const modelName = MODELS_TO_TRY[i];
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: pass === 1 ? 0.35 : 0.75,
              maxOutputTokens: 8192,
            }
          });

          // Compressed Prompt with advanced Creative Direction
          const prompt = `Convert the text into a professional eBook JSON file for a premium publishing studio. 
          Rules:
          1. Keep all core content.
          2. Organize gracefully into chapters.
          3. CRITICAL: For 'image_generation_prompt', act as a master Book Graphic Designer. Analyze the deep theme/mood of the text. Write a 60-70 word highly-detailed prompt (in English) for an AI Image Generator (like Midjourney/Flux) to create the COMPLETELY FINISHED BOOK COVER.
          You MUST include the instruction to render the exact book title typography (e.g., "The title text is EXACTLY 'Your Book Title Here' in elegant typography"). Describe the background, abstract/thematic elements, cinematic lighting, and ensure it uses the chosen 'primary_color' and 'secondary_color'. Focus heavily on editorial, masterpiece, award-winning design aesthetics.
          4. SUPER CRITICAL SAFETY RULE: The 'image_generation_prompt' MUST NEVER contain medical terms (e.g., erectile dysfunction, anatomy), NSFW, violent, or sensitive words. If the book is about a sensitive/medical topic, use ONLY safe, conceptual, metaphorical, and highly elegant abstract descriptions (like "a glowing pillar of light", "restored balance and harmony", "luxury sleek lines"). If you include forbidden words, the image engine will fail.
          5. NO mentions of LumiaBook or Lumia Studio anywhere.

          JSON Format: { "title": "...", "chapters": [{ "title": "...", "content": "..." }], "visual_theme": { "primary_color": "#HEX", "secondary_color": "#HEX", "layout_type": "...", "image_generation_prompt": "... [the full safe midjourney cover prompt here]", "design_mood": "..." } }
          
          Text: ${content}`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("JSON_NOT_FOUND");

          ebookData = JSON.parse(jsonMatch[0]);
          if (ebookData) break;
        } catch (error: any) {
          const errMsg = error.message || String(error);
          if (errMsg.includes("404")) continue;

          lastError = error;
          if (errMsg.includes("429")) {
            await sleep(3000); // 3s backoff
          }
          continue;
        }
      }
      if (ebookData) break;
      if (pass === 1) await sleep(5000);
    }

    // FINAL FAILSAFE: If no AI worked, generate using Fallback Engine
    if (!ebookData) {
      console.warn("AI Generation Failed. Triggering Fallback Engine...");
      ebookData = generateFallbackEbook(content);
    }

    return NextResponse.json(ebookData);
  } catch (error: any) {
    console.error("AI Generation Critical Error:", error.message || error);

    // In case even fallback crashes (unlikely), return a basic object
    const emergencyObject = {
      title: "eBook Profissional",
      chapters: [{ title: "Conteúdo", content: "Erro no processamento. Tente novamente." }],
      visual_theme: { primary_color: "#1c1c1c", secondary_color: "#f1c40f", layout_type: "bold_graphic", image_generation_prompt: "Luxury abstract textures", design_mood: "Emergency Neutral" }
    };

    return NextResponse.json(emergencyObject);
  }
}
