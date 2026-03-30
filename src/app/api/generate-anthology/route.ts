import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey =
  process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

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

function normalizePage(page: any): Page {
  return {
    type: ["cover", "intro", "features", "content", "quote", "closing"].includes(page?.type)
      ? page.type
      : "content",
    title: typeof page?.title === "string" ? page.title : "Untitled",
    subtitle:
      typeof page?.subtitle === "string"
        ? page.subtitle
        : typeof page?.content === "string"
          ? page.content
          : "",
    items: Array.isArray(page?.items) ? page.items : [],
    illustration_prompt:
      typeof page?.illustration_prompt === "string"
        ? page.illustration_prompt
        : "Minimalist high-end editorial illustration, no text",
  };
}

function ensureMinimumPages(data: any, title: string, description: string): DocumentBlueprint {
  const safe: DocumentBlueprint = {
    global_style: {
      primary_color:
        typeof data?.global_style?.primary_color === "string"
          ? data.global_style.primary_color
          : "#6366f1",
      secondary_color:
        typeof data?.global_style?.secondary_color === "string"
          ? data.global_style.secondary_color
          : "#a855f7",
      global_mood:
        ["Luxury", "Dramatic", "Minimalist", "Vibrant"].includes(data?.global_style?.global_mood)
          ? data.global_style.global_mood
          : "Luxury",
    },
    pages: Array.isArray(data?.pages) ? data.pages.map(normalizePage) : [],
  };

  if (safe.pages.length === 0) {
    safe.pages = [
      {
        type: "cover",
        title,
        subtitle: "Automated Blueprint",
        illustration_prompt: `Luxury editorial cover image for "${title}", no text, premium composition, highly detailed.`,
      },
      {
        type: "intro",
        title: "Introdução",
        subtitle: description || "Apresentação inicial do conteúdo.",
        illustration_prompt: "Clean premium editorial abstract composition, no text.",
      },
      {
        type: "features",
        title: "Destaques",
        subtitle: "Principais pontos do material.",
        illustration_prompt: "Sophisticated geometric premium layout concept, no text.",
      },
      {
        type: "closing",
        title: "Encerramento",
        subtitle: "Síntese final do documento.",
        illustration_prompt: "Elegant luxury ending page visual, no text.",
      },
    ];
  }

  while (safe.pages.length < 4) {
    safe.pages.push({
      type: "content",
      title: `Conteúdo ${safe.pages.length}`,
      subtitle: "Página complementar gerada automaticamente.",
      illustration_prompt: "Minimalist luxury editorial visual, no text.",
    });
  }

  safe.pages = safe.pages.slice(0, 6);

  if (safe.pages[0]?.type !== "cover") {
    safe.pages.unshift({
      type: "cover",
      title,
      subtitle: "Premium Cover",
      illustration_prompt: `Luxury book cover for "${title}", no text, high-end editorial look.`,
    });
    safe.pages = safe.pages.slice(0, 6);
  }

  return safe;
}

export async function POST(req: Request) {
  let title = "Lumina Document";
  let description = "";

  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key não encontrada." },
        { status: 500 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    title = typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : title;

    description = typeof body?.description === "string"
      ? body.description.trim()
      : description;

    const prompt = `
You are a Luxury Document Architect.

Return VALID JSON only.
Do not use markdown.
Do not wrap the response in code fences.

Create a premium multi-page A4 blueprint based on:
Title: "${title}"
Description: "${description}"

Rules:
1. Create exactly 4 pages.
2. The first page must be "cover".
3. The remaining pages must be selected from: "intro", "features", "content", "quote", "closing".
4. Every page must include exactly these fields:
   - type
   - title
   - subtitle
   - items (Array of strings, e.g. bullet points of actual content. Critical for non-cover pages)
   - illustration_prompt
5. illustration_prompt must describe a NO-TEXT premium visual suitable for an image generator.
6. global_mood must be one of: Luxury, Dramatic, Minimalist, Vibrant.

JSON structure:
{
  "global_style": {
    "primary_color": "#HEX",
    "secondary_color": "#HEX",
    "global_mood": "Luxury"
  },
  "pages": [
    {
      "type": "cover",
      "title": "string",
      "subtitle": "string",
      "illustration_prompt": "string"
    }
  ]
}
`.trim();

    let text = "";
    let lastError: any = null;

    for (const modelName of ["gemini-2.0-flash", "gemini-1.5-flash"]) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2000,
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

    if (!text?.trim()) {
      throw new Error(lastError?.message || "Nenhum texto retornado pelo Gemini.");
    }

    const cleaned = cleanJsonText(text);

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON inválido retornado pelo Gemini:", cleaned);
      throw new Error("O Gemini retornou JSON inválido.");
    }

    const normalized = ensureMinimumPages(parsed, title, description);

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error("Anthology Architecture Final Error:", error);

    const fallback = ensureMinimumPages(
      null,
      title || "Lumina",
      description || "Explore o conteúdo desta antologia dinâmica."
    );

    return NextResponse.json(fallback);
  }
}
