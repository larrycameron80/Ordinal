import express, { Request, Response, NextFunction, Router } from "express";
import { insert } from "../controller/transaction.controller";
const router: Router = express.Router();

router.post("/insert", async (req: Request, res: Response) => {
  await insert(req, res);
});

export default router;
