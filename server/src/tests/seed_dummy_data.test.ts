import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable, assetsTable } from '../db/schema';
import { seedDummyData } from '../handlers/seed_dummy_data';
import { count, eq } from 'drizzle-orm';

describe('seedDummyData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create dummy data when database is empty', async () => {
    const result = await seedDummyData();

    // Verify the response
    expect(result.message).toContain('Dummy data seeded successfully');
    expect(result.count).toBe(95); // 5 locations + 90 assets (5 assets × 18 categories)
    expect(typeof result.count).toBe('number');
  });

  it('should create the correct number of locations', async () => {
    await seedDummyData();

    const locationCountResult = await db.select({ count: count() }).from(locationsTable);
    const locationCount = locationCountResult[0].count;

    expect(locationCount).toBe(5);
  });

  it('should create the correct number of assets', async () => {
    await seedDummyData();

    const assetCountResult = await db.select({ count: count() }).from(assetsTable);
    const assetCount = assetCountResult[0].count;

    expect(assetCount).toBe(90); // 5 assets per category × 18 categories
  });

  it('should create locations with proper data', async () => {
    await seedDummyData();

    const locations = await db.select().from(locationsTable).execute();

    expect(locations).toHaveLength(5);
    
    // Check that all locations have required fields
    locations.forEach(location => {
      expect(location.id).toBeDefined();
      expect(location.name).toBeDefined();
      expect(typeof location.name).toBe('string');
      expect(location.name.length).toBeGreaterThan(0);
      expect(location.created_at).toBeInstanceOf(Date);
    });

    // Check for specific sample locations
    const locationNames = locations.map(l => l.name);
    expect(locationNames).toContain('Head Office');
    expect(locationNames).toContain('IT Department');
  });

  it('should create assets with all required fields', async () => {
    await seedDummyData();

    const assets = await db.select().from(assetsTable).execute();

    expect(assets).toHaveLength(90);

    // Check the first few assets have all required fields
    assets.slice(0, 5).forEach(asset => {
      expect(asset.id).toBeDefined();
      expect(asset.asset_number).toBeDefined();
      expect(asset.serial_number).toBeDefined();
      expect(asset.name).toBeDefined();
      expect(asset.category).toBeDefined();
      expect(asset.location_id).toBeDefined();
      expect(asset.status).toBeDefined();
      expect(asset.created_at).toBeInstanceOf(Date);
      expect(asset.updated_at).toBeInstanceOf(Date);
      
      // Check asset number format (e.g., "KOM2024001")
      expect(asset.asset_number).toMatch(/^[A-Z]{3}\d{7}$/);
      
      // Check serial number format
      expect(asset.serial_number).toMatch(/^[A-Z]{2}\d{8}$/);
      
      // Check that location_id references existing location
      expect(asset.location_id).toBeGreaterThan(0);
      expect(asset.location_id).toBeLessThanOrEqual(5);
    });
  });

  it('should create assets with proper numeric price conversion', async () => {
    await seedDummyData();

    const assets = await db.select().from(assetsTable).execute();

    // Find assets with purchase prices
    const assetsWithPrices = assets.filter(asset => asset.purchase_price !== null);
    
    expect(assetsWithPrices.length).toBeGreaterThan(0);
    
    assetsWithPrices.slice(0, 5).forEach(asset => {
      // purchase_price should be stored as string in database (numeric column)
      expect(typeof asset.purchase_price).toBe('string');
      // Should be parseable as a valid number
      const price = parseFloat(asset.purchase_price!);
      expect(price).toBeGreaterThan(0);
      expect(isNaN(price)).toBe(false);
    });
  });

  it('should create assets across all categories', async () => {
    await seedDummyData();

    const assets = await db.select().from(assetsTable).execute();

    // Get unique categories
    const categories = [...new Set(assets.map(asset => asset.category))];
    
    // Should have all 18 categories
    expect(categories).toHaveLength(18);
    
    // Check for some specific categories
    expect(categories).toContain('Komputer');
    expect(categories).toContain('Monitor');
    expect(categories).toContain('Printer');
    expect(categories).toContain('Wireless');
  });

  it('should assign assets to valid locations', async () => {
    await seedDummyData();

    const [assets, locations] = await Promise.all([
      db.select().from(assetsTable).execute(),
      db.select().from(locationsTable).execute()
    ]);

    const locationIds = locations.map(l => l.id);

    // Check that all assets have valid location_id
    assets.forEach(asset => {
      expect(locationIds).toContain(asset.location_id);
    });

    // Check that assets are distributed across locations
    const assetLocationIds = assets.map(a => a.location_id);
    const uniqueLocationIds = [...new Set(assetLocationIds)];
    expect(uniqueLocationIds.length).toBeGreaterThan(1); // Should use multiple locations
  });

  it('should assign different statuses to assets', async () => {
    await seedDummyData();

    const assets = await db.select().from(assetsTable).execute();

    // Get unique statuses
    const statuses = [...new Set(assets.map(asset => asset.status))];
    
    // Should have at least Active status, possibly others
    expect(statuses).toContain('Active');
    expect(statuses.length).toBeGreaterThan(0);
    
    // Check that most assets are Active (based on seeding logic)
    const activeAssets = assets.filter(asset => asset.status === 'Active');
    expect(activeAssets.length).toBeGreaterThan(assets.length * 0.5); // More than 50% should be active
  });

  it('should not seed data if database already contains data', async () => {
    // First, seed data
    await seedDummyData();

    // Try to seed again
    const result = await seedDummyData();

    // Should skip seeding
    expect(result.message).toContain('Database already contains data');
    expect(result.count).toBe(0);

    // Verify no additional data was created
    const [assetCountResult, locationCountResult] = await Promise.all([
      db.select({ count: count() }).from(assetsTable),
      db.select({ count: count() }).from(locationsTable)
    ]);

    expect(assetCountResult[0].count).toBe(90);
    expect(locationCountResult[0].count).toBe(5);
  });

  it('should generate unique asset numbers and serial numbers', async () => {
    await seedDummyData();

    const assets = await db.select().from(assetsTable).execute();

    // Check asset numbers are unique
    const assetNumbers = assets.map(a => a.asset_number);
    const uniqueAssetNumbers = [...new Set(assetNumbers)];
    expect(uniqueAssetNumbers).toHaveLength(assetNumbers.length);

    // Check serial numbers are unique
    const serialNumbers = assets.map(a => a.serial_number);
    const uniqueSerialNumbers = [...new Set(serialNumbers)];
    expect(uniqueSerialNumbers).toHaveLength(serialNumbers.length);
  });

  it('should create assets with realistic barcode and QR data', async () => {
    await seedDummyData();

    const assets = await db.select().from(assetsTable).limit(5).execute();

    assets.forEach(asset => {
      // Check barcode data format
      expect(asset.barcode_data).toMatch(/^BARCODE_[A-Z]{3}\d{7}$/);
      
      // Check QR code data format
      expect(asset.qr_code_data).toMatch(/^QR_[A-Z]{3}\d{7}_[A-Z]{2}\d{8}$/);
      
      // Verify they contain the asset number
      expect(asset.barcode_data).toContain(asset.asset_number);
      expect(asset.qr_code_data).toContain(asset.asset_number);
      expect(asset.qr_code_data).toContain(asset.serial_number);
    });
  });

  it('should create assets with valid warranty dates after purchase dates', async () => {
    await seedDummyData();

    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.category, 'Komputer'))
      .limit(5)
      .execute();

    assets.forEach(asset => {
      if (asset.purchase_date && asset.warranty_expiry) {
        expect(asset.warranty_expiry.getTime()).toBeGreaterThan(asset.purchase_date.getTime());
        
        // Warranty should be within reasonable range (1-4 years from purchase)
        const diffInYears = (asset.warranty_expiry.getTime() - asset.purchase_date.getTime()) / (365 * 24 * 60 * 60 * 1000);
        expect(diffInYears).toBeGreaterThan(0.5);
        expect(diffInYears).toBeLessThan(4.5);
      }
    });
  });
});