import { NextRequest } from 'next/server';
import { createAnonClient } from '@/lib/supabase-server';

function buildConditionPrompt(userFront: string, userBack: string): string {
  return `You are a device condition evaluator. The user has provided:

Self-reported front screen condition: ${userFront}
Self-reported back screen condition: ${userBack}
Captured images of the device (front and back and the sides)

Your task:
Analyze the captured images and compare them against the user's self-reported conditions. Based on both the images and the user's selections, assign an overall device grade using the following scale:

New – unused, sealed
Mint – Like new, no visible wear, scratches, or blemishes
Good – Light wear, minor cosmetic issues (small scratches, light scuffs), fully functional
Fair – Moderate wear, clearly visible scratches/scuffs/dents, fully functional
Poor – Heavy wear, possible cracks/damage, may have functional issues

Instructions:
- Evaluate the front screen from the image — note any scratches, cracks, dead pixels, or wear
- Evaluate the back & sides from the image — note any dents, scuffs, scratches, or damage
- Compare your visual assessment against the user's self-reported conditions for both front and back
- If the images suggest a worse condition than what the user reported, prioritize what the images show and flag the discrepancy
- Provide a final overall grade with a brief justification covering both front and back

Reply with exactly two lines: first line the category only (New, Mint, Good, Fair, or Poor), second line the percentage from 30-95 (number only, e.g. 85).`;
}

const VALID_CONDITIONS = ['New', 'Mint', 'Good', 'Fair', 'Poor'] as const;
type Condition = (typeof VALID_CONDITIONS)[number];

function parseCondition(text: string): Condition | null {
  const trimmed = text.trim();
  const match = trimmed.match(/\b(New|Mint|Good|Fair|Poor)\b/i);
  if (match) {
    const cap = match[1];
    return VALID_CONDITIONS.find((c) => c.toLowerCase() === cap.toLowerCase()) ?? null;
  }
  return null;
}

function parsePercentage(text: string): number | null {
  const trimmed = text.trim();
  const match = trimmed.match(/\b(3[0-9]|[4-8][0-9]|9[0-5])\b/);
  if (match) {
    const num = parseInt(match[1]!, 10);
    return Math.min(95, Math.max(30, num));
  }
  const anyNum = trimmed.match(/\b(\d{1,3})\b/);
  if (anyNum) {
    const num = parseInt(anyNum[1]!, 10);
    return Math.min(95, Math.max(30, num));
  }
  return null;
}

export async function POST(request: NextRequest) {
  // Require auth to prevent unauthenticated callers from burning OpenAI credits
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const anon = createAnonClient(token);
  const { data: { user }, error: authError } = await anon.auth.getUser(token);
  if (authError || !user?.id) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not set.' },
      { status: 500 }
    );
  }

  let body: { imageUrls?: string[]; user_front_condition?: string; user_back_condition?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const imageUrls = Array.isArray(body?.imageUrls) ? body.imageUrls : [];
  const userFront = String(body?.user_front_condition ?? 'Not reported').trim();
  const userBack = String(body?.user_back_condition ?? 'Not reported').trim();

  if (imageUrls.length === 0) {
    return Response.json({ error: 'imageUrls array is required and must not be empty.' }, { status: 400 });
  }

  const prompt = buildConditionPrompt(userFront || 'Not reported', userBack || 'Not reported');
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text: prompt }];
  for (const url of imageUrls) {
    if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:'))) {
      content.push({ type: 'image_url', image_url: { url } });
    }
  }

  if (content.length === 1) {
    return Response.json({ error: 'No valid image URLs provided.' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 256,
        messages: [{ role: 'user', content }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      const msg = data?.error?.message ?? res.statusText;
      return Response.json({ error: `OpenAI API error: ${msg}` }, { status: res.status >= 500 ? 502 : 400 });
    }

    const text = data?.choices?.[0]?.message?.content ?? '';
    const condition = parseCondition(text);
    if (!condition) {
      return Response.json(
        { error: 'Could not parse condition from response.', raw: text.slice(0, 200) },
        { status: 502 }
      );
    }
    const lines = text.trim().split(/\r?\n/);
    const secondLine = lines.length > 1 ? lines[1]?.trim() : '';
    const percentage = parsePercentage(secondLine || text) ?? 70;
    return Response.json({ condition, percentage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Condition analysis failed: ${msg}` }, { status: 500 });
  }
}
