import express from "express";
import databaseClient from "../services/database.mjs";
import { addHours, format } from "date-fns";
import { ObjectId } from "mongodb";
// import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/date/:date", async (req, res) => {
  try {
    // Check token access
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    const userId = req.data_token.userId;
    // console.log("userId => ", userId);

    // Get dateByUser from Client
    const dateByUser = req.params.date;
    let dateAfter = new Date(dateByUser);
    if (process.env.NODE_ENV === "production") {
      dateAfter = addHours(dateAfter, -7);
    }
    let dateBefore = new Date(dateAfter);
    dateBefore.setDate(dateBefore.getDate() + 1);

    // console.log("dateByUser => ", dateByUser);
    // console.log("dateByUser type => ", typeof dateByUser);
    // console.log("dateAfter => ", dateAfter);
    // console.log("dateAfter type => ", typeof dateAfter);
    // console.log("dateBefore => ", dateBefore);
    // console.log("dateBefore type => ", typeof dateBefore);

    // Database
    const data = await databaseClient
      .db()
      .collection("users_activities")
      .find({
        userId: new ObjectId(userId),
        activityDate: {
          $gte: dateAfter,
          $lt: dateBefore,
        },
      })
      .toArray();

    // Format date before response to Client
    const sendActivities = data.map((activity) => {
      const { _id, userId, activityDate, ...rest } = activity;

      let currDate = activityDate;
      if (process.env.NODE_ENV === "production") {
        currDate = addHours(activityDate, 7);
      }
      // object date to string date
      return {
        ...rest,
        activityDateStr: format(currDate, "iii MMM dd yyyy"),
        activityTimeStr: format(currDate, "HH:mm"),
        activityId: _id,
        activityDate,
      };
    });

    // console.log("sendActivities from calendar => ", sendActivities);

    // Response
    res.status(200).json(sendActivities);
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

export default router;
