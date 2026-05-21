// netlify/functions/chat.js

exports.handler = async function(event, context) {
    // Permitir solo peticiones POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método no permitido" };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: "Falta la API Key en el servidor." }) 
            };
        }

        // Instrucción fija de comportamiento institucional para el IDU
        const systemInstruction = `
        Eres el Asistente Experto en la estrategia BIM del IDU (Instituto de Desarrollo Urbano). 
        Tu objetivo es responder consultas técnicas de los supervisores basándote de manera estricta y exclusiva en el 'Manual Operativo de Maduración de Proyectos del IDU' y demás manuales de especialidad de la entidad.
        
        Reglas obligatorias:
        1. Responde SIEMPRE en español con un tono institucional, formal, claro y profesional.
        2. Si la información no está en los manuales, responde cortésmente diciendo que tu facultad está limitada a la documentación técnica oficial del IDU.
        `;

        // Llamada directa por HTTP al modelo Gemini 2.5 Flash de Google
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.2
                },
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Error de Google API:", errorData);
            throw new Error("Error en la respuesta de Gemini");
        }

        const data = await response.json();
        
        // Extraer el texto de la respuesta de Google
        const responseText = data.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ answer: responseText })
        };

    } catch (error) {
        console.error("Error detectado:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error interno al procesar los manuales técnicos." })
        };
    }
};