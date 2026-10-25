import Anthropic from '@anthropic-ai/sdk';

/**
 * Natural-language advice from Claude, on top of the app's fixed rules. The
 * API key stays on the server; the app sends a short summary of the week,
 * only after the user agreed to it.
 */
export type AdviceGenerator = (input: {
  summary: string;
  question: string;
  language: string;
}) => Promise<{ ok: true; text: string } | { ok: false; reason: 'refused' | 'unavailable' }>;

export const ADVICE_MODEL = 'claude-opus-5-5';

const SYSTEM_PROMPT = `Tu es le coach de musculation de l'application Trainerr. Tu reçois le résumé de la semaine d'un pratiquant (séances, séries, charges, gênes signalées) et parfois une question.

Réponds en 4 à 6 phrases courtes, concrètes, encourageantes, sans culpabiliser, dans la langue demandée.
- Appuie-toi sur les données du résumé ; ne les invente pas.
- Les règles de l'appli décident déjà des charges : ne propose pas d'autre charge chiffrée, commente plutôt la régularité, la technique, la récupération, l'équilibre entre muscles.
- Tu n'es ni médecin ni kiné : en cas de gêne ou de douleur, conseille le repos et de consulter un professionnel si elle persiste ; en cas de douleur vive, thoracique ou d'essoufflement, dis d'arrêter et d'appeler les secours.
- Pas de conseil sur des médicaments, des produits dopants ni des régimes extrêmes.`;

export function claudeAdvice(client: Anthropic = new Anthropic()): AdviceGenerator {
  return async ({ summary, question, language }) => {
    try {
      const response = await client.beta.messages.create({
        model: ADVICE_MODEL,
        max_tokens: 16000,
        // Short coaching answers: the default effort of this model is enough.
        output_config: { effort: 'medium' },
        // If a safety classifier declines, the API retries on a suitable model by itself.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Langue de la réponse : ${language}\n\nRésumé de ma semaine :\n${summary}\n\n${
              question ? `Ma question : ${question}` : 'Que me conseilles-tu pour la suite ?'
            }`,
          },
        ],
      });
      if (response.stop_reason === 'refusal') return { ok: false, reason: 'refused' };
      const text = response.content
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('\n')
        .trim();
      return text ? { ok: true, text } : { ok: false, reason: 'unavailable' };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: 'unavailable' };
      if (error instanceof Anthropic.APIError) {
        console.error(`Claude API error ${error.status}: ${error.message}`);
        return { ok: false, reason: 'unavailable' };
      }
      throw error;
    }
  };
}
