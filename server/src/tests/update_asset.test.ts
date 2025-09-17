import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type UpdateAssetInput, type CreateLocationInput } from '../schema';
import { updateAsset } from '../handlers/update_asset';
import { eq } from 'drizzle-orm';

// Test data
const testLocation: CreateLocationInput = {
  name: 'Test Office',
  description: 'Main testing office'
};

const secondLocation: CreateLocationInput = {
  name: 'Secondary Office',
  description: 'Second testing location'
};

const baseAsset = {
  asset_number: 'AST-001',
  serial_number: 'SN-12345',
  name: 'Test Computer',
  description: 'A test computer asset',
  category: 'Komputer' as const,
  brand: 'Dell',
  model: 'OptiPlex 3080',
  purchase_date: new Date('2023-01-15'),
  purchase_price: 1500.00,
  warranty_expiry: new Date('2025-01-15'),
  status: 'Active' as const,
  notes: 'Initial test asset'
};

const secondAsset = {
  asset_number: 'AST-002',
  serial_number: 'SN-67890',
  name: 'Test Monitor',
  description: 'A test monitor asset',
  category: 'Monitor' as const,
  brand: 'Samsung',
  model: 'S24E450F',
  purchase_date: new Date('2023-02-01'),
  purchase_price: 250.00,
  warranty_expiry: new Date('2026-02-01'),
  status: 'Active' as const,
  notes: 'Secondary test asset'
};

