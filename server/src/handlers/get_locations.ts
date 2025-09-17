import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type Location } from '../schema';
import { asc } from 'drizzle-orm';

export const getLocations = async (): Promise<Location[]> => {
  try {
    // Fetch all locations ordered by name for dropdown display
    const results = await db.select()
      .from(locationsTable)
      .orderBy(asc(locationsTable.name))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    throw error;
  }
};