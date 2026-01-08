/** @type {import('jest').Config} */
const config = {
    coverageProvider: 'v8',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                module: 'commonjs',
                esModuleInterop: true,
            }
        }],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)',
    ],
    collectCoverageFrom: [
        'src/lib/**/*.ts',
        'src/app/api/**/*.ts',
        '!src/**/*.d.ts',
    ],
};

module.exports = config;
