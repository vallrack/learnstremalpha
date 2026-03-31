import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  const keys = [
    'AIzaSyDWPMrsqtbkmVD1Ck1Rduk44-TgPZY28Z',
    'AIzaSyA9ko66iF-YXFBToaD7n0z7YGoqXIByAa4'
  ];

  for (const key of keys) {
    console.log(`--- Testing Key: ${key.substring(0, 10)}... ---`);
    const genAI = new GoogleGenerativeAI(key);
    
    try {
      // Try a simple generation with a very stable model name
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Hi');
      console.log(`✅ Success with gemini-1.5-flash!`);
      console.log(`Response: ${result.response.text().substring(0, 20)}...`);
    } catch (e: any) {
      console.log(`❌ Failed with gemini-1.5-flash: ${e.message}`);
    }

    try {
        const model2 = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result2 = await model2.generateContent('Hi');
        console.log(`✅ Success with gemini-2.0-flash-exp!`);
    } catch (e: any) {
        console.log(`❌ Failed with gemini-2.0-flash-exp: ${e.message}`);
    }
  }
}

listModels();
