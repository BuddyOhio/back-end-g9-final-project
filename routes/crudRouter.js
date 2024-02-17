import express from "express";
import databaseClient from "../services/database.mjs";
import { ObjectId } from "mongodb";
import { addHours, format } from "date-fns";
import { checkMissingField } from "../utils/requestUtils.js";

const router = express.Router();

// CHECK DATA INPUT
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

// get act -------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    // Check access token
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get userId from Token
    const userId = req.data_token.userId;

    // Find data by userId
    const allActivity = await databaseClient
      .db()
      .collection("users_activities")
      .find({ userId: new ObjectId(userId) }, { projection: { userId: 0 } })
      .toArray();

    // Check data
    if (!allActivity) {
      // มันขึ้น 200 ที่ browser และรับ Array เปล่า ********************
      res.status(400).send("No activity in database");
      return;
    }

    // Format date before response to Client
    const sendAllActivities = allActivity.map((activity) => {
      const { _id, activityDate, ...rest } = activity;

      // console.log("activityDate => ", activity.activityDate);

      let currDate = activityDate;
      if (process.env.NODE_ENV === "production") {
        currDate = addHours(activityDate, 7);
      }
      // console.log("currDate => ", currDate);
      // console.log("currDate format => ", format(currDate, "iii MMM dd yyyy"));
      // console.log("currDate format => ", format(currDate, "HH:mm"));
      // object date to string date
      return {
        ...rest,
        activityDateStr: format(currDate, "iii MMM dd yyyy"),
        activityTimeStr: format(currDate, "HH:mm"),
        activityId: _id,
        activityDate,
      };
    });

    // console.log("sendAllActivities from get = > ", sendAllActivities);

    // Response
    res.status(200).json(sendAllActivities);
  } catch (error) {
    // HTTP response status code: (500 Internal Server Error) server error response code indicates that the server encountered an unexpected condition that prevented it from fulfilling the request.
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

// create act -------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    // Check token access
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }
    // Get userId from Token
    const userId = req.data_token.userId;
    // Get input data from Client
    const body = req.body;

    // Check missingField from client request
    const [isBodyChecked, missingFields] = checkMissingField(
      ADD_ACTIVITY_KEY,
      body
    );
    if (!isBodyChecked) {
      res.send(`Missing Fields: ${"".concat(missingFields)}`);
      return;
    }

    // Validate each filed
    // HTTP response status code: (400 Bad Request) the server cannot or will not process the request due to something that is perceived to be a client error
    if (body.activityName.length > 20) {
      res
        .status(400)
        .send("Name of activity should be less than 15 characters long.");
      return;
    }
    if (body.activityDesc.length > 115) {
      res
        .status(400)
        .send(
          "Description of activity should be less than 15 characters long."
        );
      return;
    }
    if (body.activityTypeOther.length > 15) {
      res
        .status(400)
        .send("Type of activity should be less than 10 characters long.");
      return;
    }

    // Format Date type string to type date
    let actDate = new Date(body.activityDate);
    if (process.env.NODE_ENV === "production") {
      actDate = addHours(actDate, 7);
    }
    let actTime = new Date(body.activityTime);
    if (process.env.NODE_ENV === "production") {
      actTime = addHours(actTime, 7);
    }
    const hour = actTime.getHours();
    const min = actTime.getMinutes();

    actDate.setHours(hour);
    actDate.setMinutes(min);

    let currDate = new Date();
    if (process.env.NODE_ENV === "production") {
      currDate = addHours(currDate, 7);
    }

    // console.log("activityName from post => ", body.activityName);
    // console.log("activityDate body from post => ", body.activityDate);
    // console.log("activityTime body from post => ", body.activityTime);
    // console.log("actDate from post => ", actDate);
    // console.log("currDate from post => ", currDate);

    const status = actDate > currDate ? "up comming" : "completed";
    // console.log("status => ", status);

    // เอา activityTime ออก
    const { activityTime, ...rest } = body;

    let actDateDB = actDate;
    if (process.env.NODE_ENV === "production") {
      actDateDB = addHours(actDateDB, -7);
    }

    const addUserId = {
      ...rest,
      activityDate: actDateDB,
      userId: new ObjectId(userId),
      activityStatus: status,
    };

    await databaseClient
      .db()
      .collection("users_activities")
      .insertOne(addUserId);
    res.status(200).send("Add activity seccess");
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

// update act -------------------------------------------------------
router.put("/", async (req, res) => {
  try {
    // Check token access
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }
    // Get input data from Client
    const body = req.body;

    // Check missingField from client request
    const [isBodyChecked, missingFields] = checkMissingField(
      EDIT_ACTIVITY_KEY,
      body
    );

    if (!isBodyChecked) {
      res.send(`Missing Fields: ${"".concat(missingFields)}`);
      return;
    }

    // Validate each filed
    if (body.activityName.length > 20) {
      res
        .status(400)
        .send("Name of activity should be less than 20 characters long.");
      return;
    }
    if (body.activityDesc.length > 115) {
      res
        .status(400)
        .send(
          "Description of activity should be less than 115 characters long."
        );
      return;
    }
    if (body.activityTypeOther.length > 15) {
      res
        .status(400)
        .send("Type of activity should be less than 15 characters long.");
      return;
    }

    // Format Date type string to type date
    let actDate = new Date(body.activityDate);
    if (process.env.NODE_ENV === "production") {
      actDate = addHours(actDate, 7);
    }
    let actTime = new Date(body.activityTime);
    if (process.env.NODE_ENV === "production") {
      actTime = addHours(actTime, 7);
    }
    const hour = actTime.getHours();
    const min = actTime.getMinutes();

    actDate.setHours(hour);
    actDate.setMinutes(min);

    // แยก activityTime, activityID ออกจาก object
    const { activityID, activityTime, ...rest } = body;

    let currDate = new Date();
    if (process.env.NODE_ENV === "production") {
      currDate = addHours(currDate, 7);
    }

    // console.log("activityName from put => ", body.activityName);
    // console.log("activityDate body from put => ", body.activityDate);
    // console.log("activityTime body from put => ", body.activityTime);
    // console.log("actDate from put => ", actDate);
    // console.log("currDate from put => ", currDate);

    const status = actDate > currDate ? "up comming" : "completed";

    let actDateDB = actDate;
    if (process.env.NODE_ENV === "production") {
      actDateDB = addHours(actDateDB, -7);
    }

    const activityUpdate = {
      ...rest,
      activityDate: actDateDB,
      activityStatus: status,
    };

    // Database
    await databaseClient
      .db()
      .collection("users_activities")
      .updateOne({ _id: new ObjectId(activityID) }, { $set: activityUpdate });

    // Response
    res.status(200).send("Update activity seccess");
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

// update status -------------------------------------------------------
router.patch("/:actId", async (req, res) => {
  try {
    // Check token access
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get activity ID from Client
    const activityId = req.params.actId;
    // console.log("activityId => ", activityId);

    // Database
    await databaseClient
      .db()
      .collection("users_activities")
      .updateOne(
        { _id: new ObjectId(activityId) },
        { $set: { activityStatus: "completed" } }
      );

    // Response
    res.status(200).send("Update activity status seccess");
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

// delete act -------------------------------------------------------
router.delete("/:actId", async (req, res) => {
  try {
    // Check token access
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get activity ID from Client
    const activityId = req.params.actId;
    // console.log("activityId => ", activityId);

    // Database
    await databaseClient
      .db()
      .collection("users_activities")
      .deleteOne({ _id: new ObjectId(activityId) });

    // Response
    res.status(200).send("Delete activity seccess");
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

export default router;
