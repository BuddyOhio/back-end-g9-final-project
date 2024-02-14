import express from "express";
import { ObjectId } from "mongodb";
import { format } from "date-fns";
import bcrypt from "bcrypt";

import databaseClient from "../services/database.mjs";

const router = express.Router();

// Function: Check if email is valid
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailRegex.test(email);
};

// Function to check if the email is already used by another user
const isEmailAlreadyUsed = async (email) => {
  const existingUser = await databaseClient
    .db()
    .collection("users_profile")
    .findOne({ email });
  return !!existingUser;
};

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

// Change Email
router.patch("/changeemail", async (req, res) => {
  const { email } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email!" });
  }

  try {
    if (await isEmailAlreadyUsed(email)) {
      return res.status(400).json({ error: "Email is already in use!" });
    }

    const result = await databaseClient
      .db()
      .collection("users_profile")
      .updateOne(
        { _id: new ObjectId("65b227e6d9ce065855e80f6b") },
        { $set: { email: email } }
      );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Email updated" });
    } else {
      res.status(404).json({ error: "User not found or email not updated" });
    }
  } catch (error) {
    console.log("Error updating email: ", error);
    res.status(404).json({ error: "Internal server error" });
  }
});

// <--Change Password-->
router.patch("/changepassword", async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    if (password.length < 6) {
      return res.status(400).send({ error: { message: "Password too short" } });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .send({ error: { message: "Password do not match" } });
    }

    // Hashing password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await databaseClient
      .db()
      .collection("users_profile")
      .updateOne(
        { _id: new ObjectId("65b227e6d9ce065855e80f6b") },
        { $set: { password: hashedPassword } }
      );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Password Updated" });
    } else {
      res
        .status(400)
        .send({ error: { message: "User not found or email not updated" } });
    }
  } catch (error) {
    console.log("Error updating password: ", error);
    res.status(500).json;
    ({ error: { message: "Internal server error" } });
  }
});

export default router;
