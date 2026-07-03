// pages/admin/AdminDashboard.jsx
//
// TEMPLATE — merge this state/handlers pattern into your real AdminDashboard.jsx.
// I don't have your actual file, so keep your existing layout (sidebar, header,
// other tabs, etc.) and just make sure the "products" section follows this shape:
// track WHICH product id is being edited, not just which section is showing.

import { useState } from "react";
import AdminProductsList from "./AdminProductList";
import AdminProductForm from "./AdminProductForm";

const AdminDashboard = () => {
  // "list" -> show the inventory table/cards
  // "form" -> show the add/edit form
  const [productsSection, setProductsSection] = useState("list");

  // null            -> AdminProductForm renders in CREATE mode
  // a product's _id -> AdminProductForm renders in EDIT mode, pre-filled
  const [editingProductId, setEditingProductId] = useState(null);

  const handleEditProduct = (id) => {
    setEditingProductId(id);
    setProductsSection("form");
  };

  const handleAddNewProduct = () => {
    setEditingProductId(null);
    setProductsSection("form");
  };

  const handleFormDone = () => {
    setEditingProductId(null);
    setProductsSection("list");
  };

  return (
    <div>
      {/* ...your existing dashboard chrome (sidebar / tabs / header) stays here... */}

      {productsSection === "list" && (
        <AdminProductsList
          onEdit={handleEditProduct}
          onAddNew={handleAddNewProduct}
        />
      )}

      {productsSection === "form" && (
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