// netlify/functions/chat.js

exports.handler = async function(event, context) {
    // Asegurar encabezados para evitar bloqueos del navegador (CORS)
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // Responder de inmediato a peticiones de verificación de navegador
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ answer: "Método no permitido" }) };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { 
                statusCode: 200, // Forzamos 200 para que la web lea el mensaje sin saltar el error de JSON
                headers, 
                body: JSON.stringify({ answer: "⚠️ CONFIGURACIÓN: No se encontró la clave 'GEMINI_API_KEY' en el panel de variables de Netlify." }) 
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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 },
                systemInstruction: { parts: [{ text: systemInstruction }] }
            })
        });

        const responseText = await response.text();
        
        // Si Google devuelve un error (ej. cuota excedida o mala petición)
        if (!response.ok) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ answer: `🔴 ERROR GOOGLE API (${response.status}): ${responseText.substring(0, 100)}...` })
            };
        }

        const data = JSON.parse(responseText);
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            const aiAnswer = data.candidates[0].content.parts[0].text;
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ answer: aiAnswer })
            };
        } else {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ answer: "⚠️ ESTRUCTURA: Google procesó la consulta, pero no devolvió un bloque de texto válido." })
            };
        }

    } catch (error) {
        console.error("Error detectado:", error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ answer: `⚙️ ERROR INTERNO: ${error.message}. Intente de nuevo.` })
        };
    }
};
