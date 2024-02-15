import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import databaseClient from "./services/database.mjs";
import chart from "./routes/chart.js";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;

// setting initial configuration for upload file, web server (express), and cors
dotenv.config();
const webServer = express();
webServer.use(cors());
webServer.use(express.urlencoded({ extended: false }));
webServer.use(express.json());

webServer.use(chart);

// server router
webServer.get("/", (req, res) => {
  res.status(200).send("Hello World From G9-Final-Project");
});

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
