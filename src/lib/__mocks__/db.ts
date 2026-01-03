import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create a mock Prisma client
export const prismaMock = mockDeep<PrismaClient>();

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Export the mock as the default prisma instance
export const prisma = prismaMock;
export default prismaMock;

// Type for the mocked Prisma client
export type MockPrismaClient = DeepMockProxy<PrismaClient>;
