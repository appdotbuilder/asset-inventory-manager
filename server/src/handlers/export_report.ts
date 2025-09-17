import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type ExportReportInput, type AssetWithLocation, type AssetCategory, type AssetStatus } from '../schema';
import { eq, and, count, SQL } from 'drizzle-orm';

export interface ExportReportResponse {
  file_url: string;
  filename: string;
  format: 'pdf' | 'xlsx';
}

export interface ReportData {
  assets: AssetWithLocation[];
  summary?: {
    total_assets: number;
    categories: Array<{ category: AssetCategory; count: number }>;
    status_counts: Array<{ status: AssetStatus; count: number }>;
  };
}

export const exportReport = async (input: ExportReportInput): Promise<ExportReportResponse> => {
  try {
    // Build query with filters
    const conditions: SQL<unknown>[] = [];

    if (input.category) {
      conditions.push(eq(assetsTable.category, input.category));
    }

    if (input.location_id) {
      conditions.push(eq(assetsTable.location_id, input.location_id));
    }

    if (input.status) {
      conditions.push(eq(assetsTable.status, input.status));
    }

    // Execute query to get filtered assets
    const results = conditions.length > 0
      ? await db.select()
          .from(assetsTable)
          .innerJoin(locationsTable, eq(assetsTable.location_id, locationsTable.id))
          .where(and(...conditions))
          .execute()
      : await db.select()
          .from(assetsTable)
          .innerJoin(locationsTable, eq(assetsTable.location_id, locationsTable.id))
          .execute();

    // Transform results to AssetWithLocation format
    const assets: AssetWithLocation[] = results.map(result => ({
      id: result.assets.id,
      asset_number: result.assets.asset_number,
      serial_number: result.assets.serial_number,
      name: result.assets.name,
      description: result.assets.description,
      category: result.assets.category,
      brand: result.assets.brand,
      model: result.assets.model,
      purchase_date: result.assets.purchase_date,
      purchase_price: result.assets.purchase_price ? parseFloat(result.assets.purchase_price) : null,
      warranty_expiry: result.assets.warranty_expiry,
      location_id: result.assets.location_id,
      status: result.assets.status,
      barcode_data: result.assets.barcode_data,
      qr_code_data: result.assets.qr_code_data,
      notes: result.assets.notes,
      created_at: result.assets.created_at,
      updated_at: result.assets.updated_at,
      location: {
        id: result.locations.id,
        name: result.locations.name,
        description: result.locations.description,
        created_at: result.locations.created_at
      }
    }));

    // Generate summary statistics if requested
    let summary = undefined;
    if (input.include_summary) {
      // Get category counts
      const categoryQuery = conditions.length > 0
        ? db.select({
            category: assetsTable.category,
            count: count()
          })
          .from(assetsTable)
          .where(and(...conditions))
          .groupBy(assetsTable.category)
        : db.select({
            category: assetsTable.category,
            count: count()
          })
          .from(assetsTable)
          .groupBy(assetsTable.category);

      const categoryResults = await categoryQuery.execute();

      // Get status counts
      const statusQuery = conditions.length > 0
        ? db.select({
            status: assetsTable.status,
            count: count()
          })
          .from(assetsTable)
          .where(and(...conditions))
          .groupBy(assetsTable.status)
        : db.select({
            status: assetsTable.status,
            count: count()
          })
          .from(assetsTable)
          .groupBy(assetsTable.status);

      const statusResults = await statusQuery.execute();

      summary = {
        total_assets: assets.length,
        categories: categoryResults.map(result => ({
          category: result.category,
          count: result.count
        })),
        status_counts: statusResults.map(result => ({
          status: result.status,
          count: result.count
        }))
      };
    }

    // Generate report data object (in real implementation, this would be used to create actual PDF/Excel files)
    const reportData: ReportData = {
      assets,
      summary
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `asset-report-${timestamp}.${input.format}`;

    // In a real implementation, you would:
    // 1. Use a library like PDFKit or jsPDF to generate PDF
    // 2. Use a library like ExcelJS to generate XLSX
    // 3. Save the file to a file system or cloud storage
    // 4. Return the actual file URL

    // For now, return the mock response with the report data processed
    return {
      file_url: `/reports/${filename}`,
      filename,
      format: input.format
    };
  } catch (error) {
    console.error('Export report failed:', error);
    throw error;
  }
};