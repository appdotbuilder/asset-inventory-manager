import { type CreateLocationInput, type Location } from '../schema';

export const createLocation = async (input: CreateLocationInput): Promise<Location> => {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is to create a new location in the database.
  // This will be used for managing the location dropdown options.
  return {
    id: 0,
    name: input.name,
    description: input.description || null,
    created_at: new Date()
  };
};