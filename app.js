import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import connectDB from "./src/config/db.js";
import API from "./src/routes/index.js"
import Models from './src/models/index.js';
import passportConfig from "./src/config/passport.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

app.use(session({
  secret: process.env.COOKIE_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 },
}));

app.use(passport.initialize());
app.use(passport.session());

connectDB();

// passportConfig(passport);

app.use("/api",API );

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
