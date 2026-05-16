import './src/sentry.js'; // Initialize Sentry early
import { getPopular, getRecap, getExchanges } from './src/api.js';
import { schedulePost } from './src/dynamodb.js';
import moment from 'moment-timezone';
import { getENV } from './src/env.js';
import { captureError, logLambdaBootstrap } from './src/sentry.js';
import { isDataValid } from './src/util.js';

const SCHEDULE_TIMEZONE = getENV("SCHEDULE_TIMEZONE","Asia/Tehran");

async function scheduleDailyRecap() {
  const data = await getPopular();
  if (!isDataValid(data, 'Daily Recap (Telegram)')) {
    console.log('❌ Skipping daily recap scheduling for Telegram - invalid or stale data');
    return;
  }
  const scheduleTime = getNextScheduleTime(9);
  await schedulePost('telegram', 'dailyrecap', data, scheduleTime.unix());
  console.log(`Daily coin recap scheduled for tomorrow on Telegram at ${scheduleTime.format()}`);
}

async function scheduleDailyPopular() {
  const data = await getPopular();
  if (!isDataValid(data, 'Daily Popular (Twitter)')) {
    console.log('❌ Skipping daily popular scheduling for Twitter - invalid or stale data');
    return;
  }
  const scheduleTime = getNextScheduleTime(9);
  await schedulePost('twitter', 'trends', data, scheduleTime.unix());
  await schedulePost('twitter', 'vol', data, scheduleTime.add(1, 'hour').unix());
  console.log(`Daily popular coins scheduled for tomorrow on Twitter at ${scheduleTime.format()}`);
}

async function scheduleWeeklyRecap() {
  let data = await getRecap("coin", "weekly");
  let source = "recap/coin/weekly";

  if (!isDataValid(data, 'Weekly Recap (Instagram)')) {
    console.log('⚠️ Weekly recap API empty — falling back to popular coins (24h)');
    data = await getPopular();
    source = "popular (fallback)";
    if (!isDataValid(data, 'Weekly Recap fallback (Popular)')) {
      console.log('❌ Skipping weekly recap scheduling for Instagram - no valid data');
      return;
    }
  }

  const scheduleTime = getNextScheduleTime(9);
  await schedulePost('instagram', 'weekly-coin', data, scheduleTime.unix());
  console.log(
    `Weekly coin recap scheduled for tomorrow on Instagram at ${scheduleTime.format()} (source: ${source}, ${data.length} items)`
  );
}

async function scheduleMonthlyRecap() {
  let data = await getRecap("exchange", "monthly");
  let source = "recap/exchange/monthly";

  if (!isDataValid(data, 'Monthly Exchange Recap (Instagram)')) {
    console.log('⚠️ Monthly exchange recap API empty — falling back to exchanges (24h)');
    data = await getExchanges();
    source = "exchanges (fallback)";
    if (!isDataValid(data, 'Monthly Exchange Recap fallback (Exchanges)')) {
      console.log('❌ Skipping monthly recap scheduling for Instagram - no valid data');
      return;
    }
  }

  const scheduleTime = getNextScheduleTime(9);
  await schedulePost('instagram', 'monthly-exchange', data, scheduleTime.unix());
  console.log(
    `Monthly exchange recap scheduled for tomorrow on Instagram at ${scheduleTime.format()} (source: ${source}, ${data.length} items)`
  );
}

function getNextScheduleTime(hour) {
  return moment()
    .add(1, 'day')
    .set({ hour, minute: 0, second: 0, millisecond: 0 })
    .tz(SCHEDULE_TIMEZONE, true);
}

function isTodayLastDayOfMonth(timezone) {
  const today = moment().tz(timezone);
  const tomorrow = today.clone().add(1, 'day');
  return today.month() !== tomorrow.month();
}

export const midnight = async (event) => {
  logLambdaBootstrap();
  try {
    await scheduleDailyRecap();
    await scheduleDailyPopular();
    if (moment().tz(SCHEDULE_TIMEZONE).day() === 5) {
      await scheduleWeeklyRecap();
    }
    if (isTodayLastDayOfMonth(SCHEDULE_TIMEZONE)) {
      await scheduleMonthlyRecap();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data fetched and posts scheduled successfully' }),
    };
  } catch (error) {
    captureError(error, {
      tags: {
        worker: 'scheduler',
        function: 'midnight'
      },
      extra: {
        event: event
      }
    });
    throw error;
  }
};
