// Common test utilities for lightweight testing

/**
 * Creates a simple mock function
 * @param {*} returnValue - Value to return when called
 * @returns {Function} Mock function with call tracking
 */
export function createMock(returnValue) {
  const mock = (...args) => {
    mock.calls.push(args);
    return returnValue;
  };
  mock.calls = [];
  mock.reset = () => { mock.calls = []; };
  mock.called = () => mock.calls.length > 0;
  mock.calledWith = (...args) => mock.calls.some(call => 
    call.length === args.length && call.every((val, i) => val === args[i])
  );
  return mock;
}

/**
 * Creates a spy function that tracks calls
 * @param {Function} fn - Function to spy on (optional)
 * @returns {Function} Spy function with call tracking
 */
export function createSpy(fn) {
  const spy = (...args) => {
    spy.calls.push(args);
    return fn ? fn(...args) : undefined;
  };
  spy.calls = [];
  spy.reset = () => { spy.calls = []; };
  spy.called = () => spy.calls.length > 0;
  spy.calledWith = (...args) => spy.calls.some(call => 
    call.length === args.length && call.every((val, i) => val === args[i])
  );
  return spy;
}

/**
 * Creates a mock response object for fetch
 * @param {*} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Object} Mock response object
 */
export function createMockResponse(data, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    headers: new Map()
  };
}

/**
 * Creates a mock error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Object} Mock error response
 */
export function createMockErrorResponse(message = 'Error', status = 500) {
  return {
    status,
    ok: false,
    json: () => Promise.reject(new Error(message)),
    text: () => Promise.resolve(message),
    headers: new Map()
  };
}

/**
 * Waits for a specified amount of time (useful for async tests)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a test environment setup function
 * @param {Object} env - Environment variables to set
 * @returns {Function} Function to restore original environment
 */
export function setupTestEnv(env = {}) {
  const original = {};
  
  // Store original values
  Object.keys(env).forEach(key => {
    original[key] = process.env[key];
  });
  
  // Set new values
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  // Return restore function
  return () => {
    Object.entries(original).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };
}
