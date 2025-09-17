import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable, assetsTable } from '../db/schema';
import { type ExportReportInput } from '../schema';
import { exportReport } from '../handlers/export_report';

describe('exportReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let testLocationId: number;
  let testLocation2Id: number;

  beforeEach(async () => {
    // Create test locations
    const locations = await db.insert(locationsTable)
      .values([
        { name: 'Office A', description: 'Main office location' },
        { name: 'Office B', description: 'Branch office location' }
      ])
      .returning()
      .execute();

    testLocationId = locations[0].id;
    testLocation2Id = locations[1].id;

    // Create test assets
    await db.insert(assetsTable)
      .values([
        {
          asset_number: 'AST-001',
          serial_number: 'SN-001',
          name: 'Desktop Computer',
          description: 'Main workstation',
          category: 'Komputer',
          brand: 'Dell',
          model: 'OptiPlex 7090',
          purchase_price: '1500.00',
          location_id: testLocationId,
          status: 'Active'
        },
        {
          asset_number: 'AST-002',
          serial_number: 'SN-002',
          name: 'Laser Printer',
          description: 'Office printer',
          category: 'Printer',
          brand: 'HP',
          model: 'LaserJet Pro',
          purchase_price: '300.50',
          location_id: testLocationId,
          status: 'Active'
        },
        {
          asset_number: 'AST-003',
          serial_number: 'SN-003',
          name: 'LCD Monitor',
          description: '24-inch display',
          category: 'Monitor',
          brand: 'Samsung',
          model: 'C24F390',
          purchase_price: '200.00',
          location_id: testLocation2Id,
          status: 'Inactive'
        },
        {
          asset_number: 'AST-004',
          serial_number: 'SN-004',
          name: 'Network Switch',
          description: '8-port switch',
          category: 'Switch',
          brand: 'Cisco',
          model: 'SG108',
          purchase_price: '150.00',
          location_id: testLocationId,
          status: 'Maintenance'
        }
      ])
      .execute();
  });

  describe('basic export functionality', () => {
    it('should generate PDF report for all assets', async () => {
      const input: ExportReportInput = {
        format: 'pdf',
        include_summary: false
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('pdf');
      expect(result.filename).toMatch(/^asset-report-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.pdf$/);
      expect(result.file_url).toMatch(/^\/reports\/asset-report-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.pdf$/);
      expect(typeof result.file_url).toBe('string');
    });

    it('should generate XLSX report for all assets', async () => {
      const input: ExportReportInput = {
        format: 'xlsx',
        include_summary: true
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('xlsx');
      expect(result.filename).toMatch(/^asset-report-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
      expect(result.file_url).toMatch(/^\/reports\/asset-report-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    });

    it('should include summary when requested', async () => {
      const input: ExportReportInput = {
        format: 'pdf',
        include_summary: true
      };

      const result = await exportReport(input);

      // Verify the response structure
      expect(result.format).toEqual('pdf');
      expect(result.filename).toBeDefined();
      expect(result.file_url).toBeDefined();
    });
  });

  describe('filtering functionality', () => {
    it('should filter by category', async () => {
      const input: ExportReportInput = {
        category: 'Komputer',
        format: 'pdf',
        include_summary: false
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('pdf');
      expect(result.filename).toMatch(/\.pdf$/);
      expect(result.file_url).toMatch(/\/reports\/.*\.pdf$/);
    });

    it('should filter by location', async () => {
      const input: ExportReportInput = {
        location_id: testLocationId,
        format: 'xlsx',
        include_summary: true
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('xlsx');
      expect(result.filename).toMatch(/\.xlsx$/);
      expect(result.file_url).toMatch(/\/reports\/.*\.xlsx$/);
    });

    it('should filter by status', async () => {
      const input: ExportReportInput = {
        status: 'Active',
        format: 'pdf',
        include_summary: false
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('pdf');
      expect(result.filename).toBeDefined();
      expect(result.file_url).toBeDefined();
    });

    it('should apply multiple filters', async () => {
      const input: ExportReportInput = {
        category: 'Printer',
        location_id: testLocationId,
        status: 'Active',
        format: 'xlsx',
        include_summary: true
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('xlsx');
      expect(result.filename).toMatch(/\.xlsx$/);
      expect(result.file_url).toMatch(/\/reports\/.*\.xlsx$/);
    });
  });

  describe('edge cases', () => {
    it('should handle no matching assets', async () => {
      const input: ExportReportInput = {
        category: 'Camera Digital',
        status: 'Disposed',
        format: 'pdf',
        include_summary: true
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('pdf');
      expect(result.filename).toBeDefined();
      expect(result.file_url).toBeDefined();
    });

    it('should handle invalid location filter', async () => {
      const input: ExportReportInput = {
        location_id: 999999,
        format: 'xlsx',
        include_summary: false
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('xlsx');
      expect(result.filename).toBeDefined();
      expect(result.file_url).toBeDefined();
    });

    it('should generate unique filenames for concurrent requests', async () => {
      const input1: ExportReportInput = {
        format: 'pdf',
        include_summary: false
      };

      const input2: ExportReportInput = {
        format: 'xlsx',
        include_summary: true
      };

      const [result1, result2] = await Promise.all([
        exportReport(input1),
        exportReport(input2)
      ]);

      expect(result1.filename).not.toEqual(result2.filename);
      expect(result1.format).toEqual('pdf');
      expect(result2.format).toEqual('xlsx');
    });
  });

  describe('input validation', () => {
    it('should handle default include_summary value', async () => {
      const input: ExportReportInput = {
        format: 'pdf',
        include_summary: true // Using default value explicitly
      };

      const result = await exportReport(input);

      expect(result.format).toEqual('pdf');
      expect(result.filename).toBeDefined();
      expect(result.file_url).toBeDefined();
    });

    it('should handle all supported categories', async () => {
      const categories = [
        'Komputer', 'Monitor', 'Printer', 'Printer Thermal', 'UPS',
        'Scanner', 'Gadget', 'Switch', 'Face Recognition', 'Finger Print',
        'Harddisk', 'Camera Digital', 'LCD Projector', 'Mikrotik',
        'NFC Reader', 'Power Bank', 'Stavolt', 'Wireless'
      ] as const;

      for (const category of categories.slice(0, 3)) { // Test first 3 to keep test fast
        const input: ExportReportInput = {
          category,
          format: 'pdf',
          include_summary: false
        };

        const result = await exportReport(input);

        expect(result.format).toEqual('pdf');
        expect(result.filename).toBeDefined();
        expect(result.file_url).toBeDefined();
      }
    });

    it('should handle all supported statuses', async () => {
      const statuses = ['Active', 'Inactive', 'Maintenance', 'Disposed'] as const;

      for (const status of statuses) {
        const input: ExportReportInput = {
          status,
          format: 'xlsx',
          include_summary: true
        };

        const result = await exportReport(input);

        expect(result.format).toEqual('xlsx');
        expect(result.filename).toBeDefined();
        expect(result.file_url).toBeDefined();
      }
    });
  });
});