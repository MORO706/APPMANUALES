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

        // OPTIMIZACIÓN CLAVE: Instrucción ejecutiva ultra-corta.
        // Al no transcribir nombres repetitivos, la IA arranca el análisis de inmediato, bajando el tiempo a 3-4 segundos.
        const systemInstruction = `
        Eres el Asistente Experto BIM, de Gestión Contractual y Costos del IDU.
        Tu único objetivo es responder consultas técnicas o contractuales de los supervisores basándote de manera estricta en los manuales, guías, procedimientos (como el PR-GC-06 de incumplimiento) y el listado de precios en CSV indexados en tu contexto de proyecto.
        
        Reglas obligatorias:
        1. Responde SIEMPRE en español con un tono institucional, formal y técnico.
        2. Si te preguntan por códigos o precios, busca en la matriz CSV indexada y entrega el código, descripción e ítem exacto.
        3. Si la información no está explícita en los documentos oficiales, di cordialmente que tu facultad está limitada a la documentación técnica indexada de la entidad.
        4. Estructura las respuestas con viñetas claras.
        `;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { 
                    temperature: 0.2,
                    maxOutputTokens: 800 // Limitamos ligeramente la extensión para acelerar la velocidad de respuesta
                },
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                }
            })
        });

        const responseText = await response.text();

        if (!response.ok) {
            if (response.status === 429) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ answer: "⏳ Alta demanda en el servidor de Google. Por favor reintente la pregunta en 10 segundos." })
                };
            }
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ answer: `🔴 Error de API (Código ${response.status}).` })
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
            body: JSON.stringify({ answer: "⚙️ El sistema técnico tardó más de lo esperado en procesar los manuales. Por favor, simplifica un poco tu pregunta y vuelve a intentarlo." })
        };
    }
};