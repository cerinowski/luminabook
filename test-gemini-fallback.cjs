
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyADP_Ltfmf5f9kNUXS0zLXsz7sRkdJIPwc");

async function test() {
    try {
        console.log("Testing Gemini 1.5 Flash Fallback...");
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 1,
                maxOutputTokens: 2000,
                responseMimeType: "application/json"
            }
        });

        const result = await model.generateContent("Say hello in JSON format: { \"hello\": \"world\" }");
        const response = await result.response;
        console.log("SUCCESS:", response.text());
    } catch (error) {
        console.error("FAILURE:", error.message);
    }
}

test();
