import express from "express";
import { ObjectId } from "mongodb";
import databaseClient from "../services/database.mjs";
import { format } from "date-fns";

const router = express.Router();

// GET user data
router.get("/edit-profile", async (req, res) => {
  const user = await databaseClient
    .db()
    .collection("users_profile")
    .findOne(
      { _id: new ObjectId("65b227e6d9ce065855e80f6b") },
      { projection: { _id: 0, password: 0 } }
    );

  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  const sendUser = (user) => {
    const { dob, ...data } = user;
    return { ...data, dob: format(new Date(dob), "iii MMM dd yyyy") };
  };

  res.status(200).json(sendUser(user));
});

// UPDATE user data
router.put("/edit-profile", async (req, res) => {
  const { fullName, dob, gender, weight, height } = req.body;

  try {
    const result = await databaseClient
      .db()
      .collection("users_profile")
      .updateOne(
        { _id: new ObjectId("65b227e6d9ce065855e80f6b") }, // Assuming you are updating a specific user's profile
        {
          $set: {
            fullName,
            dob,
            gender,
            weight,
            height,
          },
        }
      );
    // Check if any changes happen
    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Profile updated successfully" });
    } else {
      res.status(404).json({ error: "User not found or profile not updated" });
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
