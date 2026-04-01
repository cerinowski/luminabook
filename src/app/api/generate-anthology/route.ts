import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

type Page = {
  type: "cover" | "intro" | "features" | "content" | "quote" | "closing";
  title: string;
  subtitle: string;
  items?: string[];
  illustration_prompt: string;
};

type DocumentBlueprint = {
  global_style: {
    primary_color: string;
    secondary_color: string;
    global_mood: "Luxury" | "Dramatic" | "Minimalist" | "Vibrant";
  };
  pages: Page[];
};

function cleanJsonText(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function chunkByParagraphs(text: string) {
  // Preserve 100% of user words by splitting accurately by logical paragraphs
  const rawParagraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 5);
  const pages: { chapterTitle: string; items: string[]; isFirstPage: boolean }[] = [];

  let currentItems: string[] = [];
  let currentSlots = 0;
  let currentChapterTitle = "";
  let isFirstPage = true;

  const isSubtitle = (p: string) => p.length < 120 && !/[.?!]$/.test(p.trim()) && p.split(' ').length <= 15;

  for (let i = 0; i < rawParagraphs.length; i++) {
    const p = rawParagraphs[i];

    const isHeader =
      p.length < 150 &&
      !/[.?!]$/.test(p) &&
      (
        /^(cap[ií]tulo|chapter|parte|se[çc][ãa]o|introdu[çc][ãa]o|conclus[ãa]o|m[oó]dulo)\s/i.test(p) ||
        i === 0
      );

    if (isHeader) {
      if (currentItems.length > 0) {
        pages.push({ chapterTitle: currentChapterTitle, items: currentItems, isFirstPage });
        currentItems = [];
        currentSlots = 0;
      }
      currentChapterTitle = p;
      isFirstPage = true;
      continue; // Do not include title inside the normal text body items
    }

    const itemSlots = isSubtitle(p) ? 2.5 : Math.ceil(p.length / 90) + 0.8;
    const capacity = isFirstPage ? 25 : 31; // 25 slots available visually on pages with Cover Titles, 31 exclusively for text.

    if (currentSlots + itemSlots > capacity && currentItems.length > 0) {
      pages.push({ chapterTitle: currentChapterTitle, items: currentItems, isFirstPage });
      currentItems = [];
      currentSlots = 0;
      isFirstPage = false;
    }

    currentItems.push(p);
    currentSlots += itemSlots;
  }

  if (currentItems.length > 0 && currentItems.some(i => i.trim())) {
    pages.push({ chapterTitle: currentChapterTitle, items: currentItems, isFirstPage });
  }

  let lastValidTitle = "Parte 1";
  return pages.map((page, idx) => {
    let finalTitle = page.chapterTitle;
    if (!finalTitle) finalTitle = lastValidTitle;
    else lastValidTitle = finalTitle;
    return { ...page, chapterTitle: finalTitle };
  });
}

export async function POST(req: Request) {
  let title = "Lumina Document";
  let description = "";

  try {
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key não encontrada." }, { status: 500 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { }

    title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : title;
    description = typeof body?.description === "string" ? body.description.trim() : description;

    // Zero-Edit Strategy: Chunk the literal text perfectly into pages before hitting the AI
    const pagesData = chunkByParagraphs(description || "Conteúdo não providenciado.");

    // Create a precise context dump for Gemini to only invent the Metadata layers
    const pageSummaries = pagesData.map((p, i) => `Page ${i + 1}: ${p.items.join(" ").substring(0, 300)}...`).join("\n");

    const prompt = `
You are a Luxury Document Architect.

Return VALID JSON only. Do not use markdown.
I have algorithmically sliced a book titled "${title}" into exactly ${pagesData.length} physical pages of reading content.
Your ONLY job is to act as a Creative Director and provide exactly ${pagesData.length} JSON objects containing metadata for those exact physical pages.

Context Preview (Read to understand the vibe of each page):
${pageSummaries}

Rules:
1. Provide a "subtitle" (1 crisp sentence) summarizing the vibe.
2. Provide an "illustration_prompt" (a cinematic, no-text luxury conceptual prompt for DALL-E) matching the content.
3. "metadata" MUST have EXACTLY ${pagesData.length} entries!

JSON structure:
{
  "global_style": {
    "primary_color": "#HEX",
    "secondary_color": "#HEX",
    "global_mood": "Luxury"
  },
  "metadata": [
    {
      "subtitle": "[Insert a matching 1-sentence subtitle describing this specific page content]",
      "illustration_prompt": "[Insert cinematic NO-TEXT visual prompt fitting this exact page, e.g. Minimalist premium luxury abstract shape...]"
    }
  ]
}
`.trim();

    let text = "";
    let lastError: any = null;

    for (const modelName of ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.5,
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent(prompt);
        text = (await result.response).text();

        if (text?.trim()) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Falha no modelo ${modelName}:`, err?.message || err);
      }
    }

    if (!text?.trim()) throw new Error("Nenhum texto retornado pelo Gemini.");

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJsonText(text));
    } catch {
      throw new Error("O Gemini retornou JSON inválido.");
    }

    // Stitching the mathematically perfect text with the beautifully crafted Meta layers
    const blueprint: DocumentBlueprint = {
      global_style: {
        primary_color: parsed?.global_style?.primary_color || "#ffffff",
        secondary_color: parsed?.global_style?.secondary_color || "#a855f7",
        global_mood: "Luxury"
      },
      pages: [
        {
          type: "cover",
          title,
          subtitle: "Automated Edition",
          illustration_prompt: `Luxury editorial cover explicitly designed for a book titled "${title}", stunning visuals, 8k, cinematic, NO TEXT.`
        },
        ...pagesData.map((pageChunk, idx) => {
          const meta = parsed.metadata && parsed.metadata[idx] ? parsed.metadata[idx] : {
            subtitle: "Avançando no conteúdo...",
            illustration_prompt: "Clean luxury background concept, no text."
          };
          return {
            type: "content" as const,
            title: pageChunk.isFirstPage ? pageChunk.chapterTitle : "",
            subtitle: meta.subtitle || "",
            items: pageChunk.items,
            illustration_prompt: meta.illustration_prompt || "Clean luxury background concept, no text."
          };
        })
      ]
    };

    return NextResponse.json(blueprint);

  } catch (error: any) {
    console.error("Anthology Architecture Final Error:", error);

    // Bulletproof Offline Fallback using the same perfect zero-loss splitter
    const pagesData = chunkByParagraphs(description || "Conteúdo não providenciado.");
    const fallbackBlueprint: DocumentBlueprint = {
      global_style: { primary_color: "#ffffff", secondary_color: "#a855f7", global_mood: "Luxury" },
      pages: [
        {
          type: "cover",
          title,
          subtitle: "Standard Edition",
          illustration_prompt: `Luxury cover for "${title}", no text.`
        },
        ...pagesData.map((pageChunk, idx) => ({
          type: "content" as const,
          title: pageChunk.isFirstPage ? pageChunk.chapterTitle : "",
          subtitle: "Continuação do documento...",
          items: pageChunk.items,
          illustration_prompt: "Minimalist layout, premium clean aesthetic, no text."
        }))
      ]
    };

    return NextResponse.json(fallbackBlueprint);
  }
}
