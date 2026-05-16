// You can also use CommonJS `require('@sentry/node')` instead of `import`
import * as Sentry from "@sentry/node";

const sentryDsn = (process.env.SENTRY_DSN || "").trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    // Performance Monitoring
    tracesSampleRate: 0,
  });
}

/** Log Sentry on/off once per execution environment, from inside the handler (valid RequestId in CloudWatch). */
let sentryBootstrapLogged = false;
export function logLambdaBootstrap() {
  if (sentryBootstrapLogged) return;
  sentryBootstrapLogged = true;
  if (sentryDsn) {
    console.log("Sentry initialized successfully");
  } else {
    console.log("Sentry DSN not provided, error tracking disabled");
  }
}

/**
 * Capture an exception with Sentry
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context to include
 */
export function captureError(error, context = {}) {
  if (sentryDsn) {
    Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || {},
      user: context.user || {},
    });
  }
  // When Sentry is off, rely on caller / Lambda runtime logging (avoid duplicate ERROR lines).
}

export function captureException(error, context = {}) {
  return captureError(error, context);
}

/**
 * Capture a message with Sentry
 * @param {string} message - The message to capture
 * @param {string} level - The severity level (error, warning, info, debug)
 * @param {Object} context - Additional context to include
 */
export function captureMessage(message, level = "info", context = {}) {
  if (sentryDsn) {
    Sentry.captureMessage(message, level, {
      tags: context.tags || {},
      extra: context.extra || {},
    });
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}

export function withSentry(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      captureError(error, {
        tags: {
          handler: handler.name || "anonymous",
        },
        extra: {
          args: args.length > 0 ? JSON.stringify(args) : undefined,
        },
      });
      throw error;
    }
  };
}
