import dotenv from "dotenv";
import fs from "fs";

// Load .env file for tests
const envFile = ".env";
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

// Simple test utilities
global.testUtils = {
  // Simple mock function creator
  createMock: (returnValue) => {
    const mock = (...args) => {
      mock.calls.push(args);
      return returnValue;
    };
    mock.calls = [];
    mock.reset = () => {
      mock.calls = [];
    };
    return mock;
  },

  // Simple spy function
  createSpy: (fn) => {
    const spy = (...args) => {
      spy.calls.push(args);
      return fn ? fn(...args) : undefined;
    };
    spy.calls = [];
    spy.reset = () => {
      spy.calls = [];
    };
    return spy;
  },
};
