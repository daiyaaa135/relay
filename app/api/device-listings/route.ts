import { NextRequest } from 'next/server';
import { fetchDeviceListings } from '@/lib/device-listings';

export type { DeviceListing, DeviceListingsResponse } from '@/lib/device-listings';

/** GET /api/device-listings?brand=Apple&model=iPhone+13&category=Phones&offset=0&limit=20 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const brand = (searchParams.get('brand') ?? '').trim();
  const model = (searchParams.get('model') ?? '').trim();
  const category = (searchParams.get('category') ?? '').trim();
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

  const data = await fetchDeviceListings({ brand, model, category, offset, limit });
  return Response.json(data);
}
