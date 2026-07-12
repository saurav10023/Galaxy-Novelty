// routes/product.routes.js
import { Router } from "express";
import {
    createProduct, updateProduct, addProductImages, removeProductImage,
    deleteProduct, getProductById, getAllProducts, toggleProductStatus,
    getProductByIdAdmin,
} from "../controllers/product.controller.js";
import { searchProducts, getAvailableFilters, getBrandsByCategory } from "../controllers/search.controller.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/authAdmin.middleware.js";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// specific routes FIRST — public, but admin-aware
router.route("/search").get(optionalAuth, searchProducts);
router.route("/filters/:category").get(getAvailableFilters);
router.get("/brands", optionalAuth, getBrandsByCategory);

// generic admin-only list route
router.route("/").get(verifyjwt, verifyAdmin, getAllProducts);
router.route("/").post(verifyjwt, verifyAdmin, upload.array("images", 5), createProduct);

router.route("/admin/search").get(verifyjwt, verifyAdmin, searchProducts);
router.route("/admin/filters/:category").get(getAvailableFilters);
router.get("/admin/brands", verifyjwt, verifyAdmin, getBrandsByCategory);

// param-based routes LAST
router.route("/admin/:id").get(verifyjwt, verifyAdmin, getProductByIdAdmin);
router.route("/:id").get(getProductById);

router.patch(
  "/:id",
  verifyjwt,
  verifyAdmin,
  upload.array("images"),
  updateProduct
);
router.route("/:id").delete(verifyjwt, verifyAdmin, deleteProduct);
router.route("/:id/images").post(verifyjwt, verifyAdmin, upload.array("images", 5), addProductImages);
router.route("/:id/images").delete(verifyjwt, verifyAdmin, removeProductImage);
router.route("/:id/toggle-status").patch(verifyjwt, verifyAdmin, toggleProductStatus);

export default router;