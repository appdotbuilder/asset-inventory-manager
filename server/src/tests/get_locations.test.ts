import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type CreateLocationInput } from '../schema';
import { getLocations } from '../handlers/get_locations';

// Test location data
const testLocations: CreateLocationInput[] = [
  {
    name: 'Main Office',
    description: 'Primary office location'
  },
  {
    name: 'IT Department',
    description: 'Information Technology department'
  },
  {
    name: 'Warehouse',
    description: 'Storage facility'
  },
  {
    name: 'Branch Office A',
    description: null
  }
];

describe('getLocations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no locations exist', async () => {
    const result = await getLocations();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all locations ordered by name', async () => {
    // Create test locations in reverse order to test sorting
    for (const location of testLocations.reverse()) {
      await db.insert(locationsTable)
        .values({
          name: location.name,
          description: location.description
        })
        .execute();
    }

    const result = await getLocations();

    expect(result).toHaveLength(4);
    
    // Verify locations are sorted by name (ascending)
    const locationNames = result.map(loc => loc.name);
    expect(locationNames).toEqual([
      'Branch Office A',
      'IT Department', 
      'Main Office',
      'Warehouse'
    ]);
  });

  it('should return locations with all required fields', async () => {
    // Create a single location with all fields
    const testLocation = {
      name: 'Test Location Field Check',
      description: 'Testing all required fields'
    };

    await db.insert(locationsTable)
      .values({
        name: testLocation.name,
        description: testLocation.description
      })
      .execute();

    const result = await getLocations();

    expect(result).toHaveLength(1);
    const location = result[0];

    // Verify all required fields are present
    expect(location.id).toBeDefined();
    expect(typeof location.id).toBe('number');
    expect(location.name).toEqual('Test Location Field Check');
    expect(location.description).toEqual('Testing all required fields');
    expect(location.created_at).toBeInstanceOf(Date);
  });

  it('should handle locations with null descriptions', async () => {
    // Create location with null description
    await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: null
      })
      .execute();

    const result = await getLocations();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Location');
    expect(result[0].description).toBeNull();
  });

  it('should maintain proper date types', async () => {
    // Create test location
    await db.insert(locationsTable)
      .values({
        name: 'Date Test Location',
        description: 'Testing date handling'
      })
      .execute();

    const result = await getLocations();

    expect(result).toHaveLength(1);
    const location = result[0];

    // Verify created_at is a proper Date object
    expect(location.created_at).toBeInstanceOf(Date);
    expect(location.created_at.getTime()).toBeGreaterThan(0);
  });

  it('should handle multiple locations with same-case sorting', async () => {
    // Test edge case with similar names
    const similarLocations = [
      { name: 'Office A', description: 'First office' },
      { name: 'Office B', description: 'Second office' },
      { name: 'office a', description: 'Lowercase version' }
    ];

    for (const location of similarLocations) {
      await db.insert(locationsTable)
        .values({
          name: location.name,
          description: location.description
        })
        .execute();
    }

    const result = await getLocations();

    expect(result).toHaveLength(3);
    
    // Verify case-sensitive alphabetical sorting
    const locationNames = result.map(loc => loc.name);
    expect(locationNames).toEqual(['Office A', 'Office B', 'office a']);
  });
});