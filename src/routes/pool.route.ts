import express, { Request, Response, Router } from "express";
import { addLiquidity, removeLiquidity } from "../controller/pool.controller";

const router: Router = express.Router();

// router.post("/addLiquidity", async (req: Request, res: Response) => {
//   try {
//     await addLiquidity(req, res);
//   } catch (error) {
//     console.log("Add liquidity error =>", error);
//   }
// });

// router.post("/removeLiquidity", async (req: Request, res: Response) => {
//   try {
//     await removeLiquidity(req, res);
//   } catch (error) {
//     console.log("Remove liquidity error =>", error);
//   }
// });

export default router;
