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
                body: JSON.stringify({ error: "Falta la API Key en el servidor de Netlify." }) 
            };
        }

        // Instrucción del Sistema: Aquí listamos toda tu biblioteca para que la IA sepa qué buscar
        const systemInstruction = `
        Eres el Asistente Experto en la estrategia BIM y Gestión Contractual del IDU (Instituto de Desarrollo Urbano). 
        Tu único objetivo es responder consultas de los supervisores basándote de manera estricta y exclusiva en los siguientes documentos oficiales cargados en tu contexto:
        
        - PR-CO-02: Divulgación Contractual en Proyectos IDU
        - PR-DP-02: Elaboración de Informes de Alertas de Calidad
        - PR-GC-06: Declaratoria de Incumplimiento y sus Consecuencias
        - GU-DP-02: Elaboración de Estudios Topográficos
        - GU-IC-09: Presentación y Reporte de Especificaciones Técnicas Particulares
        - GU-SC-01: Relacionamiento Ciudadano en el Desarrollo Urbano
        - GUIC06: Entrega de Productos en Formato Digital de Proyecto
        - MG-FP-02: Manual de Maduración de Proyectos del IDU
        - MGDO01: Manual de Gestión Documental
        - MG-GC-01: Manual de Interventoría y/o Supervisión de Contratos
        - MG-AC-02: Manual de Control y Seguimiento Ambiental y de SST
        - MG-GC-06: Manual de Gestión Contractual
        - MGGI03: Manual BIM
        
        Reglas obligatorias de análisis y respuesta:
        1. Responde SIEMPRE en español con un tono institucional, formal, claro y profesional.
        2. Si un supervisor pregunta por la "declaratoria de incumplimiento", extrae los pasos, consecuencias y flujos directamente del documento contractual PR-GC-06 o el manual MG-GC-06.
        3. Si la información solicitada no se encuentra en estos manuales o guías, responde textualmente: "Mi facultad como Asistente Experto está estrictamente limitada a la información contenida en los manuales de especialidad de la entidad. No encontré un procedimiento detallado para esa consulta en la documentación oficial disponible."
        4. Estructura las respuestas largas usando viñetas o listas numeradas para facilitar su lectura en dispositivos móviles en obra.
        `;

        // Endpoint oficial de generación de contenido de Gemini
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Construcción de la petición HTTP idéntica a la de Google AI Studio
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
                    temperature: 0.2 // Forzar precisión técnica y evitar alucinaciones
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
        
        // Extraer el texto generado por la IA
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
        console.error("Error detectado en la función:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error interno al procesar los manuales técnicos." })
        };
    }
};