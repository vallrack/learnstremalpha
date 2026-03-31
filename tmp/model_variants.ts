
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

async function test(modelName: string) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Test" }] }] })
    });
    const data = await response.json();
    if (data.error) return `FAILED ${modelName} - ${data.error.message}`;
    return `SUCCESS ${modelName}`;
  } catch (e: any) {
    return `FATAL ${modelName} - ${e.message}`;
  }
}

async function run() {
  const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest"];
  const results = [];
  for (const m of models) {
    results.push(await test(m));
  }
  fs.writeFileSync("tmp/model_test.txt", results.join("\n"));
  console.log(results.join("\n"));
}

run();
