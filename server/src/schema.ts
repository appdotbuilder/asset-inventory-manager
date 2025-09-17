import { z } from 'zod';

// Asset categories enum
export const assetCategoryEnum = z.enum([
  'Komputer',
  'Monitor',
  'Printer',
  'Printer Thermal',
  'UPS',
  'Scanner',
  'Gadget',
  'Switch',
  'Face Recognition',
  'Finger Print',
  'Harddisk',
  'Camera Digital',
  'LCD Projector',
  'Mikrotik',
  'NFC Reader',
  'Power Bank',
  'Stavolt',
  'Wireless'
]);

export type AssetCategory = z.infer<typeof assetCategoryEnum>;

// Asset status enum
export const assetStatusEnum = z.enum([
  'Active',
  'Inactive',
  'Maintenance',
  'Disposed'
]);

export type AssetStatus = z.infer<typeof assetStatusEnum>;

// Location schema - predefined locations for dropdown
export const locationSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Location = z.infer<typeof locationSchema>;

// Input schema for creating locations
export const createLocationInputSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  description: z.string().nullable().optional()
});

export type CreateLocationInput = z.infer<typeof createLocationInputSchema>;

// Asset schema
export const assetSchema = z.object({
  id: z.number(),
  asset_number: z.string(),
  serial_number: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: assetCategoryEnum,
  brand: z.string().nullable(),
  model: z.string().nullable(),
  purchase_date: z.coerce.date().nullable(),
  purchase_price: z.number().nullable(),
  warranty_expiry: z.coerce.date().nullable(),
  location_id: z.number(),
  status: assetStatusEnum,
  barcode_data: z.string().nullable(),
  qr_code_data: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Asset = z.infer<typeof assetSchema>;

// Asset with location details
export const assetWithLocationSchema = assetSchema.extend({
  location: locationSchema
});

export type AssetWithLocation = z.infer<typeof assetWithLocationSchema>;

// Input schema for creating assets
export const createAssetInputSchema = z.object({
  asset_number: z.string().min(1, 'Asset number is required'),
  serial_number: z.string().min(1, 'Serial number is required'),
  name: z.string().min(1, 'Asset name is required'),
  description: z.string().nullable().optional(),
  category: assetCategoryEnum,
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  purchase_price: z.number().positive().nullable().optional(),
  warranty_expiry: z.coerce.date().nullable().optional(),
  location_id: z.number().int().positive('Location is required'),
  status: assetStatusEnum.default('Active'),
  notes: z.string().nullable().optional()
});

export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;

// Input schema for updating assets
export const updateAssetInputSchema = z.object({
  id: z.number(),
  asset_number: z.string().min(1, 'Asset number is required').optional(),
  serial_number: z.string().min(1, 'Serial number is required').optional(),
  name: z.string().min(1, 'Asset name is required').optional(),
  description: z.string().nullable().optional(),
  category: assetCategoryEnum.optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  purchase_price: z.number().positive().nullable().optional(),
  warranty_expiry: z.coerce.date().nullable().optional(),
  location_id: z.number().int().positive().optional(),
  status: assetStatusEnum.optional(),
  notes: z.string().nullable().optional()
});

export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>;

// Query schemas
export const getAssetsQuerySchema = z.object({
  category: assetCategoryEnum.optional(),
  location_id: z.number().optional(),
  status: assetStatusEnum.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sort_by: z.enum(['name', 'asset_number', 'category', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type GetAssetsQuery = z.infer<typeof getAssetsQuerySchema>;

// Asset summary schema
export const assetSummarySchema = z.object({
  total_assets: z.number(),
  categories: z.array(z.object({
    category: assetCategoryEnum,
    count: z.number()
  })),
  status_counts: z.array(z.object({
    status: assetStatusEnum,
    count: z.number()
  })),
  recent_assets: z.array(assetWithLocationSchema)
});

export type AssetSummary = z.infer<typeof assetSummarySchema>;

// Barcode/QR generation schema
export const generateBarcodeInputSchema = z.object({
  asset_id: z.number().int().positive(),
  type: z.enum(['barcode', 'qr'])
});

export type GenerateBarcodeInput = z.infer<typeof generateBarcodeInputSchema>;

// Export report schema
export const exportReportInputSchema = z.object({
  category: assetCategoryEnum.optional(),
  location_id: z.number().optional(),
  status: assetStatusEnum.optional(),
  format: z.enum(['pdf', 'xlsx']),
  include_summary: z.boolean().default(true)
});

export type ExportReportInput = z.infer<typeof exportReportInputSchema>;