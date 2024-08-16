import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import poolRouter from "./routes/pool.route";
import swapRouter from "./routes/swap.route";
import transactionRouter from "./routes/transaction.route";
import walletRouter from "./routes/wallet.route";
import runeRouter from "./routes/rune.route";
import { mempoolSocketInit } from "./utils/mempool";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 9000;

app.use(
  cors({
    credentials: true,
    origin: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(async () => {
    console.log("Connected to the database! ❤️");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
    // mempoolSocketInit();
  })
  .catch((err) => {
    console.log("Cannot connect to the database! 😭", err);
    process.exit();
  });

app.get("/", (req: Request, res: Response) => {
  res.send("<h3>Raffle API is up and running.</h3>");
});

app.use("/api/wallet/", walletRouter);
app.use("/api/pool/", poolRouter);
app.use("/api/transaction/", transactionRouter);
app.use("/api/swap/", swapRouter);
app.use("/api/rune/", runeRouter);