const { getPopular } = require("./twitter");
const { tweet } = require("./twitter");
const { writeTweet } = require("./ai");
const dynamodb = require("./dynamodb");
const numeral = require("numeral");

exports.handler = async function (event) {
  //Get Data from API
  const popularItems = await getPopular();
  //Calculate total Vol
  let totalVolIRR = 0;
  popularItems.forEach((item) => {
    totalVolIRR += item.irr.volume;
    item.irrfvol = numeral(item.irr.volume).format("0,0.0a"); //Formatted version
  });

  //Tweets subject
  const tweets = {
    trends:
      "write about top 3 crypto trends in past 24 hours in Iran only the name and volume of transactions in IRR",
    vol: "write about how much was the whole crypto volume of local exchanges in past 24 hours in Iran (use IRR currency) at max 280 characters",
  };

  //Last run check
  const lastRun = await dynamodb.getLastRunTime();
  if (Date().now() - (lastRun.timestamp ?? 0) < 3600 * 1000) {
    throw new Error("Last run is less than one hour!");
  }
  //Remove runned one
  delete tweets[lastRun.subject];

  let post;
  let lastKey;
  //Pick one and tweet from the list
  for await (const [key, value] of Object.entries(tweets)) {
    post = buildTweet(key, await writeTweet(value), popularItems, totalVolIRR);
    lastKey = key;
    break;
  }

  //Send tweet
  if (post) {
    await tweet(post);
  }

  //Update last run
  dynamodb.updateLastRunTime(lastKey);
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
        numeral($totalVolIRR).format("0,0.00a")
      );
      break;
    default:
      throw new Error("Template could not recognized");
      break;
  }
  return $content;
}
