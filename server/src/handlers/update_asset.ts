import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type UpdateAssetInput, type AssetWithLocation } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateAsset = async (input: UpdateAssetInput): Promise<AssetWithLocation> => {
  try {
    // First, verify that the asset exists
    const existingAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.id))
      .execute();

    if (existingAsset.length === 0) {
      throw new Error('Asset not found');
    }

    // Validate location_id exists if being updated
    if (input.location_id !== undefined) {
      const location = await db.select()
        .from(locationsTable)
        .where(eq(locationsTable.id, input.location_id))
        .execute();

      if (location.length === 0) {
        throw new Error('Location not found');
      }
    }

    // Check for duplicate asset_number if being updated
    if (input.asset_number !== undefined) {
      const duplicateAssetNumber = await db.select()
        .from(assetsTable)
        .where(and(
          eq(assetsTable.asset_number, input.asset_number),
          ne(assetsTable.id, input.id)
        ))
        .execute();

      if (duplicateAssetNumber.length > 0) {
        throw new Error('Asset number already exists');
      }
    }

    // Check for duplicate serial_number if being updated
    if (input.serial_number !== undefined) {
      const duplicateSerialNumber = await db.select()
        .from(assetsTable)
        .where(and(
          eq(assetsTable.serial_number, input.serial_number),
          ne(assetsTable.id, input.id)
        ))
        .execute();

      if (duplicateSerialNumber.length > 0) {
        throw new Error('Serial number already exists');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.asset_number !== undefined) updateData.asset_number = input.asset_number;
    if (input.serial_number !== undefined) updateData.serial_number = input.serial_number;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.purchase_date !== undefined) updateData.purchase_date = input.purchase_date;
    if (input.purchase_price !== undefined) updateData.purchase_price = input.purchase_price ? input.purchase_price.toString() : null;
    if (input.warranty_expiry !== undefined) updateData.warranty_expiry = input.warranty_expiry;
    if (input.location_id !== undefined) updateData.location_id = input.location_id;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Update the asset
    await db.update(assetsTable)
      .set(updateData)
      .where(eq(assetsTable.id, input.id))
      .execute();

    // Fetch the updated asset with location details
    const result = await db.select()
      .from(assetsTable)
      .innerJoin(locationsTable, eq(assetsTable.location_id, locationsTable.id))
      .where(eq(assetsTable.id, input.id))
      .execute();

    const updatedAsset = result[0];

    // Return the asset with location, converting numeric fields
    return {
      id: updatedAsset.assets.id,
      asset_number: updatedAsset.assets.asset_number,
      serial_number: updatedAsset.assets.serial_number,
      name: updatedAsset.assets.name,
      description: updatedAsset.assets.description,
      category: updatedAsset.assets.category,
      brand: updatedAsset.assets.brand,
      model: updatedAsset.assets.model,
      purchase_date: updatedAsset.assets.purchase_date,
      purchase_price: updatedAsset.assets.purchase_price ? parseFloat(updatedAsset.assets.purchase_price) : null,
      warranty_expiry: updatedAsset.assets.warranty_expiry,
      location_id: updatedAsset.assets.location_id,
      status: updatedAsset.assets.status,
      barcode_data: updatedAsset.assets.barcode_data,
      qr_code_data: updatedAsset.assets.qr_code_data,
      notes: updatedAsset.assets.notes,
      created_at: updatedAsset.assets.created_at,
      updated_at: updatedAsset.assets.updated_at,
      location: {
        id: updatedAsset.locations.id,
        name: updatedAsset.locations.name,
        description: updatedAsset.locations.description,
        created_at: updatedAsset.locations.created_at
      }
    };
  } catch (error) {
    console.error('Asset update failed:', error);
    throw error;
  }
};