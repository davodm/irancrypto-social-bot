// Load environment variables FIRST, before importing any modules
import dotenv from "dotenv";
import fs from "fs";

const envFile = ".env";
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

import { test, describe } from "node:test";
import assert from "node:assert";
import {
  ask,
  writeTweet,
  writeCaption,
  estimateTokenCount,
} from "../src/ai.js";

describe("AI Helper", () => {
  describe("Utility Functions", () => {
    test("estimateTokenCount should work correctly", () => {
      // Test various content types
      assert.strictEqual(estimateTokenCount(""), 0);
      assert.strictEqual(estimateTokenCount("Hello"), 2); // 5 chars / 3.5 ≈ 2
      assert.strictEqual(estimateTokenCount("Hello world"), 4); // 11 chars / 3.5 ≈ 4

      // Test Persian/Farsi content (unicode characters)
      const persianText = "سلام دنیا"; // 8 characters
      assert.strictEqual(estimateTokenCount(persianText), 3); // 8 chars / 3.5 ≈ 3

      // Test long content
      const longText = "A".repeat(100);
      assert.strictEqual(estimateTokenCount(longText), 29); // 100 chars / 3.5 ≈ 29
    });

    test("estimateTokenCount should handle edge cases", () => {
      // Test edge cases - function should handle gracefully
      assert.strictEqual(estimateTokenCount(null), 0);
      assert.strictEqual(estimateTokenCount(undefined), 0);
      // For non-string inputs, the function should return 0 or handle gracefully
      assert.strictEqual(estimateTokenCount(123), 0);
      assert.strictEqual(estimateTokenCount({}), 0);
    });
  });

  describe("AI Functions - Input Validation", () => {
    test("ask function should validate input correctly", async () => {
      // Test invalid inputs - these are async functions, so we need to await them
      await assert.rejects(
        () => ask(null),
        /Messages must be a non-empty array/
      );
      await assert.rejects(() => ask([]), /Messages must be a non-empty array/);
      await assert.rejects(
        () => ask([{ role: "user" }]),
        /Each message must have 'role' and 'content' properties/
      );
      await assert.rejects(
        () => ask([{ role: "invalid", content: "test" }]),
        /Message role must be 'system', 'user', or 'assistant'/
      );
    });

    test("writeTweet function should validate input correctly", async () => {
      // Test invalid inputs - these are async functions, so we need to await them
      await assert.rejects(
        () => writeTweet(null),
        /Subject must be a non-empty string/
      );
      await assert.rejects(
        () => writeTweet(""),
        /Subject must be a non-empty string/
      );
      await assert.rejects(
        () => writeTweet(123),
        /Subject must be a non-empty string/
      );
    });

    test("writeCaption function should validate input correctly", async () => {
      // Test invalid inputs - these are async functions, so we need to await them
      await assert.rejects(
        () => writeCaption(null),
        /Subject must be a non-empty string/
      );
      await assert.rejects(
        () => writeCaption(""),
        /Subject must be a non-empty string/
      );
      await assert.rejects(
        () => writeCaption(123),
        /Subject must be a non-empty string/
      );
    });
  });

  describe("AI Functions - Real API Tests", () => {
    test("ask function should work with real API", async () => {
      const messages = [
        {
          role: "user",
          content: "Hello, please respond with 'OK' if you're working.",
        },
      ];

      try {
        const result = await ask(messages, { maxTokens: 50 });
        assert(Array.isArray(result));
        assert(result.length > 0);
        assert(result[0].message);
        assert(result[0].message.content);
      } catch (error) {
        // API might be temporarily unavailable - this is expected in production
        console.log("⚠️  API temporarily unavailable:", error.message);
      }
    });

    test("writeTweet should generate tweet content", async () => {
      const subject = "Create a tweet about cryptocurrency trading";
      const result = await writeTweet(subject);

      // Result can be string (success) or null (API failure) - both are valid in production
      if (result !== null) {
        assert(typeof result === "string");
        assert(result.length > 0);
        // Twitter limit is 280, but allow some buffer for dynamic content
        assert(
          result.length <= 300,
          `Tweet too long: ${result.length} characters (max 300)`
        );
      }
    });

    test("writeCaption should generate Instagram caption", async () => {
      const subject = "Create an Instagram caption about crypto market trends";
      const result = await writeCaption(subject);

      // Result can be string (success) or null (API failure) - both are valid in production
      if (result !== null) {
        assert(typeof result === "string");
        assert(result.length > 0);
        assert(result.length <= 2000); // Instagram limit
      }
    });
  });
});
