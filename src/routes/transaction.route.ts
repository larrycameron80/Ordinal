import express, { Request, Response, NextFunction, Router } from "express";
import { insert } from "../controller/transaction.controller";
const router: Router = express.Router();

router.post("/insert", async (req: Request, res: Response) => {
  try {
    await insert(req, res);
  } catch (error) {
    console.log("Insert transaction error =>", error);
  }
});

export default router;
