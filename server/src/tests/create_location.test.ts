import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type CreateLocationInput } from '../schema';
import { createLocation } from '../handlers/create_location';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateLocationInput = {
  name: 'Test Office',
  description: 'A test office location'
};

const minimalInput: CreateLocationInput = {
  name: 'Minimal Office'
};

describe('createLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a location with full details', async () => {
    const result = await createLocation(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Office');
    expect(result.description).toEqual('A test office location');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a location with minimal data', async () => {
    const result = await createLocation(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Minimal Office');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save location to database', async () => {
    const result = await createLocation(testInput);

    // Query using proper drizzle syntax
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].name).toEqual('Test Office');
    expect(locations[0].description).toEqual('A test office location');
    expect(locations[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    const result = await createLocation(minimalInput);

    // Query database to verify null handling
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].name).toEqual('Minimal Office');
    expect(locations[0].description).toBeNull();
  });

  it('should create multiple locations with unique IDs', async () => {
    const location1 = await createLocation({
      name: 'Office 1',
      description: 'First office'
    });

    const location2 = await createLocation({
      name: 'Office 2',
      description: 'Second office'
    });

    // Should have different IDs
    expect(location1.id).not.toEqual(location2.id);

    // Both should be in database
    const allLocations = await db.select()
      .from(locationsTable)
      .execute();

    expect(allLocations).toHaveLength(2);
    expect(allLocations.map(l => l.name)).toContain('Office 1');
    expect(allLocations.map(l => l.name)).toContain('Office 2');
  });
});