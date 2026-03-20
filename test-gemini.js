import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyCFXFmbXWlf4BWYHcGUawKq--OfaTaJPPQ";
const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
    try {
        const modelName = "gemini-2.0-flash";
        console.log(`Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Diga 'Olá Mundo'");
        const response = await result.response;
        console.log("Success! Response:", response.text());
    } catch (error) {
        console.error("Test failed:", error.message || error);
    }
}

run();
