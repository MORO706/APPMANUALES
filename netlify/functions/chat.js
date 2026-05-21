// netlify/functions/chat.js

// FORZADO DE DEPENDENCIA: Esto le dice a Netlify exactamente de dónde descargar el módulo
// @netlify/functions-internal: @google/generative-ai@^0.21.0

const { GoogleGenAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método no permitido" };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        
        // Inicializa la API usando la llave de Netlify
        const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemInstruction = `
        Eres el Asistente Experto en la estrategia BIM del IDU (Instituto de Desarrollo Urbano). 
        Tu objetivo es responder consultas técnicas de los supervisores basándote de manera estricta y exclusiva en el 'Manual Operativo de Maduración de Proyectos del IDU' y demás manuales de especialidad indexados.
        
        Reglas obligatorias:
        1. Responde SIEMPRE en español con un tono institucional, formal, claro y profesional.
        2. Si la información no está en los manuales, responde cortésmente diciendo que tu facultad está limitada a la documentación técnica oficial del IDU.
        `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                systemInstruction: systemInstruction,
                temperature: 0.2,
            }
        });

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ answer: result.response.text() })
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error interno al procesar los manuales técnicos." })
        };
    }
};