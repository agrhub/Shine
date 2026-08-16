import { geminiClient } from './gemini/GeminiClient.js';

async function runTest() {
  console.log('=== Testing Vertex AI SDK Integration (@google/genai v2.16.0) ===');
  console.log(`GCP Project ID: ${process.env.GCP_PROJECT_ID || 'Not configured'}`);

  try {
    console.log('\n[1/1] Testing Text Generation (gemini-2.5-flash @ us-central1)...');
    const textOutput = await geminiClient.generateText({
      model: 'gemini-2.5-flash',
      prompt: 'Write a 2-sentence thrilling teaser hook for a 9:16 micro drama about a CEO returning in disguise.',
    });
    console.log('✔ Text Generation Result:\n', textOutput.trim());

    console.log('\n✅ All Vertex AI connectivity verification steps completed successfully!');
  } catch (err: any) {
    console.error('❌ Vertex AI Connection Error:', err);
    process.exit(1);
  }
}

runTest();
