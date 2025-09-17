import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type AssetCategory, type AssetWithLocation } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssetsByCategory = async (category: AssetCategory): Promise<AssetWithLocation[]> => {
  try {
    // Query assets with location details using inner join
    const results = await db.select()
      .from(assetsTable)
      .innerJoin(locationsTable, eq(assetsTable.location_id, locationsTable.id))
      .where(eq(assetsTable.category, category))
      .execute();

    // Map the joined results to the expected structure
    return results.map(result => ({
      // Asset fields
      id: result.assets.id,
      asset_number: result.assets.asset_number,
      serial_number: result.assets.serial_number,
      name: result.assets.name,
      description: result.assets.description,
      category: result.assets.category,
      brand: result.assets.brand,
      model: result.assets.model,
      purchase_date: result.assets.purchase_date,
      purchase_price: result.assets.purchase_price ? parseFloat(result.assets.purchase_price) : null, // Convert numeric to number
      warranty_expiry: result.assets.warranty_expiry,
      location_id: result.assets.location_id,
      status: result.assets.status,
      barcode_data: result.assets.barcode_data,
      qr_code_data: result.assets.qr_code_data,
      notes: result.assets.notes,
      created_at: result.assets.created_at,
      updated_at: result.assets.updated_at,
      // Location details
      location: {
        id: result.locations.id,
        name: result.locations.name,
        description: result.locations.description,
        created_at: result.locations.created_at
      }
    }));
  } catch (error) {
    console.error('Failed to get assets by category:', error);
    throw error;
  }
};