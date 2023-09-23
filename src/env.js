let NODE_ENV = "development";

//Default Process
if (process?.env?.NODE_ENV) {
  if (process.env.NODE_ENV.toLowerCase() === "production") {
    NODE_ENV = "production";
  }
} else if (
  process?.env?.DEBUG_MODE &&
  process.env.DEBUG_MODE.toLowerCase() === "false"
) {
  NODE_ENV = "production";
} else if (
  process?.env?.ENVIROMENT &&
  process.env.ENVIROMENT.toLowerCase() === "production"
) {
  NODE_ENV = "production";
}
//ENVIRONMENT
const $ENV = NODE_ENV;

/**
 * Check whether env is equal to our desired or not
 * @param {String} $type
 * @returns {Boolean}
 */
function isENV($type) {
  return $type.toLowerCase() === $ENV;
}

/**
 * Return env value
 * @param {String} key
 * @param {*} default_value
 * @returns {String}
 */
function getENV(key, default_value = undefined) {
  if (
    (!process.env.hasOwnProperty(key) || !process.env[key]) &&
    default_value === undefined
  ) {
    throw new Error(`Environment variable ${key} not found`);
  }
  return process.env[key] || default_value;
}

/**
 * Check wheter the env key is equal to desired value
 * @param {String} key
 * @param {String} value
 * @returns
 */
function checkENV(key, value) {
  try {
    const c = getENV(key);
    return c && c.toLowerCase() === value.toLowerCase();
  } catch (e) {
    throw e;
  }
}

/**
 * Return env value in array mode
 * @param {string} key
 * @returns {object}
 */
function getArrayENV(key) {
  if (!process.env.hasOwnProperty(key) || !process.env[key]) {
    throw new Error(`Environment variable ${key} not found`);
  }
  return process.env[key].split(",").map((value) => value.trim()) || [];
}

/**
 * Check that is the app running on cloud or not
 * @returns {boolean}
 */
function isOffline() {
  //Serverless-offline plugin
  if (process?.env?.IS_OFFLINE) {
    return true;
  }
  if (
    !process?.env?.VERCEL &&
    !process?.env?.LAMBDA_TASK_ROOT &&
    !process?.env?.__OW_API_HOST
  ) {
    return true;
  }
  return false;
}

module.exports={
  isENV,
  getENV,
  checkENV,
  getArrayENV,
  isOffline,
  $ENV //Current env
}