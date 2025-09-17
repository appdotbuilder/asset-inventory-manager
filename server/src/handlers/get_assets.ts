import { db } from '../db';
import { assetsTable, locationsTable } from '../db/schema';
import { type GetAssetsQuery, type AssetWithLocation } from '../schema';
import { eq, and, or, like, desc, asc, count, SQL } from 'drizzle-orm';

export interface GetAssetsResponse {
  assets: AssetWithLocation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getAssets = async (query: GetAssetsQuery): Promise<GetAssetsResponse> => {
  try {
    // Calculate offset for pagination
    const offset = (query.page - 1) * query.limit;

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Filter by category
    if (query.category) {
      conditions.push(eq(assetsTable.category, query.category));
    }

    // Filter by location_id
    if (query.location_id) {
      conditions.push(eq(assetsTable.location_id, query.location_id));
    }

    // Filter by status
    if (query.status) {
      conditions.push(eq(assetsTable.status, query.status));
    }

    // Search functionality - search in name, asset_number, serial_number
    if (query.search) {
      const searchTerm = `%${query.search}%`;
      conditions.push(
        or(
          like(assetsTable.name, searchTerm),
          like(assetsTable.asset_number, searchTerm),
          like(assetsTable.serial_number, searchTerm)
        )!
      );
    }

    // Build base query with join
    const baseQuery = db.select()
      .from(assetsTable)
      .innerJoin(locationsTable, eq(assetsTable.location_id, locationsTable.id));

    // Create the main query with all conditions
    const mainQuery = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    // Apply sorting based on sort_by parameter
    const sortedQuery = (() => {
      if (query.sort_by === 'name') {
        return query.sort_order === 'asc' 
          ? mainQuery.orderBy(asc(assetsTable.name))
          : mainQuery.orderBy(desc(assetsTable.name));
      } else if (query.sort_by === 'asset_number') {
        return query.sort_order === 'asc' 
          ? mainQuery.orderBy(asc(assetsTable.asset_number))
          : mainQuery.orderBy(desc(assetsTable.asset_number));
      } else if (query.sort_by === 'category') {
        return query.sort_order === 'asc' 
          ? mainQuery.orderBy(asc(assetsTable.category))
          : mainQuery.orderBy(desc(assetsTable.category));
      } else {
        // Default to created_at
        return query.sort_order === 'asc' 
          ? mainQuery.orderBy(asc(assetsTable.created_at))
          : mainQuery.orderBy(desc(assetsTable.created_at));
      }
    })();

    // Apply pagination and execute
    const results = await sortedQuery.limit(query.limit).offset(offset).execute();

    // Get total count with same filters
    const countBaseQuery = db.select({ count: count() }).from(assetsTable);
    const countQuery = conditions.length > 0
      ? countBaseQuery.where(and(...conditions))
      : countBaseQuery;

    const countResult = await countQuery.execute();
    const total = countResult[0]?.count || 0;

    // Transform the joined results into the expected format
    const assets: AssetWithLocation[] = results.map(result => {
      const asset = result.assets;
      const location = result.locations;

      return {
        ...asset,
        // Convert numeric fields back to numbers
        purchase_price: asset.purchase_price ? parseFloat(asset.purchase_price) : null,
        location: {
          ...location
        }
      };
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / query.limit);

    return {
      assets,
      total,
      page: query.page,
      limit: query.limit,
      totalPages
    };
  } catch (error) {
    console.error('Get assets failed:', error);
    throw error;
  }
};