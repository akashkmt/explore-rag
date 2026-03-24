import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

type ResourceNode = {
  name?: string;
  link?: string;
  children?: Record<string, ResourceNode>;
};

type FlatResource = {
  id: string;
  name: string;
  url: string;
  category: string;
};

const flattenResources = (
  node: Record<string, ResourceNode>,
  path: string[] = [],
): FlatResource[] => {
  const results: FlatResource[] = [];

  for (const [key, value] of Object.entries(node)) {
    const currentPath = [...path, value.name || key];

    if (value.link) {
      results.push({
        id: key,
        name: value.name || key,
        url: value.link,
        category: currentPath.slice(0, -1).join(" > "),
      });
    }

    if (value.children) {
      results.push(...flattenResources(value.children, currentPath));
    }
  }

  return results;
};

const fetchResources = async (): Promise<Record<string, ResourceNode>> => {
  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.RESOURCE_REPO}/contents/portfolio-resources.json`,
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`,
        Accept: "application/vnd.github.v3.raw",
      },
    },
  );

  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  return response.json();
};

const main = async () => {
  console.log("Starting: Fetching resources from GitHub...");
  const resources = await fetchResources();
  const flat = flattenResources(resources);
  console.log("Finished: Fetching resources from GitHub...");

  console.log("Writing sources to resources.json");
  fs.writeFileSync("resources.json", JSON.stringify(flat, null, 2));
  console.log(`Written ${flat.length} resources to resources.json`);
};

main()
  .then(() => console.log("Done."))
  .catch(console.error);
