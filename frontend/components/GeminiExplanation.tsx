import { AnalysisResult } from '@/lib/types';

export function GeminiExplanation({ result }: { result: AnalysisResult }) {
  const explanation = result.ai_explanation;
  if (!explanation) return null;

  let message = 'Gemini could not provide an explanation for this scan.';
  if (explanation.status === 'generated' && explanation.summary) {
    message = explanation.summary;
  } else if (explanation.status === 'not_configured') {
    message = 'The server needs a Gemini API key to generate an explanation.';
  }

  return (
    <section className="border-t border-clinical-border bg-clinical-surface px-4 py-4 sm:px-6">
      <h2 className="font-serif text-base font-bold text-clinical-navy">Gemini explanation</h2>
      <p className="mt-1 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-clinical-subtext">
        {message}
      </p>
    </section>
  );
}
