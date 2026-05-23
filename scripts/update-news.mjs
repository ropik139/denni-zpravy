import { mkdir, writeFile } from "node:fs/promises";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_REGION = 18;

const feeds = [
  {
    region: "cz",
    source: "ČTK / České noviny",
    url: "https://www.ceskenoviny.cz/sluzby/rss/zpravy.php",
  },
  {
    region: "cz",
    source: "ČT24",
    url: "https://ct24.ceskatelevize.cz/rss",
  },
  {
    region: "cz",
    source: "Aktuálně.cz",
    url: "https://zpravy.aktualne.cz/rss",
  },
  {
    region: "cz",
    source: "E15",
    url: "https://www.e15.cz/rss",
    genre: "economy",
  },
  {
    region: "cz",
    source: "Hospodářské noviny",
    url: "https://hn.cz/?m=rss",
    genre: "economy",
  },
  {
    region: "cz",
    source: "CNN Prima NEWS",
    url: "https://cnn.iprima.cz/rss",
  },
  {
    region: "cz",
    source: "oEnergetice.cz",
    url: "https://oenergetice.cz/feed",
    genre: "economy",
  },
  {
    region: "cz",
    source: "Indian",
    url: "https://indian-tv.cz/atom.xml",
    genre: "tech",
  },
  {
    region: "cz",
    source: "Hrej.cz",
    url: "https://hrej.cz/rss/novinky",
    genre: "tech",
  },
  {
    region: "cz",
    source: "ČT sport",
    url: "https://sport.ceskatelevize.cz/rss",
    genre: "sport",
  },
  {
    region: "cz",
    source: "Kurzy.cz",
    url: "https://www.kurzy.cz/zpravy/util/forext.dat?type=rss",
    genre: "economy",
  },
  {
    region: "cz",
    source: "Třebíčský deník",
    url: "https://trebicsky.denik.cz/rss/server-original.html",
  },
  {
    region: "cz",
    source: "České noviny Sport",
    url: "https://www.ceskenoviny.cz/sluzby/rss/sport.php",
    genre: "sport",
  },
  {
    region: "world",
    source: "AP News",
    url: "https://apnews.com/world-news",
    type: "ap-html",
  },
  {
    region: "world",
    source: "BBC News",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    region: "world",
    source: "The Guardian",
    url: "https://www.theguardian.com/europe/rss",
  },
  {
    region: "world",
    source: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    region: "world",
    source: "Deutsche Welle",
    url: "https://rss.dw.com/xml/rss-en-world",
  },
];

const fallbackImages = {
  politics:
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80",
  economy:
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
  society:
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80",
  world:
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80",
  culture:
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
  tech:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  sport:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
  health:
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80",
  climate:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
};

const genreRules = [
  ["health", /zdrav|nemoc|lékař|lek(a|á)ř|hospital|covid|vaccine|health|doctor|medical/i],
  ["sport", /sport|fotbal|hokej|tenis|liga|olymp|match|football|soccer|hockey/i],
  ["tech", /technolog|ai|uměl(á|e)|software|kyber|internet|chip|nasa|space|tech/i],
  ["economy", /ekonom|byznys|firma|trh|inflac|bank|rozpočet|tax|market|business|econom/i],
  ["culture", /kultur|film|hudb|divadl|festival|book|movie|music|art|culture/i],
  ["climate", /klima|počasí|pocasi|emise|povodeň|sucho|climate|weather|flood|wildfire/i],
  ["politics", /vlád|vlada|sněmov|senát|prezident|ministr|election|government|minister|parliament/i],
];

const now = new Date();
const cutoff = now.getTime() - DAY_MS;
const warnings = [];

const nestedItems = await Promise.all(feeds.map(readFeed));
const items = nestedItems
  .flat()
  .filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
  .sort((a, b) => {
    const score = b.priorityScore - a.priorityScore;
    if (score !== 0) return score;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });

const uniqueItems = dedupe(items);
const selectedItems = ["cz", "world"].flatMap((region) =>
  selectRegionItems(
    uniqueItems.filter((item) => item.region === region),
    MAX_PER_REGION,
  ),
);
const payload = {
  updatedAt: now.toISOString(),
  windowHours: 24,
  generatedBy: "scripts/update-news.mjs",
  warnings,
  items: selectedItems,
};

await mkdir("data", { recursive: true });
await writeFile("data/news.json", `${JSON.stringify(payload, null, 2)}\n`);
await writeFile(
  "data/news.js",
  `window.DAILY_NEWS_DATA = ${JSON.stringify(payload, null, 2)};\n`,
);

console.log(`Wrote ${selectedItems.length} news items to data/news.json and data/news.js`);
if (warnings.length) console.log(warnings.join("\n"));

async function readFeed(feed, feedIndex) {
  try {
    if (feed.type === "ap-html") {
      return await readApHtmlFeed(feed, feedIndex);
    }

    const response = await fetchWithTimeout(feed.url, 18000);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const xml = await readResponseText(response);
    return parseItems(xml).map((rawItem, itemIndex) => normalizeItem(rawItem, feed, feedIndex, itemIndex));
  } catch (error) {
    warnings.push(`${feed.source}: ${error.message}`);
    return [];
  }
}

