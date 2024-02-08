import express from "express";
import { ObjectId } from "mongodb";
import databaseClient from "../services/database.mjs";
import { format } from "date-fns";
const router = express.Router();

router.get("/", async (req, res) => {
  res.send("Hello World From /add-activity");
});

router.get("/get-activities", async (req, res) => {
  // ต้องแกะ cookie หา Token แล้วแกะ Token หา userId
  const allActivity = await databaseClient
    .db()
    .collection("users_activities")
    .find(
      { userId: new ObjectId("65b227e6d9ce065855e80f6b") },
      { projection: { userId: 0 } }
    )
    .toArray();

  if (!allActivity) {
    // มันขึ้น 200 ที่ browser และรับ Array เปล่า
    res.status(400).send("No data");
    return;
  }

  const sendAllActivities = allActivity.map((activity) => {
    const { _id, ...rest } = activity;

    return {
      ...rest,
      activityDateStr: format(activity.activityDate, "iii MMM dd yyyy"),
      activityTimeStr: format(activity.activityDate, "HH:mm"),
      activityId: _id,
    };
  });

  res.status(200).json(sendAllActivities);
});

router.post("/add-activity", async (req, res) => {
  const body = req.body;
  const actDate = new Date(body.activityDate);
  const actTime = new Date(body.activityTime);
  const hour = actTime.getHours();
  const min = actTime.getMinutes();

  actDate.setHours(hour);
  actDate.setMinutes(min);
  const { activityTime, ...rest } = body;

  const addUserId = {
    ...rest,
    activityDate: actDate,
    userId: new ObjectId("65b227e6d9ce065855e80f6b"),
  };

  await databaseClient.db().collection("users_activities").insertOne(addUserId);
  res.status(200).send("Add activity seccess");
});

router.post("/delete-activity", async (req, res) => {
  const { activityDelete } = req.body;

  await databaseClient
    .db()
    .collection("users_activities")
    .deleteOne({ _id: new ObjectId(activityDelete) });

  res.status(200).send("Delete activity seccess");
});

export default router;
