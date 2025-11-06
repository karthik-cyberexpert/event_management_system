import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client using the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: Request) {
    // CORS headers for local development and external calls
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (!process.env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is missing.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const { title, objective, description } = await req.json();

        if (!title || !objective || !description) {
            return new Response(JSON.stringify({ error: 'Missing event details in request body.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const prompt = `Based on the following event details, write a concise and formal "Objective" section for an activity report. The output should be a single, well-written paragraph suitable for an official document.

        --- Event Details ---
        Title: ${title}
        Stated Objective: ${objective}
        Description: ${description}

        --- Instructions ---
        - Synthesize the provided information into a formal objective statement.
        - Do not use markdown, headings, or any special formatting.
        - The output must be only a single block of text.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                maxOutputTokens: 500,
            }
        });

        const objectiveText = response.text;

        if (!objectiveText) {
            throw new Error('Gemini API returned an empty response.');
        }

        return new Response(JSON.stringify({ objective: objectiveText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('AI Report Generation Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
}