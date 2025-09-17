import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { getAssetSummary } from '../handlers/get_asset_summary';

describe('getAssetSummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty summary when no assets exist', async () => {
    const result = await getAssetSummary();

    expect(result.total_assets).toEqual(0);
    expect(result.categories).toHaveLength(0);
    expect(result.status_counts).toHaveLength(0);
    expect(result.recent_assets).toHaveLength(0);
  });

  it('should return correct asset summary with sample data', async () => {
    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'IT Office',
        description: 'Main IT department office'
      })
      .returning()
      .execute();

    const locationId = locationResult[0].id;

    // Create test assets with different categories and statuses
    await db.insert(assetsTable).values([
      {
        asset_number: 'AST001',
        serial_number: 'SN001',
        name: 'Dell Computer',
        category: 'Komputer',
        status: 'Active',
        location_id: locationId,
        purchase_price: '1500.00'
      },
      {
        asset_number: 'AST002',
        serial_number: 'SN002', 
        name: 'HP Monitor',
        category: 'Monitor',
        status: 'Active',
        location_id: locationId,
        purchase_price: '300.50'
      },
      {
        asset_number: 'AST003',
        serial_number: 'SN003',
        name: 'Canon Printer',
        category: 'Printer',
        status: 'Maintenance',
        location_id: locationId
      },
      {
        asset_number: 'AST004',
        serial_number: 'SN004',
        name: 'Old Computer',
        category: 'Komputer',
        status: 'Disposed',
        location_id: locationId
      }
    ]).execute();

    const result = await getAssetSummary();

    // Check total assets
    expect(result.total_assets).toEqual(4);

    // Check categories count
    expect(result.categories).toHaveLength(3);
    
    const computerCategory = result.categories.find(c => c.category === 'Komputer');
    expect(computerCategory?.count).toEqual(2);
    
    const monitorCategory = result.categories.find(c => c.category === 'Monitor');
    expect(monitorCategory?.count).toEqual(1);
    
    const printerCategory = result.categories.find(c => c.category === 'Printer');
    expect(printerCategory?.count).toEqual(1);

    // Check status counts
    expect(result.status_counts).toHaveLength(3);
    
    const activeStatus = result.status_counts.find(s => s.status === 'Active');
    expect(activeStatus?.count).toEqual(2);
    
    const maintenanceStatus = result.status_counts.find(s => s.status === 'Maintenance');
    expect(maintenanceStatus?.count).toEqual(1);
    
    const disposedStatus = result.status_counts.find(s => s.status === 'Disposed');
    expect(disposedStatus?.count).toEqual(1);

    // Check recent assets (should be all 4, ordered by created_at desc)
    expect(result.recent_assets).toHaveLength(4);
    
    // Verify assets are ordered by creation date (newest first)
    const firstAsset = result.recent_assets[0];
    const lastAsset = result.recent_assets[3];
    expect(firstAsset.created_at >= lastAsset.created_at).toBe(true);

    // Verify asset structure and location data
    result.recent_assets.forEach(asset => {
      expect(asset.id).toBeDefined();
      expect(asset.asset_number).toMatch(/^AST\d{3}$/);
      expect(asset.location).toBeDefined();
      expect(asset.location.name).toEqual('IT Office');
      expect(asset.location.description).toEqual('Main IT department office');
      expect(asset.created_at).toBeInstanceOf(Date);
      expect(asset.updated_at).toBeInstanceOf(Date);
      expect(asset.location.created_at).toBeInstanceOf(Date);
    });

    // Verify numeric field conversions
    const assetWithPrice = result.recent_assets.find(a => a.purchase_price !== null);
    if (assetWithPrice) {
      expect(typeof assetWithPrice.purchase_price).toBe('number');
    }
  });

  it('should limit recent assets to 5 items', async () => {
    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Location for testing'
      })
      .returning()
      .execute();

    const locationId = locationResult[0].id;

    // Create 7 test assets
    const assetsToCreate = [];
    for (let i = 1; i <= 7; i++) {
      assetsToCreate.push({
        asset_number: `AST${i.toString().padStart(3, '0')}`,
        serial_number: `SN${i.toString().padStart(3, '0')}`,
        name: `Test Asset ${i}`,
        category: 'Komputer' as const,
        status: 'Active' as const,
        location_id: locationId
      });
    }

    await db.insert(assetsTable)
      .values(assetsToCreate)
      .execute();

    const result = await getAssetSummary();

    expect(result.total_assets).toEqual(7);
    expect(result.recent_assets).toHaveLength(5);
  });

  it('should handle assets with multiple locations', async () => {
    // Create multiple test locations
    const location1Result = await db.insert(locationsTable)
      .values({
        name: 'Office A',
        description: 'First office'
      })
      .returning()
      .execute();

    const location2Result = await db.insert(locationsTable)
      .values({
        name: 'Office B',
        description: 'Second office'
      })
      .returning()
      .execute();

    const locationId1 = location1Result[0].id;
    const locationId2 = location2Result[0].id;

    // Create assets in different locations
    await db.insert(assetsTable).values([
      {
        asset_number: 'AST001',
        serial_number: 'SN001',
        name: 'Computer A',
        category: 'Komputer',
        status: 'Active',
        location_id: locationId1
      },
      {
        asset_number: 'AST002',
        serial_number: 'SN002',
        name: 'Computer B',
        category: 'Komputer',
        status: 'Active',
        location_id: locationId2
      }
    ]).execute();

    const result = await getAssetSummary();

    expect(result.total_assets).toEqual(2);
    expect(result.recent_assets).toHaveLength(2);

    // Check that each asset has correct location data
    const assetA = result.recent_assets.find(a => a.name === 'Computer A');
    const assetB = result.recent_assets.find(a => a.name === 'Computer B');

    expect(assetA?.location.name).toEqual('Office A');
    expect(assetB?.location.name).toEqual('Office B');
  });

  it('should handle assets with null purchase prices correctly', async () => {
    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Location for testing'
      })
      .returning()
      .execute();

    const locationId = locationResult[0].id;

    // Create assets with and without purchase prices
    await db.insert(assetsTable).values([
      {
        asset_number: 'AST001',
        serial_number: 'SN001',
        name: 'Asset with price',
        category: 'Komputer',
        status: 'Active',
        location_id: locationId,
        purchase_price: '999.99'
      },
      {
        asset_number: 'AST002',
        serial_number: 'SN002',
        name: 'Asset without price',
        category: 'Monitor',
        status: 'Active',
        location_id: locationId
        // purchase_price intentionally omitted
      }
    ]).execute();

    const result = await getAssetSummary();

    expect(result.total_assets).toEqual(2);
    
    const assetWithPrice = result.recent_assets.find(a => a.name === 'Asset with price');
    const assetWithoutPrice = result.recent_assets.find(a => a.name === 'Asset without price');

    expect(assetWithPrice?.purchase_price).toEqual(999.99);
    expect(typeof assetWithPrice?.purchase_price).toBe('number');
    expect(assetWithoutPrice?.purchase_price).toBeNull();
  });
});