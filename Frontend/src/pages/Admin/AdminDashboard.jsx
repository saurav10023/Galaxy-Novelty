// pages/admin/AdminDashboard.jsx
//
// TEMPLATE — merge this state/handlers pattern into your real AdminDashboard.jsx.
// I don't have your actual file, so keep your existing layout (sidebar, header,
// other tabs, etc.) and just make sure the "products" section follows this shape.
//
// THIS PASS: added an Analytics view alongside Inventory/Form.
//   - productsSection now has three states instead of two: "list" | "analytics" | "form".
//   - A small Inventory/Analytics sub-nav sits above both, but is hidden while the
//     form is open — an admin mid-edit shouldn't be tempted to tab away and lose
//     context, they should Save or Cancel first.
//   - "+ Add product" still lives inside AdminProductsList itself (via onAddNew),
//     so it naturally only shows up on the Inventory tab.
//   - AdminProductAnalytics is fully self-contained (fetches its own data), so it
//     just gets dropped in with no props.

import { useState } from "react";
import AdminProductsList from "./AdminProductList";
import AdminProductForm from "./AdminProductForm";
import AdminProductAnalytics from "./AdminProductAnalytics";

const PRODUCTS_VIEW = { LIST: "list", ANALYTICS: "analytics", FORM: "form" };

const AdminDashboard = () => {
  // "list"      -> show the inventory table/cards
  // "analytics" -> show the analytics view (category/brand/price breakdown)
  // "form"      -> show the add/edit form
  const [productsSection, setProductsSection] = useState(PRODUCTS_VIEW.LIST);

  // null            -> AdminProductForm renders in CREATE mode
  // a product's _id -> AdminProductForm renders in EDIT mode, pre-filled
  const [editingProductId, setEditingProductId] = useState(null);

  const handleEditProduct = (id) => {
    setEditingProductId(id);
    setProductsSection(PRODUCTS_VIEW.FORM);
  };

  const handleAddNewProduct = () => {
    setEditingProductId(null);
    setProductsSection(PRODUCTS_VIEW.FORM);
  };

  const handleFormDone = () => {
    setEditingProductId(null);
    setProductsSection(PRODUCTS_VIEW.LIST);
  };

  const isFormOpen = productsSection === PRODUCTS_VIEW.FORM;

  return (
    <div>
      {/* ...your existing dashboard chrome (sidebar / tabs / header) stays here... */}

      {/* Inventory / Analytics sub-nav — hidden while the form is open. */}
      {!isFormOpen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 md:pt-8">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 backdrop-blur-md p-1 mb-5">
            <button
              onClick={() => setProductsSection(PRODUCTS_VIEW.LIST)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-150 ${
                productsSection === PRODUCTS_VIEW.LIST
                  ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,0.5)]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setProductsSection(PRODUCTS_VIEW.ANALYTICS)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-150 ${
                productsSection === PRODUCTS_VIEW.ANALYTICS
                  ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,0.5)]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      )}

      {productsSection === PRODUCTS_VIEW.LIST && (
        <AdminProductsList
          onEdit={handleEditProduct}
          onAddNew={handleAddNewProduct}
        />
      )}

      {productsSection === PRODUCTS_VIEW.ANALYTICS && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pb-8">
          <AdminProductAnalytics />
        </div>
      )}

      {isFormOpen && (
        <AdminProductForm
          productId={editingProductId}
          onDone={handleFormDone}
          onCancel={handleFormDone}
        />
      )}
    </div>
  );
};

export default AdminDashboard;