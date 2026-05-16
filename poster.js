import "./src/sentry.js"; // Initialize Sentry early
import { getScheduledPosts, removeScheduledPost } from "./src/dynamodb.js";
import { makeInstagram, makeTelegram, makeTweet } from "./src/content.js";
import { captureError, logLambdaBootstrap } from "./src/sentry.js";

function summarizeQueue(posts) {
  const counts = {};
  for (const { platform, target } of posts) {
    const key = `${platform}/${target}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export const handler = async (event) => {
  logLambdaBootstrap();
  try {
    const posts = await getScheduledPosts();

    if (posts.length === 0) {
      console.log("No scheduled posts due");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No scheduled posts due" }),
      };
    }

    console.log(`Processing ${posts.length} scheduled post(s):`, summarizeQueue(posts));

    for (const post of posts) {
      const { platform, data, target, timestamp } = post;
      const scheduledFor = timestamp
        ? new Date(timestamp * 1000).toISOString()
        : "unknown";

      console.log(
        `▶ ${platform}/${target} (scheduled for ${scheduledFor}, ${Array.isArray(data) ? data.length : 0} data rows)`
      );

      try {
        let result;
        switch (platform.toLowerCase()) {
          case "twitter":
            result = await makeTweet(target, data);
            break;
          case "instagram":
            result = await makeInstagram(target, data);
            break;
          case "telegram":
            result = await makeTelegram(target, data);
            break;
          default:
            console.warn(`Unknown platform "${platform}", skipping`);
            continue;
        }

        if (!result?.posted) {
          console.warn(
            `⏭️ Not posted to ${platform}/${target}: ${result?.reason ?? "skipped"}`
          );
          continue;
        }

        await removeScheduledPost(platform, target);
        console.log(
          `✅ Posted to ${platform}/${target} — ${JSON.stringify(result.summary)}`
        );
      } catch (error) {
        console.error(`Failed to post to ${platform} (target=${target}):`, error);
        captureError(error, {
          tags: {
            platform: platform,
            target: target,
            worker: "poster",
          },
          extra: {
            postData: JSON.stringify(data),
            timestamp: timestamp,
          },
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Scheduled posts processed successfully" }),
    };
  } catch (error) {
    captureError(error, {
      tags: {
        worker: "poster",
        function: "handler",
      },
      extra: {
        event: JSON.stringify(event),
      },
    });
    throw error;
  }
};
