import { fetchBrowseCategory } from '@/lib/browse';
import { BrowseCategoryClient } from './BrowseCategoryClient';

// Revalidate every 5 minutes — catalog data changes infrequently
export const revalidate = 300;

export default async function BrowseCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const decoded = decodeURIComponent(category).trim();

  let initialData = null;
  try {
    initialData = await fetchBrowseCategory(decoded);
  } catch {
    // Client will fall back to fetching on its own
  }

  return <BrowseCategoryClient initialData={initialData} />;
}
