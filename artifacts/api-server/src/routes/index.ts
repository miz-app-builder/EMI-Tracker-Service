import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shopsRouter from "./shops";
import productsRouter from "./products";
import emiOrdersRouter from "./emiOrders";
import dashboardRouter from "./dashboard";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth, shopsRouter);
router.use(requireAuth, productsRouter);
router.use(requireAuth, emiOrdersRouter);
router.use(requireAuth, dashboardRouter);

export default router;
