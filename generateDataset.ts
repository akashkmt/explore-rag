import fs from "fs";
import pLimit from "p-limit";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser } from "puppeteer";

type Resource = {
  id: string;
  name: string;
  url: string;
  category: string;
};

type DatasetItem = {
  pageContent: string | null;
  metadata: {
    id: string;
    name: string;
    url: string;
    category: string;
  };
};

const getPageContent = async (browser: Browser, url: string) => {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    return await page.content();
  } finally {
    await page.close();
  }
};

const main = async () => {
  fs.mkdirSync("./dataset/pageContent", { recursive: true });

  const resourcesJson = fs.readFileSync("sources.json", "utf8");
  const resources = JSON.parse(resourcesJson) as Resource[];
  console.log(`Found ${resources.length} resources to scrape.`);

  const limit = pLimit(10);
  const browser = await puppeteer.use(StealthPlugin()).launch();
  const dataset: DatasetItem[] = [];

  const promises = resources.map((resource, i) =>
    limit(async () => {
      try {
        const html = await getPageContent(browser as Browser, resource.url);
        const filePath = `./dataset/pageContent/${resource.id}.html`;
        fs.writeFileSync(filePath, html);
        dataset.push({ pageContent: filePath, metadata: resource });
        console.log(`[${i + 1}/${resources.length}] done: ${resource.url}`);
      } catch (err: any) {
        dataset.push({ pageContent: null, metadata: resource });
        console.log(
          `[${i + 1}/${resources.length}] failed (metadata-only): ${resource.url} - ${err.message}`,
        );
      }
    }),
  );

  await Promise.all(promises);
  await (browser as Browser).close();

  fs.writeFileSync("./dataset/index.json", JSON.stringify(dataset, null, 2));
  console.log(
    `Dataset saved: ${dataset.length} entries in ./dataset/index.json`,
  );
};

main()
  .then(() => console.log("Done."))
  .catch(console.error);
