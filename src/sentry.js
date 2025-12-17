// You can also use CommonJS `require('@sentry/node')` instead of `import`
import * as Sentry from "@sentry/node";
import { getENV } from "./env.js";

// Initialize Sentry only if SENTRY_DNS is provided and not empty
const sentryDsn = getENV("SENTRY_DNS", "");

if (sentryDsn && sentryDsn.trim() !== "") {
  Sentry.init({
    dsn: sentryDsn,
  });
  console.log("Sentry initialized successfully");
} else {
  console.log("Sentry DSN not provided, error tracking disabled");
}

/**
 * Capture an exception with Sentry
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context to include
 */
export function captureError(error, context = {}) {
  if (sentryDsn && sentryDsn.trim() !== "") {
    Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || {},
      user: context.user || {},
    });
  } else {
    console.error("Error occurred but Sentry not configured:", error.message);
  }
}

/**
 * Capture a message with Sentry
 * @param {string} message - The message to capture
 * @param {string} level - The severity level (error, warning, info, debug)
 * @param {Object} context - Additional context to include
 */
export function captureMessage(message, level = "info", context = {}) {
  if (sentryDsn && sentryDsn.trim() !== "") {
    Sentry.captureMessage(message, level, {
      tags: context.tags || {},
      extra: context.extra || {},
    });
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}