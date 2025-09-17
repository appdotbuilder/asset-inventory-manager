import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  createAssetInputSchema,
  updateAssetInputSchema,
  getAssetsQuerySchema,
  createLocationInputSchema,
  generateBarcodeInputSchema,
  exportReportInputSchema,
  assetCategoryEnum
} from './schema';

// Import handlers
import { getAssetSummary } from './handlers/get_asset_summary';
import { getAssets } from './handlers/get_assets';
import { getAssetById } from './handlers/get_asset_by_id';
import { createAsset } from './handlers/create_asset';
import { updateAsset } from './handlers/update_asset';
import { deleteAsset } from './handlers/delete_asset';
import { getLocations } from './handlers/get_locations';
import { createLocation } from './handlers/create_location';
import { generateBarcode } from './handlers/generate_barcode';
import { exportReport } from './handlers/export_report';
import { seedDummyData } from './handlers/seed_dummy_data';
import { getAssetsByCategory } from './handlers/get_assets_by_category';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Asset summary for dashboard
  getAssetSummary: publicProcedure
    .query(() => getAssetSummary()),

  // Asset CRUD operations
  getAssets: publicProcedure
    .input(getAssetsQuerySchema)
    .query(({ input }) => getAssets(input)),

  getAssetById: publicProcedure
    .input(z.number())
    .query(({ input }) => getAssetById(input)),

  createAsset: publicProcedure
    .input(createAssetInputSchema)
    .mutation(({ input }) => createAsset(input)),

  updateAsset: publicProcedure
    .input(updateAssetInputSchema)
    .mutation(({ input }) => updateAsset(input)),

  deleteAsset: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteAsset(input)),

  // Assets by category
  getAssetsByCategory: publicProcedure
    .input(assetCategoryEnum)
    .query(({ input }) => getAssetsByCategory(input)),

  // Location management
  getLocations: publicProcedure
    .query(() => getLocations()),

  createLocation: publicProcedure
    .input(createLocationInputSchema)
    .mutation(({ input }) => createLocation(input)),

  // Barcode/QR code generation
  generateBarcode: publicProcedure
    .input(generateBarcodeInputSchema)
    .mutation(({ input }) => generateBarcode(input)),

  // Report export
  exportReport: publicProcedure
    .input(exportReportInputSchema)
    .mutation(({ input }) => exportReport(input)),

  // Data seeding
  seedDummyData: publicProcedure
    .mutation(() => seedDummyData()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();