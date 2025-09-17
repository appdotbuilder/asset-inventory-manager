import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type GenerateBarcodeInput } from '../schema';
import { eq } from 'drizzle-orm';

export interface BarcodeResponse {
  data: string;
  image_url: string; // URL to the generated barcode/QR code image
}

export const generateBarcode = async (input: GenerateBarcodeInput): Promise<BarcodeResponse> => {
  try {
    // Fetch the asset by ID to ensure it exists
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    if (assets.length === 0) {
      throw new Error(`Asset with ID ${input.asset_id} not found`);
    }

    const asset = assets[0];

    // Generate barcode/QR code data based on asset information
    const barcodeData = `${asset.asset_number}-${asset.serial_number}-${asset.name}`;
    
    // Generate image URL (in real implementation, this would create actual image files)
    const imageUrl = `/assets/codes/${input.type}-${asset.id}-${Date.now()}.png`;

    // Update the asset with the generated barcode/QR code data
    const updateData = input.type === 'barcode' 
      ? { barcode_data: barcodeData }
      : { qr_code_data: barcodeData };

    await db.update(assetsTable)
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    return {
      data: barcodeData,
      image_url: imageUrl
    };
  } catch (error) {
    console.error('Barcode generation failed:', error);
    throw error;
  }
};