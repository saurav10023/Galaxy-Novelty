// routes/search.routes.js
import { Router } from "express";
import { searchProducts, getAvailableFilters } from "../controllers/search.controller.js";


const router = Router();

router.route("/search").get(searchProducts);
router.route("/filters/:category").get(getAvailableFilters);

export default router;