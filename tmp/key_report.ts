
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const keys = [
  { name: "BACKUP_AI_KEY", val: process.env.BACKUP_AI_KEY },
  { name: "GOOGLE_GENERATIVE_AI_API_KEY", val: process.env.GOOGLE_GENERATIVE_AI_API_KEY },
  { name: "GEMINI_API_KEY", val: process.env.GEMINI_API_KEY }
];

async function testKey(key: string, name: string) {
  if (!key) return `${name}: MISSING`;
  const genAI = new GoogleGenerativeAI(key);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Test");
    await result.response;
    return `${name}: SUCCESS`;
  } catch (e: any) {
    return `${name}: FAILED - ${e.message.substring(0, 100)}`;
  }
}

async function run() {
  const results = [];
  for (const k of keys) {
    results.push(await testKey(k.val!, k.name));
  }
  fs.writeFileSync("tmp/key_report.txt", results.join("\n"));
  console.log(results.join("\n"));
}

run();
