import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type AssetWithLocation } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssetById = async (id: number): Promise<AssetWithLocation | null> => {
  try {
    // Query asset with location details using inner join
    const results = await db.select()
      .from(assetsTable)
      .innerJoin(locationsTable, eq(assetsTable.location_id, locationsTable.id))
      .where(eq(assetsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Extract data from joined result
    const result = results[0];
    const asset = result.assets;
    const location = result.locations;

    // Convert numeric fields and construct the response
    return {
      id: asset.id,
      asset_number: asset.asset_number,
      serial_number: asset.serial_number,
      name: asset.name,
      description: asset.description,
      category: asset.category,
      brand: asset.brand,
      model: asset.model,
      purchase_date: asset.purchase_date,
      purchase_price: asset.purchase_price ? parseFloat(asset.purchase_price) : null,
      warranty_expiry: asset.warranty_expiry,
      location_id: asset.location_id,
      status: asset.status,
      barcode_data: asset.barcode_data,
      qr_code_data: asset.qr_code_data,
      notes: asset.notes,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
      location: {
        id: location.id,
        name: location.name,
        description: location.description,
        created_at: location.created_at
      }
    };
  } catch (error) {
    console.error('Get asset by ID failed:', error);
    throw error;
  }
};