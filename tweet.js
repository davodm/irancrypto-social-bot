const { getPopular } = require("./src/api");
const { tweet } = require("./src/twitter");
const { writeTweet } = require("./src/ai");
const { getLastRunTime, updateLastRunTime } = require("./src/dynamodb");
const { abbreviateNumber } = require("./src/number");

exports.handler = async function (event) {
  //Get Data from API
  try {
    const popularItems = await getPopular();
    //Calculate total Vol
    let totalVolIRR = 0;
    popularItems.forEach((item) => {
      totalVolIRR += item.irr.volume;
      item.irrfvol = abbreviateNumber(item.irr.volume, 1, false); //Formatted version
    });

    //Tweets subject
    const tweets = {
      trends:
        "Write about the top 3 crypto trends in the past 24 hours in Iran. Include only the name and volume in IRR currency. Please format each trend on a new line for clarity.",
      vol: "Write about the total volume of crypto transactions in Iran in the past 24 hours, all in IRR currency",
    };

    //Last run check
    const lastRun = await getLastRunTime();
    if (Date.now() - (lastRun.timestamp ?? 0) < 3600 * 1000) {
      throw new Error("Last run is less than one hour!");
    }

    //Remove runned one
    delete tweets[lastRun.actionSubject];
    let post;
    let lastKey;
    //Pick one and tweet from the list
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

    //Send tweet
    if (post) {
      await tweet(post);
    }

    //Update last run
    await updateLastRunTime(lastKey);

    //Out
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
  // Find the index of the first hashtag
  const firstHashtagIndex = inputText.indexOf("#");

  // Insert a line break before the first hashtag
  let formattedText = inputText;
  if (firstHashtagIndex !== -1) {
    formattedText =
      formattedText.slice(0, firstHashtagIndex) +
      "\n\n" +
      formattedText.slice(firstHashtagIndex);
  }
  return formattedText;
}
