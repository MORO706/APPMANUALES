// netlify/functions/chat.js

exports.handler = async function(event, context) {
    // Asegurar que solo reciba peticiones POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método no permitido" };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: "Falta la API Key en Netlify." }) 
            };
        }

        // Instrucción del Sistema institucional con toda tu biblioteca consolidada
        const systemInstruction = `
        Eres el Asistente Experto en la estrategia BIM, Gestión Contractual, Procesos y Costos del IDU (Instituto de Desarrollo Urbano).
        Tu único objetivo es responder consultas de los supervisores basándote de manera estricta y exclusiva en los documentos oficiales cargados en tu contexto (Manuales de Maduración, Interventoría, Gestión Contractual PR-GC-06, Guías Técnicas y el archivo Listado_Precios_Unitarios.csv).
        
        Reglas obligatorias de análisis y respuesta:
        1. Responde SIEMPRE en español con un tono institucional, formal, claro y profesional.
        2. Si te preguntan por códigos o precios de construcción, busca en la base de datos del CSV, identifica la coincidencia exacta y devuélvele el código, la descripción completa y el valor correspondiente.
        3. Si la información solicitada no se encuentra en los manuales o en el listado de precios, responde textualmente: "Mi facultad como Asistente Experto está estrictamente limitada a la información contenida en los manuales de especialidad de la entidad. No encontré un procedimiento o código detallado para esa consulta en la documentación oficial disponible."
        4. Estructura las respuestas largas usando viñetas o listas numeradas para facilitar su lectura en obra.
        `;

        // CAMBIO CLAVE: Usamos el endpoint de STREAMING (streamGenerateContent) que exige tu cuenta de Google AI Studio
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`;

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
                    temperature: 0.2 // Mantener precisión técnica
                },
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Error de la API de Google:", errorData);
            throw new Error("Fallo en la comunicación con Gemini");
        }

        const data = await response.json();
        
        // Procesamos la estructura de respuesta cuando viene en formato de lista/stream
        let responseText = "";
        if (Array.isArray(data)) {
            // Unir los fragmentos técnicos del flujo de datos
            responseText = data
                .map(chunk => chunk.candidates[0].content.parts[0].text)
                .join("");
        } else if (data.candidates && data.candidates[0].content.parts[0].text) {
            responseText = data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Estructura de respuesta desconocida");
        }

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ answer: responseText })
        };

    } catch (error) {
        console.error("Error detectado en la función:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error interno al procesar los manuales técnicos." })
        };
    }
};
