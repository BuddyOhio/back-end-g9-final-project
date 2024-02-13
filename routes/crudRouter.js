import express from "express";
import databaseClient from "../services/database.mjs";
import { ObjectId } from "mongodb";
import { format } from "date-fns";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { checkMissingField } from "../utils/requestUtils.js";

const router = express.Router();

// CHECK DATA
const ADD_ACTIVITY_KEY = [
  "activityName",
  "activityDesc",
  "activityType",
  "activityTypeOther",
  "activityDate",
  "activityTime",
  "activityDuration",
];
const EDIT_ACTIVITY_KEY = [
  "activityName",
  "activityDesc",
  "activityType",
  "activityTypeOther",
  "activityDate",
  "activityTime",
  "activityDuration",
  "activityID",
];
const DELETE_ACTIVITY_KEY = ["activityDelete"];

// get act -------------------------------------------------------
router.get("/get-act", async (req, res) => {
  // ต้องแกะ cookie หา Token แล้วแกะ Token หา userId
  // const token = req.cookies.abcde;
  // if (!token) return res.status(401).json("Not logged in!");
  // console.log("token => ", token);

  // if (!token) return res.redirect("/login")

  // const jwtSecretKey = process.env.JWT_SECRET_KEY;
  // const decodedToken = jwt.verify(token, jwtSecretKey);

  // console.log("decodedToken => ", decodedToken);

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
    res.status(400).send("No activity in database");
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

// create act -------------------------------------------------------
router.post("/add-act", async (req, res) => {
  const body = req.body;

  // Check checkMissingField from client request
  const [isBodyChecked, missingFields] = checkMissingField(
    ADD_ACTIVITY_KEY,
    body
  );

  if (!isBodyChecked) {
    res.send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }

  // Format Date type string to type date
  const actDate = new Date(body.activityDate);
  const actTime = new Date(body.activityTime);
  const hour = actTime.getHours();
  const min = actTime.getMinutes();

  actDate.setHours(hour);
  actDate.setMinutes(min);

  const activityStatus = [];
  // uncomplete
  // completed

  // เอา activityTime ออก
  const { activityTime, ...rest } = body;

  const addUserId = {
    ...rest,
    activityDate: actDate,
    userId: new ObjectId("65b227e6d9ce065855e80f6b"),
  };

  await databaseClient.db().collection("users_activities").insertOne(addUserId);
  res.status(200).send("Add activity seccess");
});

// update act -------------------------------------------------------
router.put("/update-act", async (req, res) => {
  const body = req.body;

  // Check checkMissingField from client request
  const [isBodyChecked, missingFields] = checkMissingField(
    EDIT_ACTIVITY_KEY,
    body
  );

  if (!isBodyChecked) {
    res.send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }

  // Format Date string to date
  const actDate = new Date(body.activityDate);
  const actTime = new Date(body.activityTime);
  const hour = actTime.getHours();
  const min = actTime.getMinutes();

  actDate.setHours(hour);
  actDate.setMinutes(min);
  const { activityID, activityTime, ...rest } = body;

  // const addUserId = {
  //   ...rest,
  //   activityDate: actDate,
  //   userId: new ObjectId("65b227e6d9ce065855e80f6b"),
  // };

  const addFotmatDate = {
    ...rest,
    activityDate: actDate,
  };

  // console.log(addFotmatDate);
  await databaseClient
    .db()
    .collection("users_activities")
    .updateOne({ _id: new ObjectId(activityID) }, { $set: addFotmatDate });
  res.status(200).send("Update activity seccess");
});

// update status -------------------------------------------------------
router.patch("/update-act-status", async (req, res) => {});

// delete act -------------------------------------------------------
router.delete("/delete-act", async (req, res) => {
  const { activityDelete } = req.body;

  // Check checkMissingField from client request
  const [isBodyChecked, missingFields] = checkMissingField(
    DELETE_ACTIVITY_KEY,
    {activityDelete}
  );

  if (!isBodyChecked) {
    res.send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }

  await databaseClient
    .db()
    .collection("users_activities")
    .deleteOne({ _id: new ObjectId(activityDelete) });

  res.status(200).send("Delete activity seccess");
});

export default router;
