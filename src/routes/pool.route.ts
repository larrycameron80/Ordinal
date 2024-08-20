import express, { Request, Response, Router } from "express";
import { addLiquidity, createPool, getEstimateLpAmount, getPoolList, removeLiquidity } from "../controller/pool.controller";

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

router.get("/list", async (req: Request, res: Response) => {
    await getPoolList(req, res);
});

router.post("/create", async (req: Request, res: Response) => {
    await createPool(req, res);
});

router.post("/estimateLp", async (req: Request, res: Response) => {
    await getEstimateLpAmount(req, res);
})

export default router;
