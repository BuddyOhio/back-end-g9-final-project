import express from "express";
import { ObjectId } from "mongodb";
import databaseClient from "../services/database.mjs";
import { format } from "date-fns";
import { getMonday, addDays, addMinutes } from "../utils/date-utils.js";

const router = express.Router();

router.get("/get-dashboard-activities", async (req, res) => {
  // ต้องแกะ cookie หา Token แล้วแกะ Token หา userId
  const allActivities = await databaseClient
    .db()
    .collection("users_activities")
    .find(
      {
        userId: new ObjectId("65b227e6d9ce065855e80f6b"),
      },
      { projection: { userId: 0 } }
    )
    .toArray();

  if (!allActivities) {
    // มันขึ้น 200 ที่ browser และรับ Array เปล่า
    res.status(400).send("No data");
    return;
  }

  const currentDate = new Date("2024-02-16T18:00:00.000Z");
  const currentDateStart = new Date(currentDate.setHours(0, 0, 0, 0));
  const currentDateEnd = new Date(currentDate.setHours(23, 59, 59, 999));

  const dailyActivities = filterActivitiesByDateRange(
    allActivities,
    currentDateStart,
    currentDateEnd
  );

  var monday = new Date(getMonday(currentDate).setHours(0, 0, 0, 0)); // First day is the day of the month - the day of the week
  var sunday = new Date(addDays(monday, 6).setHours(23, 59, 59, 999));

  const weeklyActivities = filterActivitiesByDateRange(
    allActivities,
    monday,
    sunday
  );

  const response = {
    dailyActivities: formatActivitiesForDashboard(dailyActivities),
    weeklyActivities: formatActivitiesForDashboard(weeklyActivities),
    allActivities: formatActivitiesForDashboard(allActivities),
  };

  res.status(200).json(response);
});

function formatActivitiesForDashboard(activities) {
  return Object.values(
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
  );
}

function filterActivitiesByDateRange(activities, dateStart, dateEnd) {
  activities.filter((activity) => {
    const activityEndDate = addMinutes(
      activity.activityDate,
      activity.activityDuration
    );

    return dateStart <= activityEndDate && activityEndDate <= dateEnd;
  });
}

export default router;
