import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for Node.js test environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  Object.assign(global, { TextEncoder, TextDecoder });
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

// Mock console.error to reduce noise in tests (optional)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args: unknown[]) => {
//     if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });
// afterAll(() => {
//   console.error = originalError;
// });

// Global test timeout
jest.setTimeout(10000);

// Mock environment variables if needed
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
