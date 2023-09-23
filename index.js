const { getPopular } = require("./src/api");
const { tweet } = require("./src/twitter");
const { writeTweet } = require("./src/ai");
const { getLastRunTime, updateLastRunTime } = require("./src/dynamodb");
const numeral = require("numeral");

exports.handler = async function (event) {
  //Get Data from API
  try {
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
      vol: "write about how much was the whole crypto volume of local exchanges in past 24 hours in Iran (use IRR currency)",
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
          convertToBold($popularItems[i].name_en)
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
  return lineBreak($content);
}

/**
 * Convert to bold character, ideal for tweets
 * @param {string} text
 * @returns {string}
 */
function convertToBold(text) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bold_chars =
    "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵";
  let result = "";
  for (const char of text) {
    const index = chars.indexOf(char);
    if (index !== -1) {
      result += bold_chars.charAt(index);
    } else {
      result += char; // If character not in the mapping, keep it unchanged
    }
  }
  return result;
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
