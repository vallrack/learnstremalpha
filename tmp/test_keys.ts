
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const keys = [
  process.env.BACKUP_AI_KEY,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  process.env.GEMINI_API_KEY
];

async function testKey(key: string, name: string) {
  if (!key) {
    console.log(`${name}: MISSING`);
    return;
  }
  const genAI = new GoogleGenerativeAI(key);
  try {
    const list = await genAI.getModel("models/gemini-1.5-flash");
    console.log(`${name}: SUCCESS - Model found`);
  } catch (e: any) {
    console.log(`${name}: ERROR - ${e.message}`);
  }
}

async function run() {
  await testKey(process.env.BACKUP_AI_KEY!, "BACKUP_AI_KEY");
  await testKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY!, "GOOGLE_GENERATIVE_AI_API_KEY");
  await testKey(process.env.GEMINI_API_KEY!, "GEMINI_API_KEY");
}

run();
