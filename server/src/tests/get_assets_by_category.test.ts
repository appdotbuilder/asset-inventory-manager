import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type AssetCategory, type CreateLocationInput } from '../schema';
import { getAssetsByCategory } from '../handlers/get_assets_by_category';

// Test data
const testLocation: CreateLocationInput = {
  name: 'Test Office',
  description: 'Main testing office location'
};

const computerAsset = {
  asset_number: 'COMP-001',
  serial_number: 'SN-COMP-001',
  name: 'Dell Desktop Computer',
  description: 'Main workstation computer',
  category: 'Komputer' as AssetCategory,
  brand: 'Dell',
  model: 'OptiPlex 7090',
  purchase_date: new Date('2023-01-15'),
  purchase_price: '15000000', // Store as string for numeric column
  warranty_expiry: new Date('2026-01-15'),
  status: 'Active' as const,
  notes: 'Primary computer for development'
};

const monitorAsset = {
  asset_number: 'MON-001',
  serial_number: 'SN-MON-001',
  name: 'Samsung Monitor',
  description: '24 inch LED monitor',
  category: 'Monitor' as AssetCategory,
  brand: 'Samsung',
  model: 'S24F350FH',
  purchase_date: new Date('2023-02-01'),
  purchase_price: '2500000', // Store as string for numeric column
  warranty_expiry: new Date('2025-02-01'),
  status: 'Active' as const,
  notes: 'Secondary display'
};

const printerAsset = {
  asset_number: 'PRT-001',
  serial_number: 'SN-PRT-001',
  name: 'HP LaserJet Printer',
  description: 'Office laser printer',
  category: 'Printer' as AssetCategory,
  brand: 'HP',
  model: 'LaserJet Pro M404n',
  purchase_date: new Date('2023-03-01'),
  purchase_price: '3500000', // Store as string for numeric column
  warranty_expiry: new Date('2025-03-01'),
  status: 'Active' as const,
  notes: 'Main office printer'
};

describe('getAssetsByCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return assets for specified category', async () => {
    // Create location first
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Create assets with different categories
    await db.insert(assetsTable)
      .values([
        { ...computerAsset, location_id: location.id },
        { ...monitorAsset, location_id: location.id },
        { ...printerAsset, location_id: location.id }
      ])
      .execute();

    // Test filtering by 'Komputer' category
    const computerResults = await getAssetsByCategory('Komputer');

    expect(computerResults).toHaveLength(1);
    expect(computerResults[0].category).toBe('Komputer');
    expect(computerResults[0].name).toBe('Dell Desktop Computer');
    expect(computerResults[0].asset_number).toBe('COMP-001');

    // Verify location details are included
    expect(computerResults[0].location).toBeDefined();
    expect(computerResults[0].location.name).toBe('Test Office');
    expect(computerResults[0].location.description).toBe('Main testing office location');
  });

  it('should return multiple assets for same category', async () => {
    // Create location first
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Create multiple computer assets
    await db.insert(assetsTable)
      .values([
        { ...computerAsset, location_id: location.id },
        { 
          ...computerAsset, 
          asset_number: 'COMP-002',
          serial_number: 'SN-COMP-002',
          name: 'HP Desktop Computer',
          brand: 'HP',
          location_id: location.id 
        }
      ])
      .execute();

    const results = await getAssetsByCategory('Komputer');

    expect(results).toHaveLength(2);
    results.forEach(asset => {
      expect(asset.category).toBe('Komputer');
      expect(asset.location).toBeDefined();
      expect(asset.location.name).toBe('Test Office');
    });
  });

  it('should return empty array for category with no assets', async () => {
    // Create location but no assets
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Create only computer asset
    await db.insert(assetsTable)
      .values({ ...computerAsset, location_id: location.id })
      .execute();

    // Query for UPS category (should be empty)
    const results = await getAssetsByCategory('UPS');

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create location first
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Create asset with price
    await db.insert(assetsTable)
      .values({ ...computerAsset, location_id: location.id })
      .execute();

    const results = await getAssetsByCategory('Komputer');

    expect(results).toHaveLength(1);
    expect(typeof results[0].purchase_price).toBe('number');
    expect(results[0].purchase_price).toBe(15000000);
  });

  it('should handle assets with null purchase price', async () => {
    // Create location first
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Create asset without price
    const assetWithoutPrice = {
      asset_number: 'COMP-002',
      serial_number: 'SN-COMP-002',
      name: 'Dell Desktop Computer',
      description: 'Main workstation computer',
      category: 'Komputer' as AssetCategory,
      brand: 'Dell',
      model: 'OptiPlex 7090',
      purchase_date: new Date('2023-01-15'),
      warranty_expiry: new Date('2026-01-15'),
      status: 'Active' as const,
      notes: 'Primary computer for development',
      location_id: location.id
    };

    await db.insert(assetsTable)
      .values(assetWithoutPrice)
      .execute();

    const results = await getAssetsByCategory('Komputer');

    expect(results).toHaveLength(1);
    expect(results[0].purchase_price).toBeNull();
  });

  it('should return all asset fields and location details', async () => {
    // Create location first
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Create complete asset
    await db.insert(assetsTable)
      .values({ ...computerAsset, location_id: location.id })
      .execute();

    const results = await getAssetsByCategory('Komputer');
    const asset = results[0];

    // Verify all asset fields
    expect(asset.id).toBeDefined();
    expect(asset.asset_number).toBe('COMP-001');
    expect(asset.serial_number).toBe('SN-COMP-001');
    expect(asset.name).toBe('Dell Desktop Computer');
    expect(asset.description).toBe('Main workstation computer');
    expect(asset.category).toBe('Komputer');
    expect(asset.brand).toBe('Dell');
    expect(asset.model).toBe('OptiPlex 7090');
    expect(asset.purchase_date).toBeInstanceOf(Date);
    expect(asset.purchase_price).toBe(15000000);
    expect(asset.warranty_expiry).toBeInstanceOf(Date);
    expect(asset.location_id).toBe(location.id);
    expect(asset.status).toBe('Active');
    expect(asset.barcode_data).toBeNull();
    expect(asset.qr_code_data).toBeNull();
    expect(asset.notes).toBe('Primary computer for development');
    expect(asset.created_at).toBeInstanceOf(Date);
    expect(asset.updated_at).toBeInstanceOf(Date);

    // Verify location details
    expect(asset.location.id).toBe(location.id);
    expect(asset.location.name).toBe('Test Office');
    expect(asset.location.description).toBe('Main testing office location');
    expect(asset.location.created_at).toBeInstanceOf(Date);
  });

  it('should filter correctly across different asset categories', async () => {
    // Create location first
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Create assets with different categories
    await db.insert(assetsTable)
      .values([
        { ...computerAsset, location_id: location.id },
        { ...monitorAsset, location_id: location.id },
        { ...printerAsset, location_id: location.id }
      ])
      .execute();

    // Test each category separately
    const computerResults = await getAssetsByCategory('Komputer');
    const monitorResults = await getAssetsByCategory('Monitor');
    const printerResults = await getAssetsByCategory('Printer');

    expect(computerResults).toHaveLength(1);
    expect(computerResults[0].category).toBe('Komputer');

    expect(monitorResults).toHaveLength(1);
    expect(monitorResults[0].category).toBe('Monitor');

    expect(printerResults).toHaveLength(1);
    expect(printerResults[0].category).toBe('Printer');
  });
});