import { getPopular } from "./src/api.js";
import { tweet } from "./src/twitter.js";
import { writeTweet } from "./src/ai.js";
import { getLastRunTime, updateLastRunTime } from "./src/dynamodb.js";
import { abbreviateNumber } from "./src/number.js";

export const handler = async function (event) {
  // Get Data from API
  try {
    const popularItems = await getPopular();
    // Calculate total Vol
    let totalVolIRR = 0;
    popularItems.forEach((item) => {
      totalVolIRR += item.irr.volume;
      item.irrfvol = abbreviateNumber(item.irr.volume, 1, false); //Formatted version
    });

    // Tweets subject
    const tweets = {
      trends:
        "Write about the top 3 crypto trends in the past 24 hours in Iran. Include only the name and volume in IRR currency. Please format each trend on a new line for clarity.",
      vol: "Write about the total volume of crypto transactions in Iran in the past 24 hours, all in IRR currency",
    };

    // Last run check
    const lastRun = await getLastRunTime("tweet");
    // Checking to can't be run less than one hour (58 mins)
    if (Date.now() - (lastRun.timestamp ?? 0) < 3480 * 1000) {
      throw new Error("Last run is less than one hour!");
    }

    // Remove runned one
    delete tweets[lastRun.actionSubject];
    let post;
    let lastKey;
    // Pick one and tweet from the list
    for await (const [key, value] of Object.entries(tweets)) {
      post = buildTweet(
        key,
        await writeTweet(value),
        popularItems,
        totalVolIRR
      );
      lastKey = key;
      break;
    }

    // Send tweet
    if (post) {
      await tweet(post);
    }

    // Update last run time to know what was the last tweet
    await updateLastRunTime("tweet", { actionSubject: lastKey });

    // Out
    console.log("Tweet sent successfully!", post);
  } catch (err) {
    console.error(err);
  }
};

/**
 *
 * @param {string} $type
 * @param {string} $content
 * @param {object[]} $popularItems
 * @param {number} $totalVolIRR
 * @returns {string}
 */
function buildTweet($type, $content, $popularItems, $totalVolIRR) {
  // Remove double quotes from the beginning and end of the string if they exist
  if ($content && $content.startsWith('"') && $content.endsWith('"')) {
    $content = $content.slice(1, -1);
  }
  switch ($type.toLowerCase()) {
    case "trends":
      let placeholderIndex = 1;
      for (let i = 0; i < 3; i++) {
        //Name
        $content = $content.replace(
          `%${placeholderIndex}%`,
          $popularItems[i].name_en
        );
        placeholderIndex++;
        //Vol
        $content = $content.replace(
          `%${placeholderIndex}%`,
          $popularItems[i].irrfvol
        );
        placeholderIndex++;
      }
      break;
    case "vol":
      $content = $content.replace(
        `%1%`,
        abbreviateNumber($totalVolIRR, 1, true)
      );
      break;
    default:
      throw new Error("Template could not recognized");
      break;
  }
  return lineBreak($content);
}

/**
 * Line break before hashtag
 * @param {string} inputText
 * @returns {string}
 */
function lineBreak(inputText) {
  // Find the hashtags
  const hashtags = findHashtags(inputText);
  // If there is no second last hashtag or no hashtags at all
  if (hashtags.count == 0 || hashtags.atEnd.length == 0) {
    return inputText;
  }
  // Find the index of the first last hashtag
  let hashtagIndex = inputText.indexOf(hashtags.atEnd[0]);
  // If there is no index of the second last hashtag, return the input text
  if (hashtagIndex === -1) {
    return inputText;
  }
  // Insert a line break before the first hashtag
  let formattedText = inputText;
  formattedText =
    formattedText.slice(
      0,
      inputText[hashtagIndex - 1] === " " ? hashtagIndex - 1 : hashtagIndex
    ) + // If there is a space before the hashtag, remove it
    "\n\n" +
    formattedText.slice(hashtagIndex);
  return formattedText;
}

/**
 * Find hashtags in the content
 * @param {string} content 
 * @returns {object}
 */
function findHashtags(content) {
  const hashtags = content.match(/#\w+/g) || [];
  const lastLineStartIndex = content.lastIndexOf("\n") + 1;
  const hashtagsInText = [];
  const hashtagsAtEnd = [];

  for (const hashtag of hashtags) {
    const hashtagIndex = content.indexOf(hashtag);
    if (hashtagIndex >= lastLineStartIndex) {
      hashtagsAtEnd.push(hashtag);
    } else {
      hashtagsInText.push(hashtag);
    }
  }

  return {
    count: hashtags.length,
    inText: hashtagsInText,
    atEnd: hashtagsAtEnd,
  };
}