async function readApHtmlFeed(feed, feedIndex) {
  const response = await fetchWithTimeout(feed.url, 18000);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const html = await readResponseText(response);
  const articleUrls = [...html.matchAll(/<a\b[^>]+href=["']([^"']*\/article\/[^"']+)["']/gi)]
    .map((match) => new URL(match[1], response.url).href)
    .filter((url, index, list) => list.indexOf(url) === index)
    .slice(0, 16);

  const rawItems = await Promise.all(
    articleUrls.map(async (url) => {
      const articleResponse = await fetchWithTimeout(url, 14000);
      if (!articleResponse.ok) return null;
      const articleHtml = await readResponseText(articleResponse);
      return {
        title: metaContent(articleHtml, "og:title"),
        url,
        summary: metaContent(articleHtml, "og:description"),
        publishedAt: metaContent(articleHtml, "article:published_time"),
        imageUrl: metaContent(articleHtml, "og:image"),
      };
    }),
  );

  return rawItems
    .filter((item) => item?.title)
    .map((rawItem, itemIndex) => normalizeItem(rawItem, feed, feedIndex, itemIndex));
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        "user-agent": "Denní zprávy RSS updater/1.0",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseText(response) {
  const bytes = await response.arrayBuffer();
  const headerCharset = response.headers.get("content-type")?.match(/charset=([^;\s]+)/i)?.[1];
  const utf8Preview = new TextDecoder("utf-8").decode(bytes.slice(0, 500));
  const xmlCharset = utf8Preview.match(/encoding=["']([^"']+)["']/i)?.[1];
  const charset = normalizeCharset(headerCharset || xmlCharset || "utf-8");
  return new TextDecoder(charset).decode(bytes);
}

function normalizeCharset(charset) {
  const normalized = charset.toLowerCase().replace(/_/g, "-");
  if (["windows-1250", "cp1250", "iso-8859-2"].includes(normalized)) return normalized;
  return "utf-8";
}

function parseItems(xml) {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  if (blocks.length) return blocks.map(parseRssItem);

  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => parseAtomItem(match[0]));
}

function parseRssItem(block) {
  return {
    title: tag(block, "title"),
    url: tag(block, "link") || attr(block, "link", "href"),
    summary: tag(block, "description") || tag(block, "content:encoded"),
    publishedAt: tag(block, "pubDate") || tag(block, "dc:date"),
    imageUrl: extractImage(block),
  };
}

function parseAtomItem(block) {
  return {
    title: tag(block, "title"),
    url: attr(block, "link", "href"),
    summary: tag(block, "summary") || tag(block, "content"),
    publishedAt: tag(block, "updated") || tag(block, "published"),
    imageUrl: extractImage(block),
  };
}

function normalizeItem(rawItem, feed, feedIndex, itemIndex) {
  const title = cleanText(rawItem.title);
  const summary = shorten(cleanText(rawItem.summary || title), 190);
  const publishedAt = parseDate(rawItem.publishedAt);
  const genre = feed.genre || classify(`${title} ${summary}`, feed.region);

  return {
    id: stableId(`${feed.source}-${rawItem.url || title}`),
    title,
    summary,
    region: feed.region,
    genre,
    source: feed.source,
    url: decodeEntities(rawItem.url || feed.url),
    imageUrl: rawItem.imageUrl || fallbackImages[genre] || fallbackImages.world,
    imageAlt: title,
    publishedAt: publishedAt.toISOString(),
    priorityScore: 1000 - feedIndex * 35 - itemIndex,
  };
}

function tag(block, name) {
  const escaped = name.replace(":", "\\:");
  const match = block.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeEntities(stripCdata(match[1]).trim()) : "";
}

function attr(block, tagName, attrName) {
  const escaped = tagName.replace(":", "\\:");
  const match = block.match(new RegExp(`<${escaped}\\b[^>]*\\s${attrName}=["']([^"']+)["'][^>]*>`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function metaContent(html, propertyName) {
  for (const match of html.matchAll(/<meta\b[^>]+>/gi)) {
    const metaTag = match[0];
    const property = metaTag.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1];
    if (property !== propertyName) continue;
    return decodeEntities(metaTag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || "");
  }
  return "";
}

function extractImage(block) {
  const media =
    attr(block, "media:content", "url") ||
    attr(block, "media:thumbnail", "url") ||
    attr(block, "enclosure", "url");
  if (media && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(media)) return decodeEntities(media);

  const htmlImage = block.match(/<img\b[^>]*src=["']([^"']+)["']/i);
  return htmlImage ? decodeEntities(htmlImage[1]) : "";
}

function classify(text, region) {
  const found = genreRules.find(([, rule]) => rule.test(text));
  if (found) return found[0];
  return region === "world" ? "world" : "society";
}

function cleanText(value) {
  return decodeEntities(stripCdata(value || ""))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(value, length) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).replace(/\s+\S*$/, "")}…`;
}

function parseDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((item) => {
    const key = item.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .slice(0, 90);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectRegionItems(regionItems, limit) {
  const bySource = new Map();
  regionItems.forEach((item) => {
    if (!bySource.has(item.source)) bySource.set(item.source, []);
    bySource.get(item.source).push(item);
  });

  const selected = [];
  while (selected.length < limit) {
    let added = false;
    for (const sourceItems of bySource.values()) {
      const next = sourceItems.shift();
      if (!next) continue;
      selected.push(next);
      added = true;
      if (selected.length === limit) break;
    }
    if (!added) break;
  }

  return selected.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function stableId(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)));
}
