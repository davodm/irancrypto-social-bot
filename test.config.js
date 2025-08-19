export default {
  // Test timeout in milliseconds
  timeout: 30000,
  
  // Test directories to include
  include: ['test/**/*.js'],
  
  // Test directories to exclude
  exclude: ['test/**/*.skip.js', 'test/**/*.slow.js'],
  
  // Environment variables for tests
  env: {
    NODE_ENV: 'test',
    OPENAI_MODEL: 'gpt-4'
  },
  
  // Test reporters
  reporters: ['console'],
  
  // Coverage settings (when using c8)
  coverage: {
    enabled: false,
    threshold: 80,
    exclude: [
      'test/**',
      'node_modules/**',
      'coverage/**'
    ]
  }
};
