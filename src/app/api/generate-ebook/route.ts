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

  // Basic Title Extraction - Take the full first line
  const lines = content.split('\n').filter(l => l.trim());
  const title = lines[0]?.replace(/[#*]/g, '').trim().slice(0, 150) || "Seu Novo eBook";

  // Rule-based Chapter Splitting
  const chapterMarkers = /(?:Capítulo|Módulo|Parte|#)\s*\d+|(?:\n\n(?=[A-Z][^a-z]{5,}))/g;
  const rawChapters = content.split(chapterMarkers).filter(c => c.length > 50);

  const chapters = rawChapters.length > 0 ? rawChapters.map((text, i) => ({
    title: text.split('\n')[0].trim().slice(0, 50) || `Capítulo ${i + 1}`,
    content: text.trim(),
    chapter_image_prompt: `Abstract editorial illustration about ${text.split('\n')[0].trim().slice(0, 30)}`
  })) : [{
    title: "Introdução e Conteúdo Principal",
    content: content,
    chapter_image_prompt: "Abstract editorial illustration of knowledge and growth"
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
    subtitle: "O guia prático para transformação e conhecimento",
    author_name: "Premium Editorial Series",
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
    const { content, approvedTitle, approvedTheme, approvedAuthor } = await req.json();

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
          1. Keep all core content and organize gracefully into chapters. Do not uppercase entire sentences, do not use weird formatting or drop caps, keep text natural and readable.
          2. ${approvedTheme ? 'IMPORTANT: Use the approved visual theme and prompt provided below.' : "CRITICAL: For each chapter, you must include a 'chapter_image_prompt'. This prompt MUST BE for HIGHLY REALISTIC PHOTOGRAPHY."} ALWAYS maintain strict logical realism (e.g., do NOT put floating internal organs next to wine glasses or food). If the topic is medical/biological, use either a realistic scientific style or a lifestyle scene of a healthy person, NEVER bizarre surrealism or floating body parts.
          3. DESIGN SPEC: You are a Master Book Layout Designer for a luxury publisher.
          4. COLORS: ${approvedTheme ? `Use PRIMARY: ${approvedTheme.primary_color} and SECONDARY: ${approvedTheme.secondary_color}` : "Choose a SOPHISTICATED, HIGH-CONTRAST pair that matches the cover content/theme. CRITICAL: MUST provide perfectly valid #HEX codes for both."}
          5. METADATA: ${approvedTitle ? `The Title is: "${approvedTitle}"` : "Derive a catchy 'subtitle' (5-7 words) and a professional 'author_name' (or use a pseudonym)."}
          6. TITLES: Do NOT prefix chapter titles with colons (':') or 'Chapter X:'. Write clean, direct titles.

          JSON Format: { 
            "title": "${approvedTitle || '...'}", 
            "subtitle": "...", 
            "author_name": "...",
            "chapters": [{ "title": "...", "content": "...", "chapter_image_prompt": "..." }], 
            "visual_theme": { 
              "primary_color": "${approvedTheme?.primary_color || '#HEX'}", 
              "secondary_color": "${approvedTheme?.secondary_color || '#HEX'}", 
              "layout_type": "luxury_editorial", 
              "image_generation_prompt": "${approvedTheme?.image_generation_prompt || 'Visual description here...'}",
              "design_mood": "${approvedTheme?.design_mood || '...'}" 
            } 
          }
          
          Text: ${content}`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("JSON_NOT_FOUND");

          ebookData = JSON.parse(jsonMatch[0]);
          if (ebookData) {
            break;
          }
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

    // UNIVERSAL SANITIZATION: Clear specific prefixes from any source (AI or Fallback)
    if (ebookData) {
      const clean = (text: string) => {
        if (!text) return text;
        return text
          .replace(/^(Título|Title|Capítulo|Chapter|Módulo|Módulo|Parte|Ebook|E-book)\s*(\d+|\w+)?:\s*/i, '') // Remove prefixes like "Title: " or "Chapter 1: "
          .replace(/[:"']/g, '') // Remove actual colons and quotes anywhere
          .trim();
      };

      if (ebookData.title) ebookData.title = clean(ebookData.title);
      if (ebookData.chapters) {
        ebookData.chapters.forEach((c: any) => {
          if (c.title) c.title = clean(c.title);
        });
      }
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
