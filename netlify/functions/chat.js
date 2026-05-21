// netlify/functions/chat.js
const { GoogleGenAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método no permitido" };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        
        // Inicializa la API con la variable de entorno protegida en Netlify
        const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        // INSTRUCCIONES DE CONTEXTO: Aquí defines cómo se debe comportar la IA
        const systemInstruction = `
        Eres el Asistente Experto en la estrategia BIM del IDU (Instituto de Desarrollo Urbano). 
        Tu objetivo es responder de manera clara, técnica y precisa a los supervisores de obra.
        Responde SIEMPRE en español utilizando un tono institucional, formal y colaborador.
        Si la pregunta no está relacionada con ingeniería, infraestructura, metodología BIM o los manuales de la entidad, responde cortésmente diciendo que solo estás facultado para responder sobre la documentación técnica oficial.
        `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                systemInstruction: systemInstruction,
                temperature: 0.3, // Temperatura baja para evitar "alucinaciones" técnicas
            }
        });

        const responseText = result.response.text();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answer: responseText })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error interno procesando la solicitud." })
        };
    }
};