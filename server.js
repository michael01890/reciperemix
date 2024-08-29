import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import cron from "node-cron";
import connectDB from "./mongoDB/connect.js";
import authRoutes from "./routes/auth.js";
import suggesticRoutes from "./routes/suggesticRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import bodyParser from "body-parser";
import userRoutes from "./routes/user.js";
import { sendEmail } from "./controllers/sendEmail.js";
import User from './models/User.js';
import mongoose from 'mongoose';
import messageRoutes from "./routes/messagesRoutes.js";

dotenv.config();
// import { GraphQLClient } from "graphql-request";
// import axios from "axios";


// create express app
const app = express(); 

// Allow requests from specific origins
const allowedOrigins = ['http://localhost:3000']; // Add more origins as needed
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};



/* add middlewares */


app.use(cors(corsOptions));
app.use(express.json());
// app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
app.use(cors());
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

/* add routes */
app.use("/auth", authRoutes);

app.use("/user", userRoutes);


app.use("/posts", postRoutes);

app.use("/message", messageRoutes);



// app.use("/pref", prefRoutes);

// app.use("/set", setRoutes);


/* SUGGESTIC API */
app.use("/api", suggesticRoutes);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// define a callback function with request and response parameters
app.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});



const sendDailyReminders = async () => {
  const UserModule = await import("./models/User.js"); 
  const User = UserModule.default;

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  let currentTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
  currentTime = currentTime.trim(); // Trim any whitespace

  // console.log("currentTime", currentTime);

  const allUsers = await User.find();

  // Print all users and their reminderSetting.everydayAt.bool status
  // console.log(`Total users: ${allUsers.length}`);
  // allUsers.forEach(user => {
  //   console.log(`User Reminder: ${user.reminder}, User email: ${user.email}, reminderSetting.everydayAt.bool: ${user.reminderSetting.everydayAt.bool}, user time: ${user.reminderSetting.everydayAt.time}`);
  // });


  const usersToNotify = await User.find({
    //"email": "Tim.SK.Chou@gmail.com",
    "reminder": true,
    "reminderSetting.everydayAt.bool": true,
    "reminderSetting.everydayAt.time": currentTime
  });

  for (const user of usersToNotify) {
    console.log(`Processing user with email: ${user.email}`);  // <-- This line prints the user.email

    console.log("found");
    try {
      const mockReq = {
        body: {
          userContactEmail: user.email, 
          subject: "Your Daily Reminder!",
          content: "This is the content of the daily reminder."
        }
      };
      const mockRes = {
        status: (statusCode) => ({
          send: (msg) => console.log(`Email status ${statusCode}: ${msg}`),
          json: (data) => console.log(`Email JSON response:`, data)
        })
      };

      //console.log("user contact email", user.email);
      await sendEmail(mockReq, mockRes);
    } catch (error) {
      console.error(`Failed to send email to ${user.reminderSetting.email}:`, error);
    }
  }
};


const startServer = async () => {
  try {
    // connect to MongoDB using .env variable
    connectDB(process.env.MONGO_URL);

    app.listen(8080, () => console.log("Server is running on port http://localhost:8080"));
  } catch (error) {
    console.log(error);
  }
}



cron.schedule("* * * * *", sendDailyReminders);


startServer();
