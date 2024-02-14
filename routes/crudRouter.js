import express from "express";
import databaseClient from "../services/database.mjs";
import { ObjectId } from "mongodb";
import { format } from "date-fns";
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
const EDIT_STATUS_KEY = ["activityIdStatus"];
const DELETE_ACTIVITY_KEY = ["activityIdDelete"];

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
      const { _id, ...rest } = activity;

      return {
        ...rest,
        activityDateStr: format(activity.activityDate, "iii MMM dd yyyy"),
        activityTimeStr: format(activity.activityDate, "HH:mm"),
        activityId: _id,
      };
    });

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
    const actDate = new Date(body.activityDate);
    const actTime = new Date(body.activityTime);
    const hour = actTime.getHours();
    const min = actTime.getMinutes();

    actDate.setHours(hour);
    actDate.setMinutes(min);

    const status = actDate > new Date() ? "up comming" : "completed";
    console.log("status => ", status);

    // เอา activityTime ออก
    const { activityTime, ...rest } = body;

    const addUserId = {
      ...rest,
      activityDate: actDate,
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

    // Format Date type:"string" to type:date
    const actDate = new Date(body.activityDate);
    const actTime = new Date(body.activityTime);
    const hour = actTime.getHours();
    const min = actTime.getMinutes();

    actDate.setHours(hour);
    actDate.setMinutes(min);

    // แยก activityTime, activityID ออกจาก object
    const { activityID, activityTime, ...rest } = body;

    const addFotmatDate = {
      ...rest,
      activityDate: actDate,
    };

    // Database
    await databaseClient
      .db()
      .collection("users_activities")
      .updateOne({ _id: new ObjectId(activityID) }, { $set: addFotmatDate });

    // Response
    res.status(200).send("Update activity seccess");
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

// update status -------------------------------------------------------
router.patch("/", async (req, res) => {
  try {
    // Check token access
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get input data from Client
    const body = req.body;

    // Check missingField from client request
    const [isBodyChecked, missingFields] = checkMissingField(
      EDIT_STATUS_KEY,
      body
    );
    if (!isBodyChecked) {
      res.send(`Missing Fields: ${"".concat(missingFields)}`);
      return;
    }

    // Database
    await databaseClient
      .db()
      .collection("users_activities")
      .updateOne(
        { _id: new ObjectId(body.activityIdStatus) },
        { $set: { activityStatus: "completed" } }
      );

    // Response
    res.status(200).send("Update activity status seccess");
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

// delete act -------------------------------------------------------
router.delete("/", async (req, res) => {
  try {
    // Check token access
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get input data from Client
    const body = req.body;

    // Check MissingField from client request
    const [isBodyChecked, missingFields] = checkMissingField(
      DELETE_ACTIVITY_KEY,
      body
    );
    if (!isBodyChecked) {
      res.send(`Missing Fields: ${"".concat(missingFields)}`);
      return;
    }

    // Database
    await databaseClient
      .db()
      .collection("users_activities")
      .deleteOne({ _id: new ObjectId(body.activityIdDelete) });

    // Response
    res.status(200).send("Delete activity seccess");
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

export default router;
