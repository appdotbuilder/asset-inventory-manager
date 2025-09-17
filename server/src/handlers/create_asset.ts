import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type CreateAssetInput, type AssetWithLocation } from '../schema';
import { eq } from 'drizzle-orm';

export const createAsset = async (input: CreateAssetInput): Promise<AssetWithLocation> => {
  try {
    // First, verify that the location exists
    const location = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.location_id))
      .execute();

    if (location.length === 0) {
      throw new Error(`Location with id ${input.location_id} not found`);
    }

    // Generate barcode and QR code data based on asset number
    const barcodeData = `ASSET-${input.asset_number}`;
    const qrCodeData = JSON.stringify({
      asset_number: input.asset_number,
      name: input.name,
      category: input.category
    });

    // Insert the new asset
    const result = await db.insert(assetsTable)
      .values({
        asset_number: input.asset_number,
        serial_number: input.serial_number,
        name: input.name,
        description: input.description || null,
        category: input.category,
        brand: input.brand || null,
        model: input.model || null,
        purchase_date: input.purchase_date || null,
        purchase_price: input.purchase_price ? input.purchase_price.toString() : null,
        warranty_expiry: input.warranty_expiry || null,
        location_id: input.location_id,
        status: input.status,
        barcode_data: barcodeData,
        qr_code_data: qrCodeData,
        notes: input.notes || null
      })
      .returning()
      .execute();

    const createdAsset = result[0];

    // Return the asset with location details
    return {
      ...createdAsset,
      purchase_price: createdAsset.purchase_price ? parseFloat(createdAsset.purchase_price) : null,
      location: location[0]
    };
  } catch (error) {
    console.error('Asset creation failed:', error);
    throw error;
  }
};