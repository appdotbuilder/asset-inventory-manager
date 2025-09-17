import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type AssetSummary } from '../schema';
import { count, desc, eq, sql } from 'drizzle-orm';

export const getAssetSummary = async (): Promise<AssetSummary> => {
  try {
    // Get total asset count
    const totalResult = await db.select({
      count: count()
    })
    .from(assetsTable)
    .execute();

    const totalAssets = totalResult[0]?.count || 0;

    // Get asset counts by category
    const categoryResults = await db.select({
      category: assetsTable.category,
      count: count()
    })
    .from(assetsTable)
    .groupBy(assetsTable.category)
    .execute();

    // Get asset counts by status
    const statusResults = await db.select({
      status: assetsTable.status,
      count: count()
    })
    .from(assetsTable)
    .groupBy(assetsTable.status)
    .execute();

    // Get recent assets (last 5 created) with location details
    const recentResults = await db.select()
      .from(assetsTable)
      .innerJoin(locationsTable, eq(assetsTable.location_id, locationsTable.id))
      .orderBy(desc(assetsTable.created_at))
      .limit(5)
      .execute();

    // Transform recent assets data with proper numeric conversions
    const recentAssets = recentResults.map(result => ({
      id: result.assets.id,
      asset_number: result.assets.asset_number,
      serial_number: result.assets.serial_number,
      name: result.assets.name,
      description: result.assets.description,
      category: result.assets.category,
      brand: result.assets.brand,
      model: result.assets.model,
      purchase_date: result.assets.purchase_date,
      purchase_price: result.assets.purchase_price ? parseFloat(result.assets.purchase_price) : null,
      warranty_expiry: result.assets.warranty_expiry,
      location_id: result.assets.location_id,
      status: result.assets.status,
      barcode_data: result.assets.barcode_data,
      qr_code_data: result.assets.qr_code_data,
      notes: result.assets.notes,
      created_at: result.assets.created_at,
      updated_at: result.assets.updated_at,
      location: {
        id: result.locations.id,
        name: result.locations.name,
        description: result.locations.description,
        created_at: result.locations.created_at
      }
    }));

    return {
      total_assets: totalAssets,
      categories: categoryResults.map(row => ({
        category: row.category,
        count: row.count
      })),
      status_counts: statusResults.map(row => ({
        status: row.status,
        count: row.count
      })),
      recent_assets: recentAssets
    };
  } catch (error) {
    console.error('Asset summary fetch failed:', error);
    throw error;
  }
};