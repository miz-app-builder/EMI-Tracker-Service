import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shopsRouter from "./shops";
import productsRouter from "./products";
import emiOrdersRouter from "./emiOrders";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shopsRouter);
router.use(productsRouter);
router.use(emiOrdersRouter);
router.use(dashboardRouter);

export default router;
