import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import passport from "passport";
import connectDB from "./src/config/db.js";
import API from "./src/routes/index.js"
import Models from './src/models/index.js';
import passportConfig from "./src/config/passport.js";
import socketInstance from "./src/socket/socketInstance.js";
import http from "http";

dotenv.config();
  
const app = express();

const server = http.createServer(app);  
const io = socketInstance.init(server);

app.use(morgan("dev"));
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

app.use("/api",API );

const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
