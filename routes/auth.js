import databaseClient from "../services/database.mjs";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Schema, Types } from "mongoose";
import dayjs from "dayjs";
import { authorization } from "../services/middlewares.mjs";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";

const webServer = express.Router();

const saltRounds = 12;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.log("Nodemailer is not ready", error);
  } else {
    console.log("Nodemailer is ready to send emails");
  }
});

// สร้าง database schema
const userSchema = new Schema(
  {
    fullName: String,
    email: String,
    password: String,
    dob: String,
    gender: String,
    weight: Number,
    height: Number,
  },
  { timestamps: true }
);

// const User = mongoose.model("User", userSchema);

// ตรวจสอบว่า email มีรูปแบบที่ถูกต้องหรือไม่
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailRegex.test(email);
};

// server router
webServer.get("/users", async (req, res) => {
  const users = await databaseClient
    .db()
    .collection("users_profile")
    .find({})
    .toArray();
  res.json(users);
});

webServer.post("/register", async (req, res) => {
  const { fullName, email, password, dob, gender, weight, height } = req.body;
  // validation
  if (!fullName || !email || !password) {
    return res.status(400).send({ error: "insufficient input" });
  }

  if (fullName.trim() === "") {
    return res.status(400).send({ error: { message: "empty name" } });
  }
  if (!isValidEmail(email)) {
    return res.status(400).send({ error: { message: "invalid email" } });
  }
  if (password.length < 6) {
    return res.status(400).send({ error: { message: "password too short" } });
  }
  if (!dob) {
    return res.status(400).send({ error: { message: "select your gender" } });
  }
  if (!gender) {
    return res.status(400).send({ error: { message: "select your gender" } });
  }
  if (!weight) {
    return res.status(400).send({ error: { message: "entry your weight" } });
  }
  if (!height) {
    return res.status(400).send({ error: { message: "entry your height" } });
  }

  const existingUser = await databaseClient
    .db()
    .collection("users_profile")
    .findOne({ email });

  if (existingUser) {
    return res.status(400).send({ error: { message: "already exist" } });
  }

  // hashing password
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // สร้าง instance จาก model
  const newUser = {
    fullName,
    email,
    password: hashedPassword,
    dob,
    gender,
    weight: parseInt(weight),
    height: parseInt(height),
    petName: "whisky",
  };

  // save ลง database (return เป็น Promise)
  await databaseClient.db().collection("users_profile").insertOne(newUser);
  res.status(200).send("Create new user success.");
});

webServer.post("/login", async (req, res) => {
  //  retrive email , password
  const { email: inputEmail, password: inputPassword } = req.body;
  if (!isValidEmail(inputEmail)) {
    return res.status(400).send({ error: { message: "invalid email" } });
  }
  if (inputPassword.length < 6) {
    return res.status(400).send({ error: { message: "password too short" } });
  }

  //  validation email
  const user = await databaseClient
    .db()
    .collection("users_profile")
    .findOne({ email: inputEmail });

  // console.log(user);
  if (!user) {
    return res
      .status(400)
      .send({ error: { message: "Invalid email or password" } });
  }

  // validation password
  const validPassword = await bcrypt.compareSync(inputPassword, user.password);

  if (!validPassword) {
    return res
      .status(400)
      .send({ error: { message: "Invalid email or password" } });
  }

  const { _id, email, password, ...other } = user;
  const token = createJwt(_id, email);
  const sendData = { _id, ...other };

  return res
    .cookie("access_token", token, {
      httpOnly: process.env.NODE_ENV === "production" ? true : false,
      expires: dayjs().add(1, "days").toDate(),
      sameSite: "none",
      secure: true,
    })
    .status(200)
    .json(sendData);
});

const createJwt = (id, email) => {
  const jwtSecretKey = process.env.JWT_SECRET_KEY;
  const token = jwt.sign({ id, email }, jwtSecretKey, { expiresIn: "1d" });
  return token;
};

webServer.get("/me", authorization, async (req, res) => {
  if (!req.data_token) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const user = await databaseClient
    .db()
    .collection("users_profile")
    .findOne({ _id: new Types.ObjectId(req.data_token.userId) });
  const { email, password, ...other } = user;

  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }
  return res.status(200).json(other);
});

webServer.get("/logout", (req, res) => {
  return res
    .clearCookie("access_token", { sameSite: "none", secure: true })
    .status(200)
    .json({ messgae: "Successfully logged out" });
});

webServer.post("/forget-password/email", async (req, res) => {
  try {
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({ error: { message: "email not provided" } });
    }
    if (!isValidEmail(email)) {
      return res.status(400).send({ error: { message: "invalid email" } });
    }

    const user = await databaseClient
      .db()
      .collection("users_profile")
      .findOne({ email });

    if (!user) {
      console.log(`Reset password request from unknown email ${email}`);
      return res.json({ message: "reset password request accepted" });
    }

    const resetKey = uuidv4();

    await databaseClient
      .db()
      .collection("users_profile")
      .updateOne(
        { _id: new ObjectId(user._id) },
        { $set: { resetPasswordKey: resetKey } }
      );

    const mailOptions = {
      from: process.env.SMTP_SENDER,
      to: email,
      subject: "[Siberian Whiskey] Reset your password",
      html: `
    <h1>Reset your password</h1>
    <p>Please follow this link to <a href="https://doggo-project.vercel.app/change-password-account?key=${resetKey}">reset your password</a></p>
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email has been sent!");
    return res.json({ message: "reset password request accepted" });
  } catch (e) {
    console.log("Failed to send email with error:", e);
    return res.status(500).json({ error: { message: "failed to send email" } });
  }
});

webServer.get("/forget-password/validate", async (req, res) => {
  try {
    const resetPasswordKey = req.query.key;
    if (!resetPasswordKey) {
      return res.status(400).json({ error: { message: "key is missing" } });
    }

    const user = await databaseClient
      .db()
      .collection("users_profile")
      .findOne({ resetPasswordKey });

    if (!user) {
      return res.status(404).json({
        error: {
          message: "no one is associated with this reset password key",
        },
      });
    }

    return res.status(200).json({ message: "key is validated" });
  } catch (e) {
    console.log("Reset password key validation failed with error", e);
    return res
      .status(500)
      .json({ error: { message: "failed to validate reset password key" } });
  }
});

webServer.post("/forget-password/reset", async (req, res) => {
  try {
    const newPassword = req.body.newPassword;
    const confirmPassword = req.body.confirmPassword;
    const resetPasswordKey = req.body.resetPasswordKey;

    if (!resetPasswordKey) {
      return res.status(400).json({ error: { message: "key is missing" } });
    }
    if (newPassword === "") {
      return res
        .status(400)
        .json({ error: { message: "please provide password" } });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: { message: "password mismatch" } });
    }

    const user = await databaseClient
      .db()
      .collection("users_profile")
      .findOne({ resetPasswordKey });

    if (!user) {
      return res.status(404).json({
        error: {
          message: "no one is associated with this reset password key",
        },
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await databaseClient
      .db()
      .collection("users_profile")
      .updateOne(
        { _id: new ObjectId(user._id) },
        { $set: { password: hashedPassword }, $unset: { resetPasswordKey: "" } }
      );

    return res
      .status(200)
      .json({ message: "password has been successfully reset" });
  } catch (e) {
    console.log("Reset password failed with error", e);
    return res
      .status(500)
      .json({ error: { message: "failed to reset password" } });
  }
});

export default webServer;
