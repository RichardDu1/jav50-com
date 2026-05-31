import fs from 'fs';
import path from 'path';
import { fetchSearchContext } from './web_crawler.mjs';

const DEEPSEEK_API_KEY = "sk-a2dc0881aaac4bfcbe75b200177655b1";
const GEN_DIR = path.join(process.cwd(), 'src', 'content', 'generators');

if (!fs.existsSync(GEN_DIR)) fs.mkdirSync(GEN_DIR, { recursive: true });

function sanitizeSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function callDeepSeek(prompt) {
  const reqBody = {
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    response_format: { type: "json_object" }
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(reqBody)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateVideoReport(toolName, rank) {
  console.log(`\n======================================================`);
  console.log(`🎬 Reviewing Video AI: ${toolName} (Rank #${rank})`);
  
  // 1. Crawl for facts
  console.log(`🔍 Crawling web for ${toolName} capabilities and benchmarks...`);
  let searchResults = "";
  try {
    searchResults = await fetchSearchContext(`"${toolName}" AI video generator features limitations quality pricing`);
  } catch (e) {
    console.warn(`⚠️ Crawl failed: ${e.message}`);
  }

  // 2. Ask DeepSeek to generate Schema + Markdown
  console.log(`🧠 Generating Cinematic Review...`);
  const prompt = `
You are an expert AI Video Director for JAV50.com, the ultimate ranking of Top 50 AI Video Generators.
Write a detailed, critical review of the AI video model: "${toolName}". It is ranked #${rank}.

I have scraped the web for factual data. Here are the snippets:
---
${searchResults}
---

Your task is to output a single JSON object containing BOTH the frontmatter metadata and the full markdown review.
Focus heavily on video generation capabilities: prompt adherence, motion coherence, temporal stability, artifacts, and realism.

Output exactly this JSON structure (no markdown fences around it, just raw JSON):
{
  "title": "Exact Model Name",
  "description": "A 1-2 sentence compelling summary of the model's strengths.",
  "videoType": "e.g., Text-to-Video, Image-to-Video",
  "maxResolution": "e.g., 1080p 60fps",
  "pricing": "e.g., Freemium, $20/mo",
  "rank": ${rank},
  "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
  "markdownContent": "The full review in Markdown. Include H2s like '## Motion Coherence & Realism', '## Prompt Adherence', '## The Verdict'. Use bullet points and bold text. Do not include the title (H1) or frontmatter."
}
`;

  const responseJson = await callDeepSeek(prompt);
  let parsed;
  try {
    parsed = JSON.parse(responseJson);
  } catch (e) {
    console.error("❌ Failed to parse output:", responseJson);
    return;
  }

  // 3. Write File
  const slug = sanitizeSlug(parsed.title);
  const filePath = path.join(GEN_DIR, `${slug}.md`);
  const dateStr = new Date().toISOString().split('T')[0];

  const frontmatter = `---
title: "${parsed.title.replace(/"/g, '\\"')}"
description: "${parsed.description.replace(/"/g, '\\"')}"
videoType: "${parsed.videoType}"
maxResolution: "${parsed.maxResolution}"
pricing: "${parsed.pricing}"
rank: ${parsed.rank}
keyFeatures: ${JSON.stringify(parsed.keyFeatures || [])}
publishedAt: ${dateStr}
---

${parsed.markdownContent}
`;

  fs.writeFileSync(filePath, frontmatter, 'utf-8');
  console.log(`   ✅ Created review: ${slug}.md`);
}

async function run() {
  const tools = [
    { name: "Sora", rank: 1 },
    { name: "Runway Gen-3 Alpha", rank: 2 },
    { name: "Kling AI", rank: 3 },
    { name: "Luma Dream Machine", rank: 4 },
    { name: "Pika 1.0", rank: 5 }
  ];
  
  for (const t of tools) {
    await generateVideoReport(t.name, t.rank);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`\n🎉 Batch complete! Analyzed top 5 AI video generators.`);
}

run();
