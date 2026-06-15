import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import shopsRouter from "./shops";
import productsRouter from "./products";
import emiOrdersRouter from "./emiOrders";
import dashboardRouter from "./dashboard";
import exportRouter from "./export";
import activityLogsRouter from "./activityLogs";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireAuth, usersRouter);
router.use(requireAuth, shopsRouter);
router.use(requireAuth, productsRouter);
router.use(requireAuth, emiOrdersRouter);
router.use(requireAuth, dashboardRouter);
router.use(requireAuth, exportRouter);
router.use(requireAuth, activityLogsRouter);

export default router;
