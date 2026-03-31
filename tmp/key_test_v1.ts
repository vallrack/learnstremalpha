
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const keys = [
  { name: "BACKUP_AI_KEY", val: process.env.BACKUP_AI_KEY || "" },
  { name: "GOOGLE_GENERATIVE_AI_API_KEY", val: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" },
  { name: "GEMINI_API_KEY", val: process.env.GEMINI_API_KEY || "" }
];

async function testKey(key: string, name: string) {
  if (!key || key.length < 5) return `${name}: MISSING`;
  try {
     // USANDO v1 explícitamente
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Test" }] }] })
    });
    const data = await response.json();
    if (data.error) {
        return `${name}: FAILED v1 - ${data.error.message}`;
    }
    return `${name}: SUCCESS v1`;
  } catch (e: any) {
    return `${name}: FATAL v1 - ${e.message}`;
  }
}

async function run() {
  const results = [];
  for (const k of keys) {
    results.push(await testKey(k.val, k.name));
  }
  fs.writeFileSync("tmp/key_report_v1.txt", results.join("\n"));
  console.log(results.join("\n"));
}

run();
