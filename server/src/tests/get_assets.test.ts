import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type GetAssetsQuery } from '../schema';
import { getAssets } from '../handlers/get_assets';

describe('getAssets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data helper
  const createTestData = async () => {
    // Create locations
    const locationResults = await db.insert(locationsTable)
      .values([
        { name: 'Office A', description: 'Main office' },
        { name: 'Office B', description: 'Branch office' }
      ])
      .returning()
      .execute();

    const location1 = locationResults[0];
    const location2 = locationResults[1];

    // Create assets
    const assetResults = await db.insert(assetsTable)
      .values([
        {
          asset_number: 'AST001',
          serial_number: 'SN001',
          name: 'Computer Desktop',
          description: 'Main workstation',
          category: 'Komputer',
          brand: 'Dell',
          model: 'OptiPlex',
          purchase_price: '1500.00',
          location_id: location1.id,
          status: 'Active'
        },
        {
          asset_number: 'AST002',
          serial_number: 'SN002',
          name: 'Monitor LCD',
          description: 'Primary display',
          category: 'Monitor',
          brand: 'Samsung',
          model: 'S24',
          purchase_price: '300.50',
          location_id: location1.id,
          status: 'Active'
        },
        {
          asset_number: 'AST003',
          serial_number: 'SN003',
          name: 'Printer Laser',
          description: 'Office printer',
          category: 'Printer',
          brand: 'HP',
          model: 'LaserJet',
          purchase_price: '450.75',
          location_id: location2.id,
          status: 'Maintenance'
        },
        {
          asset_number: 'AST004',
          serial_number: 'SN004',
          name: 'UPS Device',
          description: 'Power backup',
          category: 'UPS',
          brand: 'APC',
          model: 'Smart-UPS',
          purchase_price: '200.00',
          location_id: location2.id,
          status: 'Inactive'
        }
      ])
      .returning()
      .execute();

    return { locations: [location1, location2], assets: assetResults };
  };

  it('should return all assets with default pagination', async () => {
    await createTestData();

    const query: GetAssetsQuery = {
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getAssets(query);

    expect(result.assets).toHaveLength(4);
    expect(result.total).toEqual(4);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(10);
    expect(result.totalPages).toEqual(1);

    // Verify asset structure includes location
    const asset = result.assets[0];
    expect(asset.id).toBeDefined();
    expect(asset.asset_number).toBeDefined();
    expect(asset.name).toBeDefined();
    expect(asset.location).toBeDefined();
    expect(asset.location.name).toBeDefined();
    expect(typeof asset.purchase_price).toBe('number');
  });

  it('should filter by category', async () => {
    await createTestData();

    const query: GetAssetsQuery = {
      category: 'Monitor',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getAssets(query);

    expect(result.assets).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.assets[0].category).toEqual('Monitor');
    expect(result.assets[0].name).toEqual('Monitor LCD');
  });

  it('should filter by location_id', async () => {
    const testData = await createTestData();
    const location1Id = testData.locations[0].id;

    const query: GetAssetsQuery = {
      location_id: location1Id,
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getAssets(query);

    expect(result.assets).toHaveLength(2);
    expect(result.total).toEqual(2);
    result.assets.forEach(asset => {
      expect(asset.location_id).toEqual(location1Id);
      expect(asset.location.name).toEqual('Office A');
    });
  });

  it('should filter by status', async () => {
    await createTestData();

    const query: GetAssetsQuery = {
      status: 'Active',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getAssets(query);

    expect(result.assets).toHaveLength(2);
    expect(result.total).toEqual(2);
    result.assets.forEach(asset => {
      expect(asset.status).toEqual('Active');
    });
  });

  it('should search by name, asset_number, and serial_number', async () => {
    await createTestData();

    // Search by name
    const nameQuery: GetAssetsQuery = {
      search: 'Computer',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const nameResult = await getAssets(nameQuery);
    expect(nameResult.assets).toHaveLength(1);
    expect(nameResult.assets[0].name).toContain('Computer');

    // Search by asset_number
    const assetNumQuery: GetAssetsQuery = {
      search: 'AST002',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const assetNumResult = await getAssets(assetNumQuery);
    expect(assetNumResult.assets).toHaveLength(1);
    expect(assetNumResult.assets[0].asset_number).toEqual('AST002');

    // Search by serial_number
    const serialQuery: GetAssetsQuery = {
      search: 'SN003',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const serialResult = await getAssets(serialQuery);
    expect(serialResult.assets).toHaveLength(1);
    expect(serialResult.assets[0].serial_number).toEqual('SN003');
  });

  it('should combine multiple filters', async () => {
    const testData = await createTestData();
    const location1Id = testData.locations[0].id;

    const query: GetAssetsQuery = {
      location_id: location1Id,
      status: 'Active',
      search: 'Monitor',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getAssets(query);

    expect(result.assets).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.assets[0].location_id).toEqual(location1Id);
    expect(result.assets[0].status).toEqual('Active');
    expect(result.assets[0].name).toContain('Monitor');
  });

  it('should handle pagination correctly', async () => {
    await createTestData();

    // First page with limit 2
    const firstPageQuery: GetAssetsQuery = {
      page: 1,
      limit: 2,
      sort_by: 'asset_number',
      sort_order: 'asc'
    };

    const firstPageResult = await getAssets(firstPageQuery);
    expect(firstPageResult.assets).toHaveLength(2);
    expect(firstPageResult.total).toEqual(4);
    expect(firstPageResult.page).toEqual(1);
    expect(firstPageResult.limit).toEqual(2);
    expect(firstPageResult.totalPages).toEqual(2);
    expect(firstPageResult.assets[0].asset_number).toEqual('AST001');

    // Second page with limit 2
    const secondPageQuery: GetAssetsQuery = {
      page: 2,
      limit: 2,
      sort_by: 'asset_number',
      sort_order: 'asc'
    };

    const secondPageResult = await getAssets(secondPageQuery);
    expect(secondPageResult.assets).toHaveLength(2);
    expect(secondPageResult.total).toEqual(4);
    expect(secondPageResult.page).toEqual(2);
    expect(secondPageResult.assets[0].asset_number).toEqual('AST003');
  });

  it('should handle sorting correctly', async () => {
    await createTestData();

    // Sort by name ascending
    const ascQuery: GetAssetsQuery = {
      page: 1,
      limit: 10,
      sort_by: 'name',
      sort_order: 'asc'
    };

    const ascResult = await getAssets(ascQuery);
    expect(ascResult.assets[0].name).toEqual('Computer Desktop');
    expect(ascResult.assets[1].name).toEqual('Monitor LCD');

    // Sort by name descending
    const descQuery: GetAssetsQuery = {
      page: 1,
      limit: 10,
      sort_by: 'name',
      sort_order: 'desc'
    };

    const descResult = await getAssets(descQuery);
    expect(descResult.assets[0].name).toEqual('UPS Device');
    expect(descResult.assets[1].name).toEqual('Printer Laser');
  });

  it('should handle empty results', async () => {
    await createTestData();

    const query: GetAssetsQuery = {
      search: 'NonexistentAsset',
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getAssets(query);

    expect(result.assets).toHaveLength(0);
    expect(result.total).toEqual(0);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(10);
    expect(result.totalPages).toEqual(0);
  });

  it('should handle numeric price conversion correctly', async () => {
    await createTestData();

    const query: GetAssetsQuery = {
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getAssets(query);

    const computerAsset = result.assets.find(asset => asset.name === 'Computer Desktop');
    expect(computerAsset?.purchase_price).toEqual(1500.00);
    expect(typeof computerAsset?.purchase_price).toBe('number');

    const monitorAsset = result.assets.find(asset => asset.name === 'Monitor LCD');
    expect(monitorAsset?.purchase_price).toEqual(300.50);
    expect(typeof monitorAsset?.purchase_price).toBe('number');
  });

  it('should include complete location details', async () => {
    await createTestData();

    const query: GetAssetsQuery = {
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    const result = await getAssets(query);

    const asset = result.assets[0];
    expect(asset.location).toBeDefined();
    expect(asset.location.id).toBeDefined();
    expect(asset.location.name).toBeDefined();
    expect(asset.location.description).toBeDefined();
    expect(asset.location.created_at).toBeInstanceOf(Date);
  });
});