describe('updateAsset', () => {
  let locationId: number;
  let secondLocationId: number;
  let assetId: number;
  let secondAssetId: number;

  beforeEach(async () => {
    await createDB();

    // Create test locations
    const locationResult = await db.insert(locationsTable)
      .values({
        name: testLocation.name,
        description: testLocation.description
      })
      .returning()
      .execute();
    locationId = locationResult[0].id;

    const secondLocationResult = await db.insert(locationsTable)
      .values({
        name: secondLocation.name,
        description: secondLocation.description
      })
      .returning()
      .execute();
    secondLocationId = secondLocationResult[0].id;

    // Create test assets
    const assetResult = await db.insert(assetsTable)
      .values({
        ...baseAsset,
        location_id: locationId,
        purchase_price: baseAsset.purchase_price.toString()
      })
      .returning()
      .execute();
    assetId = assetResult[0].id;

    const secondAssetResult = await db.insert(assetsTable)
      .values({
        ...secondAsset,
        location_id: locationId,
        purchase_price: secondAsset.purchase_price.toString()
      })
      .returning()
      .execute();
    secondAssetId = secondAssetResult[0].id;
  });

  afterEach(resetDB);

  it('should update asset basic fields', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      name: 'Updated Computer Name',
      description: 'Updated description',
      brand: 'HP',
      model: 'EliteDesk 800'
    };

    const result = await updateAsset(updateInput);

    expect(result.id).toBe(assetId);
    expect(result.name).toBe('Updated Computer Name');
    expect(result.description).toBe('Updated description');
    expect(result.brand).toBe('HP');
    expect(result.model).toBe('EliteDesk 800');
    expect(result.asset_number).toBe(baseAsset.asset_number); // Unchanged
    expect(result.serial_number).toBe(baseAsset.serial_number); // Unchanged
    expect(result.category).toBe(baseAsset.category); // Unchanged
    expect(result.location).toBeDefined();
    expect(result.location.name).toBe(testLocation.name);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update asset numbers and validate uniqueness', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      asset_number: 'AST-UPDATED-001',
      serial_number: 'SN-UPDATED-12345'
    };

    const result = await updateAsset(updateInput);

    expect(result.asset_number).toBe('AST-UPDATED-001');
    expect(result.serial_number).toBe('SN-UPDATED-12345');

    // Verify database was updated
    const dbAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(dbAsset[0].asset_number).toBe('AST-UPDATED-001');
    expect(dbAsset[0].serial_number).toBe('SN-UPDATED-12345');
  });

  it('should update location', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      location_id: secondLocationId
    };

    const result = await updateAsset(updateInput);

    expect(result.location_id).toBe(secondLocationId);
    expect(result.location.id).toBe(secondLocationId);
    expect(result.location.name).toBe(secondLocation.name);
  });

  it('should update purchase price and dates', async () => {
    const newPurchaseDate = new Date('2023-06-15');
    const newWarrantyExpiry = new Date('2026-06-15');

    const updateInput: UpdateAssetInput = {
      id: assetId,
      purchase_price: 2000.50,
      purchase_date: newPurchaseDate,
      warranty_expiry: newWarrantyExpiry
    };

    const result = await updateAsset(updateInput);

    expect(result.purchase_price).toBe(2000.50);
    expect(typeof result.purchase_price).toBe('number');
    expect(result.purchase_date).toEqual(newPurchaseDate);
    expect(result.warranty_expiry).toEqual(newWarrantyExpiry);
  });

  it('should update status and notes', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      status: 'Maintenance' as const,
      notes: 'Asset under maintenance for hardware upgrade'
    };

    const result = await updateAsset(updateInput);

    expect(result.status).toBe('Maintenance');
    expect(result.notes).toBe('Asset under maintenance for hardware upgrade');
  });

  it('should handle null values correctly', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      description: null,
      brand: null,
      model: null,
      purchase_price: null,
      notes: null
    };

    const result = await updateAsset(updateInput);

    expect(result.description).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.model).toBeNull();
    expect(result.purchase_price).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('should update category', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      category: 'Scanner' as const
    };

    const result = await updateAsset(updateInput);

    expect(result.category).toBe('Scanner');
  });

  it('should throw error when asset not found', async () => {
    const updateInput: UpdateAssetInput = {
      id: 99999,
      name: 'Non-existent asset'
    };

    expect(updateAsset(updateInput)).rejects.toThrow(/asset not found/i);
  });

  it('should throw error when location not found', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      location_id: 99999
    };

    expect(updateAsset(updateInput)).rejects.toThrow(/location not found/i);
  });

  it('should throw error when duplicate asset number', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      asset_number: secondAsset.asset_number // Use existing asset number from second asset
    };

    expect(updateAsset(updateInput)).rejects.toThrow(/asset number already exists/i);
  });

  it('should throw error when duplicate serial number', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      serial_number: secondAsset.serial_number // Use existing serial number from second asset
    };

    expect(updateAsset(updateInput)).rejects.toThrow(/serial number already exists/i);
  });

  it('should allow updating to same asset number (no change)', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      asset_number: baseAsset.asset_number, // Same asset number
      name: 'Updated name'
    };

    const result = await updateAsset(updateInput);

    expect(result.asset_number).toBe(baseAsset.asset_number);
    expect(result.name).toBe('Updated name');
  });

  it('should allow updating to same serial number (no change)', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      serial_number: baseAsset.serial_number, // Same serial number
      name: 'Updated name'
    };

    const result = await updateAsset(updateInput);

    expect(result.serial_number).toBe(baseAsset.serial_number);
    expect(result.name).toBe('Updated name');
  });

  it('should update timestamp correctly', async () => {
    const beforeUpdate = new Date();
    
    const updateInput: UpdateAssetInput = {
      id: assetId,
      name: 'Timestamp test'
    };

    const result = await updateAsset(updateInput);
    const afterUpdate = new Date();

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at >= beforeUpdate).toBe(true);
    expect(result.updated_at <= afterUpdate).toBe(true);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should preserve unchanged fields', async () => {
    const updateInput: UpdateAssetInput = {
      id: assetId,
      name: 'Only name updated'
    };

    const result = await updateAsset(updateInput);

    // Verify all other fields remain unchanged
    expect(result.asset_number).toBe(baseAsset.asset_number);
    expect(result.serial_number).toBe(baseAsset.serial_number);
    expect(result.description).toBe(baseAsset.description);
    expect(result.category).toBe(baseAsset.category);
    expect(result.brand).toBe(baseAsset.brand);
    expect(result.model).toBe(baseAsset.model);
    expect(result.status).toBe(baseAsset.status);
    expect(result.purchase_price).toBe(baseAsset.purchase_price);
    expect(result.notes).toBe(baseAsset.notes);
    expect(result.location_id).toBe(locationId);
    
    // Only name should be updated
    expect(result.name).toBe('Only name updated');
  });
});