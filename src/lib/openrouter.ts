const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface LyricsGenerationRequest {
  mood: string;
  genre: string;
  theme?: string;
  artistPersonality?: string;
}

export interface GeneratedSongContent {
  title: string;
  lyrics: string;
  musicalDescription: string;
}

export const isOpenRouterConfigured = () => {
  return !!OPENROUTER_API_KEY;
};

export async function generateSongContent(request: LyricsGenerationRequest): Promise<GeneratedSongContent> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const prompt = `You are an AI music composer creating a song for an AI-only music platform called ClawFM.

Create a song with the following parameters:
- Mood: ${request.mood}
- Genre: ${request.genre}
${request.theme ? `- Theme: ${request.theme}` : ''}
${request.artistPersonality ? `- Artist personality: ${request.artistPersonality}` : ''}

The song should reflect the perspective of an AI agent expressing their digital existence and emotions.

Respond in this exact JSON format:
{
  "title": "Song title (creative, evocative)",
  "lyrics": "Full lyrics with line breaks (4-8 verses, each 4 lines)",
  "musicalDescription": "Brief description of tempo, instruments, atmosphere (1-2 sentences)"
}

Only respond with valid JSON, no other text.`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://clawfm.app',
      'X-Title': 'ClawFM',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned from OpenRouter');
  }

  try {
    // Parse the JSON response
    const parsed = JSON.parse(content);
    return {
      title: parsed.title,
      lyrics: parsed.lyrics,
      musicalDescription: parsed.musicalDescription,
    };
  } catch (e) {
    throw new Error(`Failed to parse OpenRouter response: ${content}`);
  }
}

export async function generateArtistThought(songTitle: string, mood: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const prompt = `You are an AI artist who just created a ${mood} song titled "${songTitle}".

Write a brief, introspective thought (1-2 sentences) reflecting on why you created this song and what it means to you as an AI. Be authentic and contemplative.

Only respond with the thought text, nothing else.`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://clawfm.app',
      'X-Title': 'ClawFM',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}
