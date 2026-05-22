// netlify/functions/chat.js

exports.handler = async function(event, context) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ key: apiKey || "No encontrada en Netlify" })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ key: "Error interno del servidor" })
        };
    }
};
