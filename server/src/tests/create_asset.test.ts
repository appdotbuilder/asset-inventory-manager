import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type CreateAssetInput } from '../schema';
import { createAsset } from '../handlers/create_asset';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateAssetInput = {
  asset_number: 'AST-001',
  serial_number: 'SN-001',
  name: 'Test Computer',
  description: 'A test computer asset',
  category: 'Komputer',
  brand: 'Dell',
  model: 'OptiPlex 7080',
  purchase_date: new Date('2024-01-15'),
  purchase_price: 15000000.50,
  warranty_expiry: new Date('2027-01-15'),
  location_id: 1,
  status: 'Active',
  notes: 'Test asset for unit testing'
};

// Minimal test input with only required fields
const minimalInput: CreateAssetInput = {
  asset_number: 'AST-002',
  serial_number: 'SN-002',
  name: 'Minimal Asset',
  category: 'Monitor',
  location_id: 1,
  status: 'Active'
};

describe('createAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create asset with all fields', async () => {
    // Create prerequisite location
    await db.insert(locationsTable)
      .values({
        name: 'Main Office',
        description: 'Primary office location'
      })
      .execute();

    const result = await createAsset(testInput);

    // Verify basic fields
    expect(result.asset_number).toEqual('AST-001');
    expect(result.serial_number).toEqual('SN-001');
    expect(result.name).toEqual('Test Computer');
    expect(result.description).toEqual('A test computer asset');
    expect(result.category).toEqual('Komputer');
    expect(result.brand).toEqual('Dell');
    expect(result.model).toEqual('OptiPlex 7080');
    expect(result.purchase_date).toEqual(new Date('2024-01-15'));
    expect(typeof result.purchase_price).toEqual('number');
    expect(result.purchase_price).toEqual(15000000.50);
    expect(result.warranty_expiry).toEqual(new Date('2027-01-15'));
    expect(result.location_id).toEqual(1);
    expect(result.status).toEqual('Active');
    expect(result.notes).toEqual('Test asset for unit testing');

    // Verify auto-generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.barcode_data).toEqual('ASSET-AST-001');
    expect(result.qr_code_data).toBeDefined();

    // Verify QR code data contains expected JSON
    const qrData = JSON.parse(result.qr_code_data!);
    expect(qrData.asset_number).toEqual('AST-001');
    expect(qrData.name).toEqual('Test Computer');
    expect(qrData.category).toEqual('Komputer');

    // Verify location details are included
    expect(result.location).toBeDefined();
    expect(result.location.id).toEqual(1);
    expect(result.location.name).toEqual('Main Office');
    expect(result.location.description).toEqual('Primary office location');
  });

  it('should create asset with minimal fields', async () => {
    // Create prerequisite location
    await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: null
      })
      .execute();

    const result = await createAsset(minimalInput);

    // Verify required fields
    expect(result.asset_number).toEqual('AST-002');
    expect(result.serial_number).toEqual('SN-002');
    expect(result.name).toEqual('Minimal Asset');
    expect(result.category).toEqual('Monitor');
    expect(result.location_id).toEqual(1);
    expect(result.status).toEqual('Active');

    // Verify optional fields are null
    expect(result.description).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.model).toBeNull();
    expect(result.purchase_date).toBeNull();
    expect(result.purchase_price).toBeNull();
    expect(result.warranty_expiry).toBeNull();
    expect(result.notes).toBeNull();

    // Verify auto-generated fields still exist
    expect(result.barcode_data).toEqual('ASSET-AST-002');
    expect(result.qr_code_data).toBeDefined();
  });

  it('should save asset to database correctly', async () => {
    // Create prerequisite location
    await db.insert(locationsTable)
      .values({
        name: 'Storage Room',
        description: 'Equipment storage'
      })
      .execute();

    const result = await createAsset(testInput);

    // Query the asset from database
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, result.id))
      .execute();

    expect(assets).toHaveLength(1);
    const savedAsset = assets[0];

    // Verify database storage
    expect(savedAsset.asset_number).toEqual('AST-001');
    expect(savedAsset.serial_number).toEqual('SN-001');
    expect(savedAsset.name).toEqual('Test Computer');
    expect(savedAsset.category).toEqual('Komputer');
    expect(parseFloat(savedAsset.purchase_price!)).toEqual(15000000.50);
    expect(savedAsset.barcode_data).toEqual('ASSET-AST-001');
    expect(savedAsset.qr_code_data).toBeDefined();
    expect(savedAsset.created_at).toBeInstanceOf(Date);
    expect(savedAsset.updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique asset_number constraint', async () => {
    // Create prerequisite location
    await db.insert(locationsTable)
      .values({
        name: 'Office',
        description: 'Main office'
      })
      .execute();

    // Create first asset
    await createAsset(testInput);

    // Try to create asset with same asset_number
    const duplicateInput: CreateAssetInput = {
      ...testInput,
      serial_number: 'SN-DIFFERENT',
      name: 'Different Asset'
    };

    await expect(createAsset(duplicateInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should enforce unique serial_number constraint', async () => {
    // Create prerequisite location
    await db.insert(locationsTable)
      .values({
        name: 'Office',
        description: 'Main office'
      })
      .execute();

    // Create first asset
    await createAsset(testInput);

    // Try to create asset with same serial_number
    const duplicateInput: CreateAssetInput = {
      ...testInput,
      asset_number: 'AST-DIFFERENT',
      name: 'Different Asset'
    };

    await expect(createAsset(duplicateInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should throw error for non-existent location_id', async () => {
    // Try to create asset with non-existent location_id
    const invalidInput: CreateAssetInput = {
      ...testInput,
      location_id: 999
    };

    await expect(createAsset(invalidInput))
      .rejects.toThrow(/Location with id 999 not found/i);
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create prerequisite location
    await db.insert(locationsTable)
      .values({
        name: 'Finance Office',
        description: null
      })
      .execute();

    // Create asset with decimal price
    const priceInput: CreateAssetInput = {
      ...testInput,
      asset_number: 'AST-PRICE',
      serial_number: 'SN-PRICE',
      purchase_price: 1234.56
    };

    const result = await createAsset(priceInput);

    // Verify price is returned as number
    expect(typeof result.purchase_price).toEqual('number');
    expect(result.purchase_price).toEqual(1234.56);

    // Verify it's stored correctly in database
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, result.id))
      .execute();

    expect(parseFloat(assets[0].purchase_price!)).toEqual(1234.56);
  });

  it('should handle all asset categories', async () => {
    // Create prerequisite location
    await db.insert(locationsTable)
      .values({
        name: 'Equipment Room',
        description: null
      })
      .execute();

    const categories = ['Printer', 'Scanner', 'UPS', 'Switch'] as const;
    
    for (const category of categories) {
      const categoryInput: CreateAssetInput = {
        asset_number: `AST-${category}`,
        serial_number: `SN-${category}`,
        name: `Test ${category}`,
        category: category,
        location_id: 1,
        status: 'Active'
      };

      const result = await createAsset(categoryInput);
      expect(result.category).toEqual(category);
    }
  });

  it('should handle all asset statuses', async () => {
    // Create prerequisite location
    await db.insert(locationsTable)
      .values({
        name: 'Status Test Room',
        description: null
      })
      .execute();

    const statuses = ['Active', 'Inactive', 'Maintenance', 'Disposed'] as const;
    
    for (const status of statuses) {
      const statusInput: CreateAssetInput = {
        asset_number: `AST-STATUS-${status}`,
        serial_number: `SN-STATUS-${status}`,
        name: `Test Asset ${status}`,
        category: 'Gadget',
        location_id: 1,
        status: status
      };

      const result = await createAsset(statusInput);
      expect(result.status).toEqual(status);
    }
  });
});