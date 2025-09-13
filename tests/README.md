# Domain Runner Test Suite

This directory contains the comprehensive test suite for the Domain Runner project, ensuring code quality and reliability across all components.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   └── database/           # Database-specific unit tests
├── integration/            # Integration tests for service interactions
├── e2e/                    # End-to-end workflow tests
├── fixtures/               # Test data and fixtures
├── mocks/                  # Mock implementations
└── setup.ts                # Global test setup and configuration
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
npm run test:unit         # Run only unit tests
npm run test:integration  # Run only integration tests
npm run test:e2e         # Run only E2E tests
```

### With Coverage
```bash
npm run test:coverage    # Run all tests with coverage report
```

### Watch Mode
```bash
npm run test:watch      # Run tests in watch mode for development
```

### Full Test Suite with Reports
```bash
./scripts/run-tests.sh  # Comprehensive test run with reports
```

## Test Categories

### Unit Tests
- **Sophisticated Runner Service**: Core domain processing logic
- **Database Pool**: Connection management and query operations
- **LLM Providers**: API integration and response handling
- **Frontend Components**: React component behavior

### Integration Tests
- **Domain Processing**: Full processing workflow with database
- **Database Migrations**: Schema creation and updates
- **API Endpoints**: HTTP request/response handling
- **Service Communication**: Inter-service data flow

### End-to-End Tests
- **Complete Workflow**: Domain submission to final results
- **Concurrent Processing**: Multiple domain handling
- **Error Recovery**: Failure scenarios and recovery
- **Data Quality**: Response validation and scoring

## Writing Tests

### Test File Naming
- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### Test Structure Example
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('functionName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });

    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

## Mocking

### Database Mocking
```typescript
import { Pool } from 'pg';
jest.mock('pg');

const mockPool = {
  query: jest.fn(),
  end: jest.fn(),
};
(Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
```

### API Mocking
```typescript
import { createMockFetch } from '../mocks/llm-providers.mock';

global.fetch = createMockFetch({
  defaultFailureRate: 0.1,
  defaultResponseDelay: 100,
});
```

## Test Data

### Fixtures
Located in `tests/fixtures/`, containing:
- Mock domains
- Sample API responses
- Test database records
- Configuration examples

### Environment Variables
Set in `tests/setup.ts`:
- `NODE_ENV=test`
- Mock API keys
- Test database URL

## Coverage Requirements

The project enforces the following coverage thresholds:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

View coverage reports:
- HTML Report: `coverage/final/index.html`
- Console Summary: Run `npm run test:coverage`

## Continuous Integration

Tests are automatically run on:
- Pull requests
- Commits to main branch
- Scheduled daily runs

### CI Environment Variables
Required for CI/CD:
- `TEST_DATABASE_URL`: PostgreSQL test database
- `CI`: Set to `true` in CI environment

## Debugging Tests

### Run Single Test File
```bash
jest path/to/test.file.ts
```

### Run Tests Matching Pattern
```bash
jest --testNamePattern="should process domains"
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe what they test
3. **Coverage**: Aim for meaningful coverage, not just numbers
4. **Speed**: Keep unit tests fast (<100ms each)
5. **Reliability**: Tests should not be flaky
6. **Maintenance**: Update tests when code changes

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check `TEST_DATABASE_URL` is set correctly

2. **Timeout Errors**
   - Increase timeout: `jest.setTimeout(30000)`
   - Check for unresolved promises

3. **Module Import Errors**
   - Clear Jest cache: `jest --clearCache`
   - Check tsconfig paths

4. **Coverage Not Generated**
   - Ensure `--coverage` flag is used
   - Check Jest configuration in `jest.config.js`

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this README if needed

For questions or issues, check the project documentation or open an issue.