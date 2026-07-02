// pages/admin/AdminDashboard.jsx
import { useState } from "react";
import AdminProductsList from "./AdminProductList";
import AdminProductForm from "./AdminProductForm";

const TABS = [
  { key: "inventory", label: "Inventory" },
  { key: "create", label: "Add product" },
  // Add more sections here later, e.g. { key: "orders", label: "Orders" },
  // and render them in the <main> block below.
];

const AdminDashboard = () => {
  const [section, setSection] = useState("inventory"); // "inventory" | "create" | "edit"
  const [editingId, setEditingId] = useState(null); // productId being edited, or null

  // Called from the list when "Edit" is clicked on a row
  const handleEditProduct = (id) => {
    setEditingId(id);
    setSection("edit");
  };

  const handleAddNew = () => {
    setEditingId(null);
    setSection("create");
  };

  // Called when a create/edit form finishes saving, or is cancelled —
  // both just return to the inventory view.
  const handleFormDone = () => {
    setEditingId(null);
    setSection("inventory");
  };

  const handleTabClick = (key) => {
    setEditingId(null); // leaving edit mode clears the target id
    setSection(key);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F3]">
      <header className="bg-white border-b border-[#E1E3DD]">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="py-4">
            <h1 className="font-display text-[18px] font-semibold text-[#14171C] tracking-tight">
              Admin
            </h1>
          </div>

          <nav className="flex items-center gap-1">
            {TABS.map((tab) => {
              // "Inventory" tab stays highlighted while editing a product,
              // since editing is conceptually part of inventory management.
              const isActive =
                section === tab.key || (tab.key === "inventory" && section === "edit");
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key)}
                  className={`px-4 py-2.5 text-[13.5px] font-medium border-b-2 transition-colors duration-150 ${
                    isActive
                      ? "border-[#2F5DFF] text-[#14171C]"
                      : "border-transparent text-[#9CA0A6] hover:text-[#14171C]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main>
        {section === "inventory" && (
          <AdminProductsList onEdit={handleEditProduct} onAddNew={handleAddNew} />
        )}

        {section === "create" && (
          <AdminProductForm onDone={handleFormDone} onCancel={handleFormDone} />
        )}

        {section === "edit" && editingId && (
          <AdminProductForm
            productId={editingId}
            onDone={handleFormDone}
            onCancel={handleFormDone}
          />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;