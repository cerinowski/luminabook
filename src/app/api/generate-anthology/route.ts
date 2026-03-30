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
    type: page?.type === "cover" ? "cover" : "content",
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
          type: "content",
          title: "Capítulo 1",
          subtitle: description ? description.substring(0, 60) + "..." : "O início da jornada.",
          items: ["Contexto inicial", "Visão geral do problema", "Primeiros passos"],
          illustration_prompt: "Clean premium editorial abstract composition, no text.",
        },
        {
          type: "content",
          title: "Capítulo 2",
          subtitle: "Aprofundando no desenvolvimento.",
          items: ["Análise detalhada", "Exemplos práticos", "Desenvolvimento teórico"],
          illustration_prompt: "Sophisticated geometric premium layout concept, no text.",
        },
        {
          type: "content",
          title: "Conclusão",
          subtitle: "Considerações finais e próximos passos.",
          items: ["Resumo dos principais pontos", "Direcionamento futuro", "Reflexão final"],
          illustration_prompt: "Elegant luxury ending page visual, no text.",
        },
      ];
    }

    while (safe.pages.length < 4) {
      safe.pages.push({
        type: "content",
        title: `Seção ${safe.pages.length}`,
        subtitle: "Página complementar de conteúdo.",
        items: ["Ponto de destaque 1", "Ponto de destaque 2"],
        illustration_prompt: "Minimalist luxury editorial visual, no text.",
      });
    }

    // Allow up to 10 pages for larger texts
    safe.pages = safe.pages.slice(0, 10);

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

Create a premium multi-page A4 blueprint based entirely on the provided text.
Title: "${title}"
Source Text: "${description}"

Rules:
1. Read the Source Text and logically partition the information into 4 to 8 pages.
2. The first page MUST be of type "cover".
3. ALL subsequent pages MUST be of type "content". They should represent sequential chapters or logical sections from the Source Text.
4. DO NOT dump all the text into a single page. Distribute the information sequentially across multiple pages.
5. Every page MUST include EXACTLY these fields:
   - type ("cover" or "content")
   - title (Section or Chapter title)
   - subtitle (A brief 1-sentence summary of this specific section)
   - items (An array of 3-5 string bullet points extracting the KEY information for this specific section from the Source Text. This is the actual readable content.)
   - illustration_prompt (A NO-TEXT premium visual description suitable for an image generator like DALL-E)
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
