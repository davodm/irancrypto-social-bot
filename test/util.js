import { test, describe } from "node:test";
import assert from "node:assert";
import {
  replacePlaceholders,
  normalizeLineBreaks,
  findHashtags,
  formatHashtagBlock,
  formatContent,
  validateArrayLength,
  safeArrayAccess,
} from "../src/util.js";

describe("Utility Functions", () => {
  describe("replacePlaceholders", () => {
    test("should replace single placeholder", () => {
      const result = replacePlaceholders("Total: %1% IRR", { "1": "100M" });
      assert.strictEqual(result, "Total: 100M IRR");
    });

    test("should replace multiple placeholders", () => {
      const result = replacePlaceholders(
        "1. %1% (%2%)\n2. %3% (%4%)",
        { "1": "BTC", "2": "50M", "3": "ETH", "4": "30M" }
      );
      assert.strictEqual(result, "1. BTC (50M)\n2. ETH (30M)");
    });

    test("should use fallback for missing placeholders", () => {
      const result = replacePlaceholders("1. %1%\n2. %3%", { "1": "BTC" }, "N/A");
      assert.strictEqual(result, "1. BTC\n2. N/A");
    });

    test("should handle null/undefined content", () => {
      assert.strictEqual(replacePlaceholders(null, {}), "");
      assert.strictEqual(replacePlaceholders(undefined, {}), "");
    });

    test("should handle empty replacements", () => {
      const result = replacePlaceholders("No placeholders here", {});
      assert.strictEqual(result, "No placeholders here");
    });
  });

  describe("normalizeLineBreaks", () => {
    test("should convert to LF style", () => {
      const result = normalizeLineBreaks("line1\r\nline2\rline3\nline4", "\n");
      assert.strictEqual(result, "line1\nline2\nline3\nline4");
    });

    test("should convert to CRLF style", () => {
      const result = normalizeLineBreaks("line1\nline2\rline3", "\r\n");
      assert.strictEqual(result, "line1\r\nline2\r\nline3");
    });

    test("should handle null/undefined content", () => {
      assert.strictEqual(normalizeLineBreaks(null), "");
      assert.strictEqual(normalizeLineBreaks(undefined), "");
    });
  });

  describe("findHashtags", () => {
    test("should find all hashtags", () => {
      const result = findHashtags("Check out #Bitcoin and #Ethereum! #Crypto");
      assert.strictEqual(result.count, 3);
      assert.strictEqual(result.all.length, 3);
    });

    test("should categorize hashtags by position", () => {
      const content = "Some text here\n#HashtagAtEnd #Another";
      const result = findHashtags(content);
      assert.strictEqual(result.atEnd.length, 2);
      assert.strictEqual(result.atEnd[0].hashtag, "#HashtagAtEnd");
    });

    test("should handle duplicate hashtags correctly", () => {
      const content = "#BTC is rising. Buy #BTC now!\n#BTC #ETH";
      const result = findHashtags(content);
      // All 4 occurrences should be found
      assert.strictEqual(result.count, 4);
      // Each has correct position
      assert.strictEqual(result.all[0].index, 0);
      assert.strictEqual(result.all[1].index, 20);
    });

    test("should handle content with no hashtags", () => {
      const result = findHashtags("No hashtags here");
      assert.strictEqual(result.count, 0);
      assert.deepStrictEqual(result.all, []);
    });

    test("should handle null/undefined content", () => {
      assert.strictEqual(findHashtags(null).count, 0);
      assert.strictEqual(findHashtags(undefined).count, 0);
    });
  });

  describe("formatHashtagBlock", () => {
    test("should add line breaks before hashtags at end of line", () => {
      // Hashtags at end of content (after newline)
      const content = "Some text here\n#Crypto #BTC";
      const result = formatHashtagBlock(content, "\n");
      assert(result.includes("\n\n#Crypto"), `Expected double newline before hashtags, got: ${result}`);
    });

    test("should not modify if already has spacing", () => {
      const content = "Some text\n\n#Crypto #BTC";
      const result = formatHashtagBlock(content, "\n");
      assert.strictEqual(result, content);
    });

    test("should handle content with no hashtags", () => {
      const content = "No hashtags here";
      const result = formatHashtagBlock(content, "\n");
      assert.strictEqual(result, content);
    });

    test("should use correct line break style for CRLF", () => {
      const content = "Some text here\r\n#Crypto";
      const result = formatHashtagBlock(content, "\r\n");
      assert(result.includes("\r\n\r\n#Crypto"), `Expected CRLF double newline, got: ${result}`);
    });

    test("should handle hashtags in middle of content", () => {
      // Hashtags not at end should not trigger formatting
      const content = "Check #BTC price\nMore text here";
      const result = formatHashtagBlock(content, "\n");
      // Should not add extra line breaks since hashtag is in middle
      assert.strictEqual(result, content);
    });
  });

  describe("formatContent", () => {
    test("should remove markdown bold", () => {
      const result = formatContent("This is **bold** text");
      assert.strictEqual(result, "This is bold text");
    });

    test("should remove markdown italic", () => {
      const result = formatContent("This is *italic* text");
      assert.strictEqual(result, "This is italic text");
    });

    test("should not over-strip single asterisks", () => {
      // Asterisks used in math or other contexts should be handled carefully
      const result = formatContent("5 * 3 = 15");
      // This should preserve the asterisk as it's not paired markdown
      assert(result.includes("*") || result === "5 * 3 = 15");
    });

    test("should normalize escaped line breaks", () => {
      const result = formatContent("line1\\r\\nline2\\nline3");
      assert(!result.includes("\\n"));
      assert(!result.includes("\\r"));
    });

    test("should remove wrapping quotes", () => {
      assert.strictEqual(formatContent('"quoted text"'), "quoted text");
      assert.strictEqual(formatContent("'quoted text'"), "quoted text");
    });

    test("should normalize line breaks to target style", () => {
      const result = formatContent("line1\r\nline2\nline3", { lineBreak: "\n" });
      assert(!result.includes("\r\n"));
      assert(result.includes("\n"));
    });

    test("should enforce max length", () => {
      const longText = "A".repeat(100);
      const result = formatContent(longText, { maxLength: 50 });
      assert(result.length <= 50);
      assert(result.endsWith("…"));
    });

    test("should keep first block only when requested", () => {
      const content = "First paragraph.\n\nSecond paragraph.";
      const result = formatContent(content, { keepFirstBlock: true });
      assert.strictEqual(result, "First paragraph.");
    });

    test("should handle null/undefined content", () => {
      assert.strictEqual(formatContent(null), "");
      assert.strictEqual(formatContent(undefined), "");
    });
  });

  describe("validateArrayLength", () => {
    test("should pass for valid array", () => {
      assert.doesNotThrow(() => validateArrayLength([1, 2, 3], 2));
    });

    test("should throw for array too short", () => {
      assert.throws(
        () => validateArrayLength([1], 3, "Items"),
        /Items must have at least 3 items/
      );
    });

    test("should throw for non-array", () => {
      assert.throws(
        () => validateArrayLength("not array", 1, "Data"),
        /Data must be an array/
      );
    });
  });

  describe("safeArrayAccess", () => {
    test("should return item at valid index", () => {
      assert.strictEqual(safeArrayAccess([1, 2, 3], 1), 2);
    });

    test("should return fallback for out of bounds", () => {
      assert.strictEqual(safeArrayAccess([1, 2], 5, "default"), "default");
    });

    test("should return fallback for negative index", () => {
      assert.strictEqual(safeArrayAccess([1, 2], -1, null), null);
    });

    test("should return fallback for non-array", () => {
      assert.strictEqual(safeArrayAccess(null, 0, "fallback"), "fallback");
      assert.strictEqual(safeArrayAccess("string", 0, "fallback"), "fallback");
    });
  });
});
