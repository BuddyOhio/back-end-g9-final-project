import express from "express";
import dotenv from "dotenv";
import databaseClient from "./services/database.mjs";
import chart from "./routes/chart.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import pet from "./routes/pet.js";
import auth from "./routes/auth.js";
import crudRouter from "./routes/crudRouter.js";
import editProfile from "./routes/editProfile.js";
import calendar from "./routes/calendar.js";
import { authorization } from "./services/middlewares.mjs";
import path from "path";

// const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;

// setting initial configuration for upload file, web server (express), and cors
dotenv.config();

const webServer = express();

// middle ware
webServer.use(express.json());
webServer.use(express.urlencoded({ extended: true }));
webServer.use(
  cors({
    origin: true,
    credentials: true,
  })
);
webServer.use(cookieParser());

webServer.use(
  "/uploads/images",
  express.static(path.join("uploads", "images"))
);

// Router ------------------------------------------------------------
webServer.use(auth);
webServer.use("/api/activity", authorization, crudRouter);
webServer.use(authorization, editProfile);
webServer.use("/api/pet", authorization, pet);
webServer.use("/api/calendar", authorization, calendar);
webServer.use(authorization, chart);

const currentServer = webServer.listen(PORT, () => {
  console.log(
    `DATABASE IS CONNECTED: NAME => ${databaseClient.db().databaseName}`
  );
  // console.log(`SERVER IS ONLINE => http://${HOSTNAME}:${PORT}`);
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
