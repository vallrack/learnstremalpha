
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

async function run() {
  if (!key) {
    console.log("GOOGLE_GENERATIVE_AI_API_KEY: MISSING");
    return;
  }
  // USANDO fetch para probar v1 directamente fuera del SDK si es necesario, 
  // o configurando el SDK para v1
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Test v1" }] }] })
    });
    const data = await response.json();
    if (data.error) {
        console.log("GOOGLE_GENERATIVE_AI_API_KEY (v1): FAILED - " + data.error.message);
    } else {
        console.log("GOOGLE_GENERATIVE_AI_API_KEY (v1): SUCCESS");
    }
  } catch (e: any) {
    console.log("GOOGLE_GENERATIVE_AI_API_KEY (v1): FATAL - " + e.message);
  }
}

run();
