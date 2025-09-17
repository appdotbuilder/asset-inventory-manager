import { db } from '../db';
import { assetsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteAsset = async (id: number): Promise<boolean> => {
  try {
    // Delete the asset by ID
    const result = await db.delete(assetsTable)
      .where(eq(assetsTable.id, id))
      .execute();

    // Check if any rows were affected (deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Asset deletion failed:', error);
    throw error;
  }
};