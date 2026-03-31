
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

async function listModels() {
  if (!key) {
    console.log("MISSING KEY");
    return;
  }
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
    const data = await response.json();
    fs.writeFileSync("tmp/available_models_new.json", JSON.stringify(data, null, 2));
    console.log("Models listed in tmp/available_models_new.json");
  } catch (e: any) {
    console.log("FATAL - " + e.message);
  }
}

listModels();
