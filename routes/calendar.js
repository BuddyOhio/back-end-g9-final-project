import express from "express";
import databaseClient from "../services/database.mjs";
// import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/date/:date", async (req, res) => {
  try {
    // Check token access
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get dateByUser from Client
    const dateByUser = req.params.date;
    const dateInput = new Date(dateByUser);
    console.log("dateInput => ", dateInput);
    console.log("dateInput type => ", typeof dateInput);

    // Database
    const data = await databaseClient
      .db()
      .collection("users_activities")
      .find(
        {
          activityDate: {
            $gte: dateInput,
            $lt: new Date(dateInput.getTime() + 24 * 60 * 60 * 1000),
            // Adding 24 hours to include the whole day
          },
        },
        {
          projection: {
            _id: 0,
          },
        }
      )
      .toArray();

    // Response
    res.status(200).json(data);
  } catch (error) {
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

export default router;
