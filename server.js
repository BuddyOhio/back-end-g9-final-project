import express from "express";
import dotenv from "dotenv";
import databaseClient from "./services/database.mjs";
import cors from "cors";
import cookieParser from "cookie-parser";

import auth from "./routes/auth.js";
import crudRouter from "./routes/crudRouter.js";
import editProfile from "./routes/editProfile.js";
import jwt from "jsonwebtoken";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;

// setting initial configuration for upload file, web server (express), and cors
dotenv.config();

// middle ware
const webServer = express();

webServer.use(express.json());
webServer.use(express.urlencoded({ extended: true }));
webServer.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
webServer.use(cookieParser());

// Middleware for check cookies & token
const authorization = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.sendStatus(401);
  }

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.data_token = { userId: data.id, username: data.email };
    return next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(401);
  }
};

webServer.use(auth);
webServer.use("/api/activity", authorization, crudRouter);
webServer.use(authorization, editProfile);

// initilize web server
const currentServer = webServer.listen(PORT, HOSTNAME, () => {
  console.log(
    `DATABASE IS CONNECTED: NAME => ${databaseClient.db().databaseName}`
  );
  console.log(`SERVER IS ONLINE => http://${HOSTNAME}:${PORT}`);
});

const cleanup = () => {
  currentServer.close(() => {
    console.log(
      `DISCONNECT DATABASE: NAME => ${databaseClient.db().databaseName}`
    );
    try {
      databaseClient.close();
    } catch (error) {
      console.error(error);
    }
  });
};

// cleanup connection such as database
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
