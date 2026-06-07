import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessRouter from "./business";
import keywordsRouter from "./keywords";
import reportsRouter from "./reports";
import portalRouter from "./portal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/portal", portalRouter);
router.use(businessRouter);
router.use(keywordsRouter);
router.use(reportsRouter);

export default router;
