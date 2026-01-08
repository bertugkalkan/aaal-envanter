require('@testing-library/jest-dom');

// Reset data directory before each test file
beforeAll(() => {
    process.env.NODE_ENV = 'test';
});
