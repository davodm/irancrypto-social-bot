const { OpenAI } = require("openai");
const openai = new OpenAI({
  organization: process.env.OPENAI_ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 10 * 1000, // Timeout is in ms
});

async function ask($messages) {
  const result = await openai.chat.completions.create({
    messages: $messages,
    model: process.env.OPENAI_MODEL,
    max_tokens: process.env.OPENAI_MODEL.includes("gpt-4") ? 5000 : 3000, //The maximum number of tokens to generate in the completion.
    temperature: 0.2, //What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random
  });

  if (!result.choices && result.choices.length === 0) {
    throw new Error("No response received");
  }

  return result.choices;
}

async function writeTweet($subject) {
  const messages = [
    {
      role: "system",
      content:
        "Act as a content marketing specialist. Generate a creative, rich templated tweet at max 200 characters which will be filled out with our data later. remember that each filling space should be something replaceable. So the template strings should be defined just incremental numbers between % like %1%, %2%, %3%",
    },
    { role: "user", content: $subject },
  ];
  try {
    const result = await ask(messages);
    if (result.length > 0) {
      return result[0].message.content;
    }
  } catch (err) {
    console.log("AI error: " + err.message);
    return null;
  }
}

module.exports = {
  ask,
  writeTweet,
};
