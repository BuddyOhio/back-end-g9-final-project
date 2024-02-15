import express from "express";
import databaseClient from "../services/database.mjs";
import { ObjectId } from "mongodb";
import { startOfWeek } from "date-fns";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Check access token
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get userId from Token
    const userId = req.data_token.userId;

    const currentDate = new Date();
    // 0 for Sunday, 1 for Monday
    const options = { weekStartsOn: 1 };
    const firstDateOfWeek = startOfWeek(currentDate, options);

    console.log("firstDateOfWeek => ", new Date(firstDateOfWeek));
    // firstDateOfWeek =>  2024-02-11T17:00:00.000Z

    const result = await databaseClient
      .db()
      .collection("users_activities")
      .find(
        {
          userId: new ObjectId(userId),
          activityStatus: "completed",
          activityDate: { $gte: firstDateOfWeek },
        },
        {
          projection: {
            _id: 0,
            userId: 0,
            activityName: 0,
            activityDesc: 0,
            activityType: 0,
            activityTypeOther: 0,
            activityStatus: 0,
          },
        }
      )
      .toArray();

    console.log("result => ", result);
    // result =>  [
    //   { activityDate: 2024-02-13T20:00:00.000Z, activityDuration: 15 },
    //   { activityDate: 2024-02-11T17:00:00.000Z, activityDuration: 40 },
    //   { activityDate: 2024-02-12T20:40:00.000Z, activityDuration: 40 },
    //   { activityDate: 2024-02-14T10:00:00.000Z, activityDuration: 15 }
    // ]

    const dateStr = result.map((item) => {
      return {
        activityDate: item.activityDate.toLocaleString(),
        activityDuration: item.activityDuration,
      };
    });

    console.log("dateStr => ", dateStr);
    // dateStr =>  [
    //   { activityDate: '2/14/2024, 3:00:00 AM', activityDuration: 15 },
    //   { activityDate: '2/12/2024, 12:00:00 AM', activityDuration: 40 },
    //   { activityDate: '2/13/2024, 3:40:00 AM', activityDuration: 40 },
    //   { activityDate: '2/14/2024, 5:00:00 PM', activityDuration: 15 }
    // ]

    const sumByDate = dateStr.reduce((acc, entry) => {
      //  const date = entry.activityDate.toISOString().split("T")[0];
      const date = entry.activityDate.split(",")[0];
      acc[date] = (acc[date] || 0) + entry.activityDuration;
      return acc;
    }, {});

    // sumByDate => { '2024-02-12': 30, '2024-02-14': 35 }
    console.log("sumByDate => ", sumByDate);

    let rank = 0;

    for (const date in sumByDate) {
      if (sumByDate[date] >= 30) {
        rank++;
      }
    }

    console.log("rank => ", rank);

    // Response
    // res.status(200).json(sendEmotionRank);
    res.status(200).json({ emotionRank: rank });
  } catch (error) {
    console.log("error => ", error);
    return res.status(500).json(error.message || "Internal Server Error");
  }
});

export default router;