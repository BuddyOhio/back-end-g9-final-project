import express from "express";
import { ObjectId } from "mongodb";
import databaseClient from "../services/database.mjs";
import { addHours, format } from "date-fns";
import {
  getMonday,
  addDays,
  addMinutes,
  getDayName,
  getWeekDays,
} from "../utils/date-utils.js";

const router = express.Router();
const locale = "en-us";

router.get("/get-dashboard-activities", async (req, res) => {
  // Check access token
  if (!req.data_token) {
    res.status(401).send("You're not login");
  }

  // Get userId from Token
  const userId = req.data_token.userId;

  // Get data from database
  var allActivities = await databaseClient
    .db()
    .collection("users_activities")
    .find(
      {
        userId: new ObjectId(userId),
        activityStatus: "completed",
      },
      { projection: { userId: 0 } }
    )
    .toArray();

  // Add dayOfWeek to all the activities in the array
  allActivities = allActivities.map((activity) => {
    return {
      ...activity,
      dayOfWeek: getDayName(activity.activityDate, locale),
    };
  });

  if (!allActivities) {
    // มันขึ้น 200 ที่ browser และรับ Array เปล่า
    res.status(400).send("No data");
    return;
  }

  // Daily activities donut chart
  const currentDate = new Date();
  const currentDateStart = new Date(currentDate.setHours(0, 0, 0, 0));
  const currentDateEnd = new Date(currentDate.setHours(23, 59, 59, 999));

  const dailyActivities = filterActivitiesByDateRange(
    allActivities,
    currentDateStart,
    currentDateEnd
  );

  // Weekly activities donut chart and columns chart
  var monday = new Date(getMonday(currentDate).setHours(0, 0, 0, 0)); // First day is the day of the month - the day of the week
  var sunday = new Date(addDays(monday, 6).setHours(23, 59, 59, 999));

  const weeklyActivities = filterActivitiesByDateRange(
    allActivities,
    monday,
    sunday
  );

  const response = {
    donutDailyActivities: formatActivitiesForDonutChart(dailyActivities),
    donutWeeklyActivities: formatActivitiesForDonutChart(weeklyActivities),
    donutAllActivities: formatActivitiesForDonutChart(allActivities),
    columnsWeeklyActivities: formatActivitiesForColumnsChart(weeklyActivities),
  };

  res.status(200).json(response);
});

function formatActivitiesForDonutChart(activities) {
  return (
    activities &&
    Object.values(
      /*
    SELECT
      ActivityType as type,
      COUNT(*) as count,
      SUM(activityDuration) as time
    FROM users_activities
    GROUP BY 
      ActivityType
*/

      activities.reduce((result, { activityType, activityDuration }) => {
        // Create new group
        if (!result[activityType])
          result[activityType] = {
            type: activityType,
            count: 0,
            time: 0,
          };

        result[activityType].time += parseInt(activityDuration);
        result[activityType].count++;

        return result;
      }, {})
    )
  );
}

function formatActivitiesForColumnsChart(activities) {
  return (
    activities &&
    Object.values(
      activities.reduce(
        (result, { activityType, activityDuration, dayOfWeek }) => {
          // Create new group
          if (!result.length)
            result = getWeekDays(locale).map((day) => {
              return {
                dayOfWeek: day,
                activities: [],
              };
            });

          const dayIndex = result.findIndex(
            (day) => day.dayOfWeek == dayOfWeek
          );

          if (
            !result[dayIndex].activities.find(
              (activity) => activity.type == activityType
            )
          )
            result[dayIndex].activities.push({
              type: activityType,
              count: 0,
              time: 0,
            });

          const activityIndex = result[dayIndex].activities.findIndex(
            (activity) => activity.type == activityType
          );

          result[dayIndex].activities[activityIndex].time +=
            parseInt(activityDuration);
          result[dayIndex].activities[activityIndex].count++;

          return result;
        },
        {}
      )
    )
  );
}

function filterActivitiesByDateRange(activities, dateStart, dateEnd) {
  return activities.filter((activity) => {
    const activityEndDate = addMinutes(
      activity.activityDate,
      activity.activityDuration
    );

    // fix timezone on production because timezone information is missing when saving to database
    let utcDateStart = dateStart;
    let utcDateEnd = dateEnd;
    if (process.env.NODE_ENV === "production") {
      utcDateStart = new Date(addHours(utcDateStart, -7));
      utcDateEnd = new Date(addHours(utcDateEnd, -7));
    }

    return utcDateStart <= activityEndDate && activityEndDate <= utcDateEnd;
  });
}

export default router;
