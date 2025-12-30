import "./src/sentry.js"; // Initialize Sentry early
import { getScheduledPosts, removeScheduledPost } from "./src/dynamodb.js";
import { makeInstagram, makeTelegram, makeTweet } from "./src/content.js";
import { captureError } from "./src/sentry.js";

export const handler = async (event) => {
  try {
    const posts = await getScheduledPosts();

    for (const post of posts) {
      const { platform, data, target, timestamp } = post;
      try {
        switch (platform.toLowerCase()) {
          case "twitter":
            await makeTweet(target, data);
            break;
          case "instagram":
            await makeInstagram(target, data);
            break;
          case "telegram":
            await makeTelegram(target, data);
            break;
        }
        await removeScheduledPost(platform, target);
        console.log(
          `Posted to ${platform} and removed the scheduled post from DynamoDB`
        );
      } catch (error) {
        console.error(`Failed to post to ${platform}:`, error);
        captureError(error, {
          tags: {
            platform: platform,
            target: target,
            worker: 'poster'
          },
          extra: {
            postData: JSON.stringify(data),
            timestamp: timestamp
          }
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
        worker: 'poster',
        function: 'handler'
      },
      extra: {
        event: JSON.stringify(event)
      }
    });
    throw error; // Re-throw to maintain Lambda error handling
  }
};
