// netlify/functions/chat.js

exports.handler = async function(event, context) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

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
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ answer: "⚠️ ERROR: Configuración incompleta. Falta la GEMINI_API_KEY en Netlify." }) 
            };
        }

        const systemInstruction = `
        Eres el Asistente Experto en la estrategia BIM, Gestión Contractual, Procesos y Costos del IDU (Instituto de Desarrollo Urbano).
        Tu objetivo es responder consultas de los supervisores basándote de manera estricta y exclusiva en los documentos oficiales cargados en tu contexto (Manuales de Maduración, Interventoría, Gestión Contractual PR-GC-06, Guías Técnicas y el archivo Listado_Precios_Unitarios.csv).
        
        Reglas obligatorias:
        1. Responde SIEMPRE en español con un tono institucional, formal y claro.
        2. Si te preguntan por códigos o precios de construcción, busca en la base de datos del CSV, identifica la coincidencia exacta y devuélvele el código, la descripción completa y el valor correspondiente.
        3. Si la información no está en tus archivos, di cordialmente que tu facultad está limitada a la documentación oficial indexada de la entidad.
        4. Usa viñetas para estructurar la información.
        `;

        // Conexión estable por método estándar (Non-streaming) para soportar múltiples usuarios
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

        // CONTROL DE SATURACIÓN (Anti-colapso de supervisores)
        if (!response.ok) {
            if (response.status === 429) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ answer: "⏳ El sistema está experimentando alta demanda por parte de otros supervisores. Por favor, espera 10 segundos y vuelve a enviar tu consulta." })
                };
            }
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ answer: `🔴 Error de comunicación con Google (Código ${response.status}). Intente de nuevo.` })
            };
        }

        const data = JSON.parse(responseText);
        const aiAnswer = data.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ answer: aiAnswer })
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ answer: "⚙️ El asistente técnico está procesando los datos. Por favor reintente la pregunta." })
        };
    }
};