import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        status: 'not_configured',
        summary: 'To enable Gemini AI explanations, configure GEMINI_API_KEY in your environment variables.'
      });
    }

    const { verdict, confidence, sharpness_score, flags, extracted_fields } = body;

    const prompt = `You are an expert pharmaceutical packaging forensic analyst.
Explain the following optical screening scan results in 2-3 concise, professional sentences:
- Screening Verdict: ${verdict}
- Confidence: ${confidence ? Math.round(confidence * 100) : 0}%
- Print Sharpness Score: ${sharpness_score}/100
- Extracted Batch: ${extracted_fields?.batch_number || 'None'}
- Extracted Expiry: ${extracted_fields?.exp_date_str || 'None'}
- Detected Flags: ${flags?.map((f: { issue: string }) => f.issue).join('; ') || 'None'}

Note: Packaging visual checks screen for visible print anomalies and do not replace chemical assay testing. Keep explanation clear and clinical.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.2 }
      }),
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      return NextResponse.json({ status: 'unavailable', summary: null });
    }

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

    return NextResponse.json({
      status: summary ? 'generated' : 'unavailable',
      summary
    });
  } catch (error) {
    console.error('Gemini explanation route error:', error);
    return NextResponse.json({ status: 'unavailable', summary: null });
  }
}
