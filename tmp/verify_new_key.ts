
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

async function run() {
  if (!key) {
    console.log("GOOGLE_GENERATIVE_AI_API_KEY: MISSING");
    return;
  }
  const genAI = new GoogleGenerativeAI(key);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Test");
    await result.response;
    console.log("GOOGLE_GENERATIVE_AI_API_KEY: SUCCESS");
  } catch (e: any) {
    console.log("GOOGLE_GENERATIVE_AI_API_KEY: FAILED - " + e.message);
  }
}

run();
