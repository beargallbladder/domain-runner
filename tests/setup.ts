// Global test setup
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test_user:test_pass@localhost:5432/test_db';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
process.env.MISTRAL_API_KEY = 'test-mistral-key';
process.env.XAI_API_KEY = 'test-xai-key';
process.env.TOGETHER_API_KEY = 'test-together-key';
process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
process.env.GOOGLE_API_KEY = 'test-google-key';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});