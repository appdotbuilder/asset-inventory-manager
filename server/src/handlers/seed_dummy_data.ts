import { db } from '../db';
import { locationsTable, assetsTable } from '../db/schema';
import { count } from 'drizzle-orm';
import { type AssetCategory, assetCategoryEnum } from '../schema';

// Sample locations
const sampleLocations = [
  { name: 'Head Office', description: 'Main headquarters building' },
  { name: 'Warehouse', description: 'Storage and logistics center' },
  { name: 'Branch Office A', description: 'Regional office in the north' },
  { name: 'Branch Office B', description: 'Regional office in the south' },
  { name: 'IT Department', description: 'Information technology department' }
];

// Asset categories from the enum
const assetCategories: AssetCategory[] = [
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
];

// Sample brands and models for different categories
const categoryBrands: Record<AssetCategory, { brands: string[], models: string[] }> = {
  'Komputer': { brands: ['Dell', 'HP', 'Lenovo', 'ASUS'], models: ['OptiPlex 7090', 'EliteDesk 800', 'ThinkCentre M90', 'VivoPC'] },
  'Monitor': { brands: ['Dell', 'HP', 'Samsung', 'LG'], models: ['UltraSharp U2419H', 'E24 G5', 'Odyssey G5', 'UltraWide 34WN80C'] },
  'Printer': { brands: ['Canon', 'HP', 'Epson', 'Brother'], models: ['ImageCLASS LBP6030', 'LaserJet Pro M404', 'EcoTank L3250', 'HL-L2350DW'] },
  'Printer Thermal': { brands: ['Zebra', 'TSC', 'Citizen', 'Datamax'], models: ['ZD420', 'TTP-244CE', 'CL-S700DT', 'E-4305P'] },
  'UPS': { brands: ['APC', 'CyberPower', 'Eaton', 'Vertiv'], models: ['Back-UPS 650VA', 'CP1500PFCLCD', '5S 1500VA', 'Liebert PSI5'] },
  'Scanner': { brands: ['Canon', 'Epson', 'Fujitsu', 'HP'], models: ['CanoScan LiDE 400', 'Perfection V600', 'ScanSnap iX1600', 'ScanJet Pro 2000'] },
  'Gadget': { brands: ['Apple', 'Samsung', 'Xiaomi', 'Logitech'], models: ['iPad Air', 'Galaxy Tab S8', 'Mi Pad 5', 'MX Master 3S'] },
  'Switch': { brands: ['Cisco', 'Netgear', 'TP-Link', 'D-Link'], models: ['Catalyst 2960-X', 'ProSafe GS724T', 'TL-SG1024D', 'DGS-1100-24'] },
  'Face Recognition': { brands: ['Hikvision', 'Dahua', 'ZKTeco', 'Suprema'], models: ['DS-K1T671MF', 'ASI7213Y', 'SpeedFace-V5L', 'FaceStation F2'] },
  'Finger Print': { brands: ['ZKTeco', 'eSSL', 'Suprema', 'Anviz'], models: ['U160', 'X990', 'BioEntry Plus', 'A300'] },
  'Harddisk': { brands: ['Seagate', 'WD', 'Toshiba', 'Samsung'], models: ['Barracuda 2TB', 'Blue 1TB', 'P300 3TB', '970 EVO Plus'] },
  'Camera Digital': { brands: ['Canon', 'Nikon', 'Sony', 'Fujifilm'], models: ['EOS R6', 'D780', 'Alpha A7 IV', 'X-T4'] },
  'LCD Projector': { brands: ['Epson', 'BenQ', 'Sony', 'Optoma'], models: ['PowerLite 2247U', 'MW632ST', 'VPL-EX575', 'HD28HDR'] },
  'Mikrotik': { brands: ['MikroTik'], models: ['hEX S', 'CCR1009-7G-1C-1S+', 'CRS326-24G-2S+', 'RB4011iGS+'] },
  'NFC Reader': { brands: ['ACR122U', 'HID', 'Identiv', 'Elatec'], models: ['ACR122U-A9', 'OMNIKEY 5422', 'uTrust 3700 F', 'TWN4 MultiTech'] },
  'Power Bank': { brands: ['Anker', 'Xiaomi', 'ASUS', 'Samsung'], models: ['PowerCore 26800', 'Mi Power Bank 3', 'ZenPower 10050C', 'Fast Charge 10000'] },
  'Stavolt': { brands: ['Matsunaga', 'Toyosaki', 'Lexos', 'OKI'], models: ['AVR-1000N', 'SVC-1000N', 'LX-1000VA', 'AVR-1000W'] },
  'Wireless': { brands: ['Ubiquiti', 'TP-Link', 'ASUS', 'Netgear'], models: ['UniFi AC Pro', 'Archer AX6000', 'RT-AX88U', 'Nighthawk AX12'] }
};

// Asset status options
const assetStatuses = ['Active', 'Inactive', 'Maintenance', 'Disposed'] as const;

// Helper function to generate asset number
const generateAssetNumber = (category: string, index: number): string => {
  const categoryCode = category.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const sequence = String(index + 1).padStart(3, '0');
  return `${categoryCode}${year}${sequence}`;
};

