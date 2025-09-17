import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { deleteAsset } from '../handlers/delete_asset';
import { eq } from 'drizzle-orm';

describe('deleteAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing asset and return true', async () => {
    // Create a location first (required for asset)
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Office',
        description: 'Office for testing'
      })
      .returning()
      .execute();

    // Create an asset to delete
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_number: 'AST-001',
        serial_number: 'SN-001',
        name: 'Test Asset',
        description: 'Asset for deletion test',
        category: 'Komputer',
        brand: 'Test Brand',
        model: 'Test Model',
        location_id: locationResult[0].id,
        status: 'Active'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Delete the asset
    const result = await deleteAsset(assetId);

    // Should return true indicating successful deletion
    expect(result).toBe(true);

    // Verify asset is actually deleted from database
    const deletedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(deletedAsset).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent asset', async () => {
    // Try to delete an asset with ID that doesn't exist
    const nonExistentId = 99999;
    const result = await deleteAsset(nonExistentId);

    // Should return false indicating asset was not found
    expect(result).toBe(false);
  });

  it('should handle deletion of asset with all optional fields populated', async () => {
    // Create a location first
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Complete Test Office',
        description: 'Office with complete asset'
      })
      .returning()
      .execute();

    // Create asset with all fields populated
    const purchaseDate = new Date('2023-01-15');
    const warrantyExpiry = new Date('2026-01-15');

    const assetResult = await db.insert(assetsTable)
      .values({
        asset_number: 'AST-COMPLETE-001',
        serial_number: 'SN-COMPLETE-001',
        name: 'Complete Test Asset',
        description: 'Asset with all fields for deletion test',
        category: 'Monitor',
        brand: 'Dell',
        model: 'UltraSharp 27',
        purchase_date: purchaseDate,
        purchase_price: '599.99', // String for numeric column
        warranty_expiry: warrantyExpiry,
        location_id: locationResult[0].id,
        status: 'Maintenance',
        barcode_data: 'BARCODE123',
        qr_code_data: 'QRCODE123',
        notes: 'Special handling required'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Delete the complete asset
    const result = await deleteAsset(assetId);

    // Should return true
    expect(result).toBe(true);

    // Verify deletion
    const deletedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(deletedAsset).toHaveLength(0);
  });

  it('should delete asset without affecting other assets', async () => {
    // Create a location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Multi Asset Office',
        description: 'Office with multiple assets'
      })
      .returning()
      .execute();

    // Create multiple assets
    const assetsToCreate = [
      {
        asset_number: 'AST-MULTI-001',
        serial_number: 'SN-MULTI-001',
        name: 'First Asset',
        category: 'Komputer' as const,
        location_id: locationResult[0].id,
        status: 'Active' as const
      },
      {
        asset_number: 'AST-MULTI-002',
        serial_number: 'SN-MULTI-002',
        name: 'Second Asset',
        category: 'Printer' as const,
        location_id: locationResult[0].id,
        status: 'Active' as const
      },
      {
        asset_number: 'AST-MULTI-003',
        serial_number: 'SN-MULTI-003',
        name: 'Third Asset',
        category: 'Scanner' as const,
        location_id: locationResult[0].id,
        status: 'Active' as const
      }
    ];

    const createdAssets = await db.insert(assetsTable)
      .values(assetsToCreate)
      .returning()
      .execute();

    const assetToDelete = createdAssets[1]; // Delete the middle one

    // Delete one asset
    const result = await deleteAsset(assetToDelete.id);

    expect(result).toBe(true);

    // Verify only one asset was deleted
    const remainingAssets = await db.select()
      .from(assetsTable)
      .execute();

    expect(remainingAssets).toHaveLength(2);

    // Verify the correct asset was deleted
    const deletedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetToDelete.id))
      .execute();

    expect(deletedAsset).toHaveLength(0);

    // Verify other assets still exist
    const remainingAssetNames = remainingAssets.map(asset => asset.name).sort();
    expect(remainingAssetNames).toEqual(['First Asset', 'Third Asset']);
  });
});