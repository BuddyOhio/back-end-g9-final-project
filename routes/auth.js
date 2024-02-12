import databaseClient from "../services/database.mjs";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose, { Schema, Types } from "mongoose";
import dayjs from "dayjs";

const webServer = express.Router();
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

const User = mongoose.model("User", userSchema);
// ตรวจสอบว่า email มีรูปแบบที่ถูกต้องหรือไม่
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailRegex.test(email);
};

// server router

webServer.get("/", (req, res) => {
  res.send("Hello World From G9-Final-Project");
});

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

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send({ error: { message: "already exist" } });
  }

  // hashing password
  const saltRounds = 12;
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
  console.log(user);
  if (!user) {
    return res
      .status(400)
      .send({ error: { message: "Invalid email or password" } });
  }
  // validation password
  const validPassword = await bcrypt.compare(inputPassword, user.password);
  if (!validPassword) {
    return res
      .status(400)
      .send({ error: { message: "Invalid email or password" } });
  }
  const { _id, email, password, ...other } = user;
  const token = createJwt(_id);
  const sendData = { _id, ...other };
  return res
    .cookie("access_token", token, {
      httpOnly: true,
      expires: dayjs().add(1, "days").toDate(),
    })
    .status(200)
    .json(sendData);
});

const createJwt = (id) => {
  const jwtSecretKey = process.env.JWT_SECRET_KEY;
  const token = jwt.sign({ id }, jwtSecretKey, { expiresIn: "1d" });
  return token;
};

// webServer.get("/me", async (req, res) => {
//   const user = await databaseClient
//     .db()
//     .collection("users_profile")
//     .findOne({ _id: new Types.ObjectId(req.userId) });
//   // const { email, password, ...other } = user;
//   return res.status(200).json(other);
// });

webServer.get("/logout", (req, res) => {
  return res
    .clearCookie("access_token")
    .status(200)
    .json({ messgae: "Successfully logged out" });
});

export default webServer;