// Helper function to generate serial number
const generateSerialNumber = (brand: string, index: number): string => {
  const brandCode = brand.substring(0, 2).toUpperCase();
  const randomNum = Math.floor(Math.random() * 900000) + 100000;
  const sequence = String(index + 1).padStart(2, '0');
  return `${brandCode}${randomNum}${sequence}`;
};

// Helper function to generate random date within last 3 years
const generateRandomPastDate = (): Date => {
  const now = new Date();
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
  const randomTime = threeYearsAgo.getTime() + Math.random() * (now.getTime() - threeYearsAgo.getTime());
  return new Date(randomTime);
};

// Helper function to generate future warranty date
const generateWarrantyDate = (purchaseDate: Date): Date => {
  const warrantyDate = new Date(purchaseDate);
  warrantyDate.setFullYear(warrantyDate.getFullYear() + Math.floor(Math.random() * 3) + 1); // 1-3 years warranty
  return warrantyDate;
};

// Helper function to generate random price
const generateRandomPrice = (category: AssetCategory): number => {
  const priceRanges: Record<AssetCategory, [number, number]> = {
    'Komputer': [5000000, 15000000],
    'Monitor': [1500000, 5000000],
    'Printer': [1000000, 8000000],
    'Printer Thermal': [2000000, 6000000],
    'UPS': [500000, 3000000],
    'Scanner': [1500000, 4000000],
    'Gadget': [1000000, 8000000],
    'Switch': [2000000, 10000000],
    'Face Recognition': [3000000, 12000000],
    'Finger Print': [2000000, 8000000],
    'Harddisk': [500000, 2000000],
    'Camera Digital': [8000000, 25000000],
    'LCD Projector': [4000000, 15000000],
    'Mikrotik': [1000000, 8000000],
    'NFC Reader': [500000, 2000000],
    'Power Bank': [200000, 1000000],
    'Stavolt': [300000, 1500000],
    'Wireless': [800000, 5000000]
  };
  
  const [min, max] = priceRanges[category];
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const seedDummyData = async (): Promise<{ message: string; count: number }> => {
  try {
    // Check if data already exists
    const [assetCountResult, locationCountResult] = await Promise.all([
      db.select({ count: count() }).from(assetsTable),
      db.select({ count: count() }).from(locationsTable)
    ]);

    const assetCount = assetCountResult[0].count;
    const locationCount = locationCountResult[0].count;

    if (assetCount > 0 || locationCount > 0) {
      return {
        message: 'Database already contains data. Skipping seed operation.',
        count: 0
      };
    }

    // Insert locations first
    const insertedLocations = await db.insert(locationsTable)
      .values(sampleLocations)
      .returning()
      .execute();

    // Generate assets for each category
    const assetsToInsert = [];
    let totalAssetCount = 0;

    for (const category of assetCategories) {
      const categoryInfo = categoryBrands[category];
      
      // Create 5 assets per category
      for (let i = 0; i < 5; i++) {
        const brandIndex = i % categoryInfo.brands.length;
        const modelIndex = i % categoryInfo.models.length;
        const brand = categoryInfo.brands[brandIndex];
        const model = categoryInfo.models[modelIndex];
        
        const purchaseDate = generateRandomPastDate();
        const warrantyDate = generateWarrantyDate(purchaseDate);
        const price = generateRandomPrice(category);
        
        // Randomly assign to location
        const randomLocationId = insertedLocations[Math.floor(Math.random() * insertedLocations.length)].id;
        
        // Randomly assign status (80% Active, 10% Inactive, 5% Maintenance, 5% Disposed)
        const statusRandom = Math.random();
        let status: 'Active' | 'Inactive' | 'Maintenance' | 'Disposed';
        if (statusRandom < 0.8) status = 'Active';
        else if (statusRandom < 0.9) status = 'Inactive';
        else if (statusRandom < 0.95) status = 'Maintenance';
        else status = 'Disposed';
        
        const assetName = `${brand} ${model}`;
        const assetNumber = generateAssetNumber(category, totalAssetCount);
        const serialNumber = generateSerialNumber(brand, totalAssetCount);
        
        assetsToInsert.push({
          asset_number: assetNumber,
          serial_number: serialNumber,
          name: assetName,
          description: `${category} asset - ${assetName}`,
          category: category,
          brand: brand,
          model: model,
          purchase_date: purchaseDate,
          purchase_price: price.toString(), // Convert to string for numeric column
          warranty_expiry: warrantyDate,
          location_id: randomLocationId,
          status: status,
          barcode_data: `BARCODE_${assetNumber}`,
          qr_code_data: `QR_${assetNumber}_${serialNumber}`,
          notes: `Dummy ${category} asset for testing purposes`
        });
        
        totalAssetCount++;
      }
    }

    // Insert all assets
    await db.insert(assetsTable)
      .values(assetsToInsert)
      .execute();

    const totalRecords = insertedLocations.length + totalAssetCount;

    return {
      message: `Dummy data seeded successfully. Created ${insertedLocations.length} locations and ${totalAssetCount} assets.`,
      count: totalRecords
    };

  } catch (error) {
    console.error('Seed operation failed:', error);
    throw error;
  }
};