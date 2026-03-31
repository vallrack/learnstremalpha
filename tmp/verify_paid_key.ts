import { GoogleGenerativeAI } from '@google/generative-ai';

async function listAllModels() {
  const key = 'AIzaSyD-EnQLOj5ZD0VD5mq5Yf3Bz0wxy1KUH1I'; // Paid key
  console.log('Listing models for PAID key...');
  const genAI = new GoogleGenerativeAI(key);

  try {
    // We can't actually "list" easily without a complex request, 
    // so let's try 3 specific names with v1 AND v1beta logic.
    const models = [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro'
    ];

    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent('Hi');
        console.log(`✅ ${m} is AVAILABLE.`);
      } catch (e: any) {
        console.log(`❌ ${m} FAILED: ${e.message}`);
      }
    }
  } catch (err: any) {
    console.error('Error listing models:', err.message);
  }
}

listAllModels();
