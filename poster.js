import { getScheduledPosts, removeScheduledPost } from "./src/dynamodb.js";
import { makeInstagram, makeTelegram, makeTweet } from "./src/content.js";

export const handler = async (event) => {
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
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Scheduled posts processed successfully" }),
  };
};
