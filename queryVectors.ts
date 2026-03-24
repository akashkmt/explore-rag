import dotenv from "dotenv";
import { Index } from "@upstash/vector";

dotenv.config();

const getArgs = () => {
  const query = process.argv.slice(2).join(" ").trim();
  const topKFromEnv = Number(process.env.TOP_K ?? 5);
  const topK = Number.isFinite(topKFromEnv) && topKFromEnv > 0 ? topKFromEnv : 5;
  return { query, topK };
};

const main = async () => {
  const { query, topK } = getArgs();

  if (!query) {
    console.error('Please provide a query. Example: pnpm query-vectors "react auth middleware"');
    process.exit(1);
  }

  const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  });

  const results = await index.query({
    data: query,
    topK,
    includeMetadata: true,
    includeData: true,
  });

  console.log(`\nTop ${results.length} matches for: "${query}"\n`);

  for (const [i, item] of results.entries()) {
    const name = item.metadata?.name ?? "Unknown";
    const url = item.metadata?.url ?? "N/A";
    const category = item.metadata?.category ?? "N/A";
    const score = typeof item.score === "number" ? item.score.toFixed(4) : "N/A";
    const preview =
      typeof item.data === "string" ? item.data.slice(0, 220).replace(/\s+/g, " ") : "";

    console.log(`#${i + 1} | score: ${score}`);
    console.log(`name: ${name}`);
    console.log(`category: ${category}`);
    console.log(`url: ${url}`);
    if (preview) console.log(`preview: ${preview}${item.data.length > 220 ? "..." : ""}`);
    console.log("");
  }
};

main().catch((error) => {
  const err = error as Error;
  console.error("Query failed:", err.message);
  process.exit(1);
});
