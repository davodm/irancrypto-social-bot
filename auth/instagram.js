require("dotenv").config();
const inquirer = require('inquirer');
const bluebird = require("bluebird");
const { IgApiClient,IgCheckpointError } = require("instagram-private-api");

const ig = new IgApiClient();

/**
 * It doesn't need to obtain anything, it's just showing the current user data
 * @returns {Promise<object>}
 */
async function login() {
  // basic login-procedure
  ig.state.generateDevice(process.env.IG_USERNAME);
  if (process.env?.IG_PROXY) {
    ig.state.proxyUrl = process.env.IG_PROXY;
  }
  //Start Logging in via bluebird to catch the checkpoint
  bluebird
    .try(async () => {
      const user = await ig.account.login(
        process.env.IG_USERNAME,
        process.env.IG_PASSWORD
      );
      // Show user
      console.log(user);
    })
    .catch(IgCheckpointError, async () => {
      console.log(ig.state.checkpoint); // Checkpoint info here
      // Requesting sms-code or click "It was me" button
      await ig.challenge.auto(true);
      console.log(ig.state.checkpoint); // Challenge info here
      const { code } = await inquirer.prompt([
        {
          type: "input",
          name: "code",
          message: "Enter code",
        },
      ]);
      const passRequest = await ig.challenge.sendSecurityCode(code);
      console.log(passRequest);
    })
    .catch((e) => console.log("Could not resolve checkpoint:", e, e.stack));
}

login();
