import { fetchDeviceListings } from '@/lib/device-listings';
import { DeviceDetailClient } from './DeviceDetailClient';

// Revalidate every 60s — listings change more frequently than the catalog
export const revalidate = 60;

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ category: string; brand: string; model: string }>;
}) {
  const { category, brand, model } = await params;

  let initialData = null;
  try {
    initialData = await fetchDeviceListings({
      brand: decodeURIComponent(brand),
      model: decodeURIComponent(model),
      category: decodeURIComponent(category),
      offset: 0,
      limit: 20,
    });
  } catch {
    // Client will fall back to fetching on its own
  }

  return <DeviceDetailClient initialData={initialData} />;
}
