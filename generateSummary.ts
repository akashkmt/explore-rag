import { GoogleGenAI } from "@google/genai";
import { Index } from "@upstash/vector";
import fs from "node:fs/promises";
import dotenv from "dotenv";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

dotenv.config();

type FlatResource = {
  id: string;
  name: string;
  url: string;
  category: string;
};

type DatasetItem = {
  pageContent: string | null;
  metadata: FlatResource;
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SUMMARIZE_PROMPT = `Given document is the content of a website. Summarize in a paragraph what the website is useful for to someone. This summary will be stored in a vector db and you should be able to retrieve it.`;

const buildSummaryPrefix = (resource: FlatResource) =>
  `"${resource.name}" in "${resource.category}" category, available at ${resource.url}. `;

const buildFallbackText = (resource: FlatResource) =>
  `${resource.name} - Available at ${resource.url}. Category: ${resource.category}.`;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const main = async () => {
  const data = await fs.readFile("./dataset/index.json", "utf-8");
  const pages = JSON.parse(data) as DatasetItem[];
  console.log("Pages count:", pages.length);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    let textToIndex: string;

    if (page.pageContent) {
      const pageContent = await fs.readFile(page.pageContent, "utf-8");

      let response;
      while (!response) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              { text: SUMMARIZE_PROMPT },
              {
                inlineData: {
                  mimeType: "text/html",
                  data: Buffer.from(pageContent).toString("base64"),
                },
              },
            ],
          });
        } catch (error: unknown) {
          const err = error as Error;
          if (err.message?.includes("429")) {
            console.log("Rate limited, sleeping 60s...");
            await sleep(60_000);
          } else {
            console.log(
              `Summarization failed for ${page.metadata.name}: ${err.message}`,
            );
            break;
          }
        }
      }

      textToIndex = response?.text
        ? buildSummaryPrefix(page.metadata) + response.text
        : buildFallbackText(page.metadata);
    } else {
      textToIndex = buildFallbackText(page.metadata);
    }

    console.log(`[${i + 1}/${pages.length}] Indexing: ${page.metadata.name}`);

    await index.upsert({
      id: page.metadata.id,
      data: textToIndex,
      metadata: {
        name: page.metadata.name,
        url: page.metadata.url,
        category: page.metadata.category,
      },
    });
  }

  await sleep(2000);
  console.log("Indexing complete.");
};

console.log("Starting summarize & index...");
main()
  .then(() => console.log("Done."))
  .catch(console.error);
