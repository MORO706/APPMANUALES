// netlify/functions/chat.js

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método no permitido" };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ answer: "ERROR CONFIGURACIÓN: Falta ingresar la clave 'GEMINI_API_KEY' en el panel de Netlify." }) 
            };
        }

        const systemInstruction = `
        Eres el Asistente Experto en la estrategia BIM, Gestión Contractual, Procesos y Costos del IDU (Instituto de Desarrollo Urbano).
        Tu único objetivo es responder consultas de los supervisores basándote de manera estricta y exclusiva en los documentos oficiales cargados en tu contexto (Manuales de Maduración, Interventoría, Gestión Contractual PR-GC-06, Guías Técnicas y el archivo Listado_Precios_Unitarios.csv).
        
        Reglas obligatorias de análisis y respuesta:
        1. Responde SIEMPRE en español con un tono institucional, formal, claro y profesional.
        2. Si te preguntan por códigos o precios de construcción, busca en la base de datos del CSV, identifica la coincidencia exacta y devuélvele el código, la descripción completa y el valor correspondiente.
        3. Si la información solicitada no se encuentra en los manuales o en el listado de precios, responde textualmente: "Mi facultad como Asistente Experto está estrictamente limitada a la información contenida en los manuales de especialidad de la entidad. No encontré esa información en la documentación oficial disponible."
        4. Estructura las respuestas largas usando viñetas o listas numeradas.
        `;

        // RETORNO AL MÉTODO ESTÁNDAR (generateContent): Evita problemas de lectura de flujos continuos en Netlify
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

        // Si Google responde con un error técnico (Ej: Clave inválida, cuota excedida)
        if (!response.ok) {
            const errorText = await response.text();
            return {
                statusCode: response.status,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ answer: `ERROR DE GOOGLE API (${response.status}): ${errorText.substring(0, 150)}... Verifique la API Key.` })
            };
        }

        const data = await response.json();
        
        // Extracción segura del texto sin importar variaciones de la API
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            const responseText = data.candidates[0].content.parts[0].text;
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ answer: responseText })
            };
        } else {
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ answer: "ERROR ESTRUCTURA: Google respondió, pero el formato del documento no contiene texto legible." })
            };
        }

    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ answer: `ERROR INTERNO NETLIFY: ${error.message}. Intente de nuevo.` })
        };
    }
};
