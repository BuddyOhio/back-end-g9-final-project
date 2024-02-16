import express from "express";
import { ObjectId } from "mongodb";
import { format } from "date-fns";
import bcrypt from "bcrypt";
import multer from "multer";
import { v4 as uuid } from "uuid";

import databaseClient from "../services/database.mjs";

const router = express.Router();

// Check upload image file type
const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

// fileUpload middle ware
const fileUpload = multer({
  limits: 500000,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/images");
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      cb(null, uuid() + "." + ext);
    },
  }),
  // Filter IMAGE ONLY!
  fileFilter: (req, file, cb) => {
    // Check to find if there any mime type
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("Invalid mime type");
    cb(error, isValid);
  },
});

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
  try {
    // Check access token
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get userId from Token
    const userId = req.data_token.userId;

    // Find user
    const user = await databaseClient
      .db()
      .collection("users_profile")
      .findOne(
        { _id: new ObjectId(userId) },
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
  } catch (error) {
    res.status(500).json({ error: { message: "Internal server error" } });
  }
});

// UPDATE user data
router.put("/edit-profile", fileUpload.single("image"), async (req, res) => {
  try {
    // Check access token
    if (!req.data_token) {
      res.status(401).send("You're not login");
      return; // Exit early
    }

    // Get userId from Token
    const userId = req.data_token.userId;

    const { fullName, dob, gender, weight, height } = req.body;

    // Prepare update fields
    const updateFields = {
      fullName,
      dob,
      gender,
      weight,
      height,
    };

    // Add imageUrl to updateFields if a new image is uploaded
    if (req.file) {
      updateFields.imageUrl = req.file.path;
    }

    const result = await databaseClient
      .db()
      .collection("users_profile")
      .updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: updateFields,
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
  try {
    // Check access token
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get userId from Token
    const userId = req.data_token.userId;

    // Recive input email
    const { email } = req.body;

    // Check if email is valid
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email!" });
    }

    // Check if email been used
    if (await isEmailAlreadyUsed(email)) {
      return res.status(400).json({ error: "Email is already in use!" });
    }

    const result = await databaseClient
      .db()
      .collection("users_profile")
      .updateOne({ _id: new ObjectId(userId) }, { $set: { email: email } });

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
    // Check access token
    if (!req.data_token) {
      res.status(401).send("You're not login");
    }

    // Get userId from Token
    const userId = req.data_token.userId;

    // Recive Passwords
    const { password, confirmPassword } = req.body;

    // Check password
    if (password.length < 6) {
      return res.status(400).send({ error: { message: "Password too short" } });
    }

    // Check is password === confirm password
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
        { _id: new ObjectId(userId) },
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
