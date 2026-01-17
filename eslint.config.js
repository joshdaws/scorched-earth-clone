import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly'
      }
    },
    files: ['js/**/*.js', 'tests/**/*.js'],
    rules: {
      // Error prevention - unused vars are warnings to allow gradual cleanup
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-undef': 'error',
      'no-duplicate-imports': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      // Code quality - prefer-const is a warning for gradual adoption
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',

      // Style consistency
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],

      // Relaxed rules for game code
      'no-console': 'off', // Debug logging is intentional
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'www/**',
      'coverage/**',
      'js/vendor/**',
      '*.csproj',
      'Assets/**',
      'Library/**',
      'Logs/**',
      'Temp/**',
      'UserSettings/**'
    ]
  }
];
