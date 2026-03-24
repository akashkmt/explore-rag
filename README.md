# explore-rag

A small ingestion pipeline that builds a resource dataset from web links, summarizes each page with Gemini, and stores searchable text in Upstash Vector.

## What it does

This project runs in three stages for testing with local `sources.json`:

1. Scrape each resource URL from `sources.json` and store raw HTML + dataset metadata under `dataset/`.
2. Generate a summary for each page and upsert it into Upstash Vector.
3. Query the vector index for relevant resources.

## Installation

```bash
pnpm install
```

## Environment variables

Create a `.env` file in the project root:

```env
# Gemini
GEMINI_API_KEY=your_gemini_api_key

# Upstash Vector
UPSTASH_VECTOR_REST_URL=your_upstash_vector_rest_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_rest_token
```

## Run the pipeline

Run commands in this order:

```bash
# Make sure Chromium is installed for Puppeteer before scraping
pnpx puppeteer browsers install chrome

# 1) Scrape pages from sources.json and build dataset/index.json + dataset/pageContent/*.html
pnpm generate-dataset

# 2) Summarize page content and upsert into Upstash Vector
pnpm generate-summary

# 3) Query vectors (pass your search text)
pnpm query-vectors "react authentication guide"
```

## Scripts

- `pnpm generate-dataset` -> runs `tsx generateDataset.ts`
- `pnpm generate-summary` -> runs `tsx generateSummary.ts`
- `pnpm query-vectors "<your query>"` -> runs `tsx queryVectors.ts`

## Data outputs

- `dataset/index.json` - dataset entries with metadata + pageContent path/null
- `dataset/pageContent/*.html` - scraped HTML pages

`dataset/` is ignored by git and should be regenerated when needed.

## Notes

- For this testing flow, keep your links in `sources.json`; `generate-sources` is not required.
- Some URLs may fail to scrape; those entries are still kept with metadata-only fallback.
- Summarization handles Gemini 429 rate limits by waiting and retrying.
- Optional: set `TOP_K` in `.env` to control how many query matches are returned (default `5`).
