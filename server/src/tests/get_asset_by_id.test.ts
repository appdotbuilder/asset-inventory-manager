import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable, assetsTable } from '../db/schema';
import { type CreateLocationInput, type CreateAssetInput } from '../schema';
import { getAssetById } from '../handlers/get_asset_by_id';
import { eq } from 'drizzle-orm';

describe('getAssetById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return asset with location details when asset exists', async () => {
    // Create test location first
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'IT Department',
        description: 'Information Technology Department'
      })
      .returning()
      .execute();

    const location = locationResult[0];

    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_number: 'AST001',
        serial_number: 'SN123456',
        name: 'Test Computer',
        description: 'A test computer for testing',
        category: 'Komputer',
        brand: 'Dell',
        model: 'OptiPlex 7090',
        purchase_date: new Date('2024-01-15'),
        purchase_price: '1500.00', // String for numeric column
        warranty_expiry: new Date('2027-01-15'),
        location_id: location.id,
        status: 'Active',
        notes: 'Test notes'
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    // Test the handler
    const result = await getAssetById(asset.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(asset.id);
    expect(result!.asset_number).toEqual('AST001');
    expect(result!.serial_number).toEqual('SN123456');
    expect(result!.name).toEqual('Test Computer');
    expect(result!.description).toEqual('A test computer for testing');
    expect(result!.category).toEqual('Komputer');
    expect(result!.brand).toEqual('Dell');
    expect(result!.model).toEqual('OptiPlex 7090');
    expect(result!.purchase_date).toBeInstanceOf(Date);
    expect(result!.purchase_price).toEqual(1500); // Should be converted to number
    expect(typeof result!.purchase_price).toBe('number');
    expect(result!.warranty_expiry).toBeInstanceOf(Date);
    expect(result!.location_id).toEqual(location.id);
    expect(result!.status).toEqual('Active');
    expect(result!.notes).toEqual('Test notes');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify location details are included
    expect(result!.location).toBeDefined();
    expect(result!.location.id).toEqual(location.id);
    expect(result!.location.name).toEqual('IT Department');
    expect(result!.location.description).toEqual('Information Technology Department');
    expect(result!.location.created_at).toBeInstanceOf(Date);
  });

  it('should return null when asset does not exist', async () => {
    const result = await getAssetById(999);
    expect(result).toBeNull();
  });

  it('should handle asset with null purchase_price correctly', async () => {
    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Storage Room',
        description: 'Equipment storage room'
      })
      .returning()
      .execute();

    const location = locationResult[0];

    // Create asset without purchase price
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_number: 'AST002',
        serial_number: 'SN789012',
        name: 'Test Monitor',
        category: 'Monitor',
        location_id: location.id,
        status: 'Active'
        // purchase_price intentionally omitted (null)
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    const result = await getAssetById(asset.id);

    expect(result).toBeDefined();
    expect(result!.purchase_price).toBeNull();
    expect(result!.asset_number).toEqual('AST002');
    expect(result!.name).toEqual('Test Monitor');
    expect(result!.category).toEqual('Monitor');
    expect(result!.location.name).toEqual('Storage Room');
  });

  it('should handle asset with minimal required fields', async () => {
    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Warehouse',
        description: null // Test null description
      })
      .returning()
      .execute();

    const location = locationResult[0];

    // Create asset with only required fields
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_number: 'AST003',
        serial_number: 'SN345678',
        name: 'Basic Printer',
        category: 'Printer',
        location_id: location.id,
        status: 'Inactive'
        // All optional fields omitted
      })
      .returning()
      .execute();

    const asset = assetResult[0];

    const result = await getAssetById(asset.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(asset.id);
    expect(result!.asset_number).toEqual('AST003');
    expect(result!.name).toEqual('Basic Printer');
    expect(result!.category).toEqual('Printer');
    expect(result!.status).toEqual('Inactive');
    expect(result!.description).toBeNull();
    expect(result!.brand).toBeNull();
    expect(result!.model).toBeNull();
    expect(result!.purchase_date).toBeNull();
    expect(result!.purchase_price).toBeNull();
    expect(result!.warranty_expiry).toBeNull();
    expect(result!.barcode_data).toBeNull();
    expect(result!.qr_code_data).toBeNull();
    expect(result!.notes).toBeNull();

    // Verify location with null description
    expect(result!.location.name).toEqual('Warehouse');
    expect(result!.location.description).toBeNull();
  });

  it('should verify asset is saved correctly in database', async () => {
    // Create location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Conference Room',
        description: 'Main conference room'
      })
      .returning()
      .execute();

    const location = locationResult[0];

    // Create asset
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_number: 'AST004',
        serial_number: 'SN901234',
        name: 'Projector LCD',
        category: 'LCD Projector',
        brand: 'Epson',
        purchase_price: '2500.50',
        location_id: location.id,
        status: 'Active'
      })
      .returning()
      .execute();

    const createdAsset = assetResult[0];

    // Get asset through handler
    const result = await getAssetById(createdAsset.id);

    // Verify by querying database directly
    const dbAssets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, createdAsset.id))
      .execute();

    expect(dbAssets).toHaveLength(1);
    expect(dbAssets[0].asset_number).toEqual('AST004');
    expect(dbAssets[0].name).toEqual('Projector LCD');
    expect(parseFloat(dbAssets[0].purchase_price!)).toEqual(2500.50);

    // Verify handler result matches database
    expect(result!.asset_number).toEqual(dbAssets[0].asset_number);
    expect(result!.name).toEqual(dbAssets[0].name);
    expect(result!.purchase_price).toEqual(parseFloat(dbAssets[0].purchase_price!));
  });
});