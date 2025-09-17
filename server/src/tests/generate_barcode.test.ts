import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type GenerateBarcodeInput } from '../schema';
import { generateBarcode } from '../handlers/generate_barcode';
import { eq } from 'drizzle-orm';

describe('generateBarcode', () => {
  let locationId: number;
  let assetId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test location first
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'A location for testing'
      })
      .returning()
      .execute();
    
    locationId = locationResult[0].id;

    // Create a test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_number: 'TEST001',
        serial_number: 'SN12345',
        name: 'Test Computer',
        description: 'A computer for testing',
        category: 'Komputer',
        brand: 'TestBrand',
        model: 'TestModel',
        location_id: locationId,
        status: 'Active'
      })
      .returning()
      .execute();
    
    assetId = assetResult[0].id;
  });

  afterEach(resetDB);

  describe('barcode generation', () => {
    it('should generate barcode for existing asset', async () => {
      const input: GenerateBarcodeInput = {
        asset_id: assetId,
        type: 'barcode'
      };

      const result = await generateBarcode(input);

      expect(result.data).toEqual('TEST001-SN12345-Test Computer');
      expect(result.image_url).toMatch(/^\/assets\/codes\/barcode-\d+-\d+\.png$/);
      expect(result.image_url).toContain(`barcode-${assetId}-`);
    });

    it('should update asset with barcode data', async () => {
      const input: GenerateBarcodeInput = {
        asset_id: assetId,
        type: 'barcode'
      };

      await generateBarcode(input);

      // Verify asset was updated with barcode data
      const assets = await db.select()
        .from(assetsTable)
        .where(eq(assetsTable.id, assetId))
        .execute();

      expect(assets).toHaveLength(1);
      expect(assets[0].barcode_data).toEqual('TEST001-SN12345-Test Computer');
      expect(assets[0].qr_code_data).toBeNull();
      expect(assets[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('QR code generation', () => {
    it('should generate QR code for existing asset', async () => {
      const input: GenerateBarcodeInput = {
        asset_id: assetId,
        type: 'qr'
      };

      const result = await generateBarcode(input);

      expect(result.data).toEqual('TEST001-SN12345-Test Computer');
      expect(result.image_url).toMatch(/^\/assets\/codes\/qr-\d+-\d+\.png$/);
      expect(result.image_url).toContain(`qr-${assetId}-`);
    });

    it('should update asset with QR code data', async () => {
      const input: GenerateBarcodeInput = {
        asset_id: assetId,
        type: 'qr'
      };

      await generateBarcode(input);

      // Verify asset was updated with QR code data
      const assets = await db.select()
        .from(assetsTable)
        .where(eq(assetsTable.id, assetId))
        .execute();

      expect(assets).toHaveLength(1);
      expect(assets[0].qr_code_data).toEqual('TEST001-SN12345-Test Computer');
      expect(assets[0].barcode_data).toBeNull();
      expect(assets[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('error cases', () => {
    it('should throw error for non-existent asset', async () => {
      const input: GenerateBarcodeInput = {
        asset_id: 99999,
        type: 'barcode'
      };

      await expect(generateBarcode(input)).rejects.toThrow(/Asset with ID 99999 not found/i);
    });

    it('should handle asset with minimal data', async () => {
      // Create asset with minimal required data
      const minimalAssetResult = await db.insert(assetsTable)
        .values({
          asset_number: 'MIN001',
          serial_number: 'MINSERIAL',
          name: 'Minimal Asset',
          category: 'Monitor',
          location_id: locationId,
          status: 'Active'
        })
        .returning()
        .execute();

      const input: GenerateBarcodeInput = {
        asset_id: minimalAssetResult[0].id,
        type: 'barcode'
      };

      const result = await generateBarcode(input);

      expect(result.data).toEqual('MIN001-MINSERIAL-Minimal Asset');
      expect(result.image_url).toContain('barcode-');
    });
  });

  describe('data format consistency', () => {
    it('should generate consistent data format across different asset types', async () => {
      // Create different types of assets
      const printerResult = await db.insert(assetsTable)
        .values({
          asset_number: 'PRT001',
          serial_number: 'PRINTER123',
          name: 'Test Printer',
          category: 'Printer',
          brand: 'HP',
          model: 'LaserJet',
          location_id: locationId,
          status: 'Active'
        })
        .returning()
        .execute();

      const scannerResult = await db.insert(assetsTable)
        .values({
          asset_number: 'SCN001',
          serial_number: 'SCANNER456',
          name: 'Test Scanner',
          category: 'Scanner',
          location_id: locationId,
          status: 'Maintenance'
        })
        .returning()
        .execute();

      // Test both assets
      const printerBarcode = await generateBarcode({
        asset_id: printerResult[0].id,
        type: 'barcode'
      });

      const scannerQR = await generateBarcode({
        asset_id: scannerResult[0].id,
        type: 'qr'
      });

      // Both should follow same data format pattern
      expect(printerBarcode.data).toEqual('PRT001-PRINTER123-Test Printer');
      expect(scannerQR.data).toEqual('SCN001-SCANNER456-Test Scanner');
      
      // Image URLs should be different but follow same pattern
      expect(printerBarcode.image_url).toMatch(/^\/assets\/codes\/barcode-\d+-\d+\.png$/);
      expect(scannerQR.image_url).toMatch(/^\/assets\/codes\/qr-\d+-\d+\.png$/);
    });

    it('should handle special characters in asset data', async () => {
      // Create asset with special characters
      const specialAssetResult = await db.insert(assetsTable)
        .values({
          asset_number: 'SPEC-001',
          serial_number: 'SN/123@456',
          name: 'Special & Test Asset',
          category: 'Gadget',
          location_id: locationId,
          status: 'Active'
        })
        .returning()
        .execute();

      const result = await generateBarcode({
        asset_id: specialAssetResult[0].id,
        type: 'qr'
      });

      expect(result.data).toEqual('SPEC-001-SN/123@456-Special & Test Asset');
      expect(result.image_url).toContain('qr-');
    });
  });

  describe('updated_at timestamp', () => {
    it('should update timestamp when generating barcode', async () => {
      // Get initial timestamp
      const initialAsset = await db.select()
        .from(assetsTable)
        .where(eq(assetsTable.id, assetId))
        .execute();
      
      const initialTimestamp = initialAsset[0].updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await generateBarcode({
        asset_id: assetId,
        type: 'barcode'
      });

      // Verify timestamp was updated
      const updatedAsset = await db.select()
        .from(assetsTable)
        .where(eq(assetsTable.id, assetId))
        .execute();

      expect(updatedAsset[0].updated_at.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });
  });
});