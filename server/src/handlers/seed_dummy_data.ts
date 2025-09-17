export const seedDummyData = async (): Promise<{ message: string; count: number }> => {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is to populate the database with dummy data:
  // - Create 5 sample locations
  // - Create 5 dummy assets for each asset category (18 categories = 90 total assets)
  // - Generate realistic asset data with proper asset numbers and serial numbers
  // - Assign assets to different locations and statuses for testing
  // - This should only run if the database is empty to avoid duplicates
  return {
    message: 'Dummy data seeded successfully',
    count: 0
  };
};