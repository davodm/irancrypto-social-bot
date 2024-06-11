import { getPopular, getRecap } from './src/api.js';
import { schedulePost } from './src/dynamodb.js';
import moment from 'moment-timezone';
import { getENV } from './src/env.js';

const SCHEDULE_TIMEZONE = getENV("SCHEDULE_TIMEZONE","Asia/Tehran");

// Daily coin recap for Telegram -> 9 AM tomorrow
async function scheduleDailyRecap() {
  const data = await getRecap("coin", "daily");
  if (data) {
    const scheduleTime = getNextScheduleTime(9);
    await schedulePost('telegram', 'dailyrecap', data, scheduleTime.unix());
    console.log('Daily coin recap scheduled for tomorrow on Telegram');
  }
}

// Daily Popular coins for twitter -> 9-10 AM tomorrow
async function scheduleDailyPopular() {
  const data = await getPopular();
  if (data) {
    const scheduleTime = getNextScheduleTime(9);
    await schedulePost('twitter', 'trends', data, scheduleTime.unix());
    await schedulePost('twitter', 'vol', data, scheduleTime.add(1, 'hour').unix());
    console.log('Daily popular coins scheduled for tomorrow on Twitter');
  }
}

// Weekly coin recap for Instagram -> 9 AM tomorrow
async function scheduleWeeklyRecap() {
  const data = await getRecap("coin", "weekly");
  if (data) {
    const scheduleTime = getNextScheduleTime(9);
    await schedulePost('instagram', 'weekly-coin', data, scheduleTime.unix());
    console.log('Weekly coin recap scheduled for tomorrow on Instagram');
  }
}

// Monthly exchange recap for Instagram -> 9 AM tomorrow
async function scheduleMonthlyRecap() {
  const data = await getRecap("exchange", "monthly");
  if (data) {
    const scheduleTime = getNextScheduleTime(9);
    await schedulePost('instagram', 'monthly-exchange', data, scheduleTime.unix());
    console.log('Monthly exchange recap scheduled for tomorrow on Instagram');
  }
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
  await scheduleDailyRecap();
  await scheduleDailyPopular();
  // Only Fridays
  if (moment().tz(SCHEDULE_TIMEZONE).day() === 5) {
    await scheduleWeeklyRecap();
  }
  // Only last day of month
  if (isTodayLastDayOfMonth(SCHEDULE_TIMEZONE)) {
    await scheduleMonthlyRecap();
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Data fetched and posts scheduled successfully' }),
  };
};
