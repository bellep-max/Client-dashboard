import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessRouter from "./business";
import keywordsRouter from "./keywords";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessRouter);
router.use(keywordsRouter);
router.use(reportsRouter);

export default router;
