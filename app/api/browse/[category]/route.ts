import { NextRequest } from 'next/server';
import { fetchBrowseCategory, VALID_CATEGORIES } from '@/lib/browse';

export type { BrowseDevice, BrowseResponse } from '@/lib/browse';

/** GET /api/browse/[category] - devices grouped by brand (or console for Video Games). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const rawCategory = (await params).category?.trim() || '';
  const category = rawCategory ? decodeURIComponent(rawCategory) : '';
  if (!VALID_CATEGORIES.has(category)) {
    return Response.json({ error: 'Invalid category' }, { status: 400 });
  }
  const data = await fetchBrowseCategory(category);
  return Response.json(data);
}
