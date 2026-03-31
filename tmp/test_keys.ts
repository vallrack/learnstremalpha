import { GoogleGenerativeAI } from '@google/generative-ai';

// Let's try both keys one after another
async function testAllKeys() {
  const keys = [
    'AIzaSyDWPMrsqtbkmVD1Ck1Rduk44-TgPZY28Z', // GOOGLE_GENAI_API_KEY
    'AIzaSyA9ko66iF-YXFBToaD7n0z7YGoqXIByAa4'  // GEMINI_API_KEY
  ];

  for (const key of keys) {
    console.log(`Testing key: ${key.substring(0, 10)}...`);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    try {
      const result = await model.generateContent('Hello');
      const text = result.response.text();
      console.log(`✅ Key ${key.substring(0, 10)} works! Response: ${text.substring(0, 20)}...`);
    } catch (error: any) {
      console.error(`❌ Key ${key.substring(0, 10)} failed: ${error.message}`);
    }
  }
}

testAllKeys();
