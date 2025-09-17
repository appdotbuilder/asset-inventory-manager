import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Asset category enum
export const assetCategoryEnum = pgEnum('asset_category', [
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

// Asset status enum
export const assetStatusEnum = pgEnum('asset_status', [
  'Active',
  'Inactive',
  'Maintenance',
  'Disposed'
]);

// Locations table
export const locationsTable = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Assets table
export const assetsTable = pgTable('assets', {
  id: serial('id').primaryKey(),
  asset_number: text('asset_number').notNull().unique(),
  serial_number: text('serial_number').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  category: assetCategoryEnum('category').notNull(),
  brand: text('brand'),
  model: text('model'),
  purchase_date: timestamp('purchase_date'),
  purchase_price: numeric('purchase_price', { precision: 12, scale: 2 }),
  warranty_expiry: timestamp('warranty_expiry'),
  location_id: integer('location_id').notNull().references(() => locationsTable.id),
  status: assetStatusEnum('status').notNull().default('Active'),
  barcode_data: text('barcode_data'),
  qr_code_data: text('qr_code_data'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const locationsRelations = relations(locationsTable, ({ many }) => ({
  assets: many(assetsTable),
}));

export const assetsRelations = relations(assetsTable, ({ one }) => ({
  location: one(locationsTable, {
    fields: [assetsTable.location_id],
    references: [locationsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Location = typeof locationsTable.$inferSelect;
export type NewLocation = typeof locationsTable.$inferInsert;

export type Asset = typeof assetsTable.$inferSelect;
export type NewAsset = typeof assetsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  locations: locationsTable, 
  assets: assetsTable 
};

export const tableRelations = {
  locationsRelations,
  assetsRelations
};