import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  User, Phone, Mail, Package, ChevronRight,
  ShoppingBag, Clock, CheckCircle, Truck, XCircle,
  AlertCircle, Pencil, X, Check, Camera, Loader2,
  Lock, Eye, EyeOff, MapPin, Plus, Trash2, Star
} from "lucide-react";
import API from "../api/axios";

const STATUS_STYLES = {
  placed:     { color: "bg-blue-100 text-blue-700",    icon: <Clock size={13} />,        label: "Placed" },
  processing: { color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle size={13} />, label: "Processing" },
  shipped:    { color: "bg-purple-100 text-purple-700", icon: <Truck size={13} />,       label: "Shipped" },
  delivered:  { color: "bg-green-100 text-green-700",  icon: <CheckCircle size={13} />, label: "Delivered" },
  cancelled:  { color: "bg-red-100 text-red-700",      icon: <XCircle size={13} />,     label: "Cancelled" },
};

const PAYMENT_STATUS = {
  pending:          { color: "bg-yellow-100 text-yellow-600", label: "Payment Pending" },
  paid:             { color: "bg-green-100 text-green-600",   label: "Paid" },
  failed:           { color: "bg-red-100 text-red-600",       label: "Payment Failed" },
  refund_initiated: { color: "bg-orange-100 text-orange-600", label: "Refund Initiated" },
};

const EMPTY_ADDRESS = { name: "", phone: "", fullAddress: "", isDefault: false };

export default function Profile() {
  const { user, setUser } = useAuth();

  const [orders, setOrders]               = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError]     = useState("");

  const [isEditing, setIsEditing]         = useState(false);
  const [editData, setEditData]           = useState({ username: "", email: "", mobileNumber: "" });
  const [editLoading, setEditLoading]     = useState(false);
  const [editError, setEditError]         = useState("");
  const [editSuccess, setEditSuccess]     = useState("");

  const [avatarLoading, setAvatarLoading] = useState(false);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData]   = useState({ oldPassword: "", newPassword: "" });
  const [showOld, setShowOld]             = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Address state
  const [addresses, setAddresses]         = useState([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [newAddress, setNewAddress]       = useState(EMPTY_ADDRESS);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressError, setAddressError]   = useState("");
  const [deletingId, setDeletingId]       = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await API.get("/api/v1/orders/my-orders");
        setOrders(res.data.data || []);
      } catch (err) {
        setOrdersError(err.response?.data?.message || "Failed to fetch orders");
      } finally {
        setLoadingOrders(false);
      }
    };
    if (user) fetchOrders();
  }, [user]);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await API.get("/api/v1/users/addresses");
        setAddresses(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch addresses", err);
      } finally {
        setAddressLoading(false);
      }
    };
    if (user) fetchAddresses();
  }, [user]);

  const handleEditStart = () => {
    setEditData({
      username: user.username || "",
      email: user.email || "",
      mobileNumber: user.mobileNumber || ""
    });
    setEditError("");
    setEditSuccess("");
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditError("");
    setEditSuccess("");
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 10) setEditData({ ...editData, mobileNumber: val });
  };

  const isMobileValid = editData.mobileNumber.length === 10 && /^[0-9]{10}$/.test(editData.mobileNumber);

  const handleEditSave = async () => {
    if (!isMobileValid) {
      setEditError("Please enter a valid 10-digit mobile number");
      return;
    }
    setEditLoading(true);
    setEditError("");
    setEditSuccess("");
    try {
      const res = await API.patch("/api/v1/users/update-account", {
        username: editData.username,
        email: editData.email,
        mobileNumber: editData.mobileNumber
      });
      setUser(res.data.data);
      setEditSuccess("Profile updated successfully");
      setIsEditing(false);
    } catch (err) {
      const message = err.response?.data?.message || "";
      if (message === "Mobile number or email already in use") {
        setEditError("This mobile number or email is already linked to another account.");
      } else {
        setEditError(message || "Update failed. Please try again.");
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarLoading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await API.patch("/api/v1/users/update-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUser(res.data.data);
    } catch (err) {
      console.error("Avatar update failed", err);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      setPasswordError("Both fields are required");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (passwordData.oldPassword === passwordData.newPassword) {
      setPasswordError("New password cannot be same as old password");
      return;
    }
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      await API.post("/api/v1/users/change-password", {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess("Password changed successfully");
      setPasswordData({ oldPassword: "", newPassword: "" });
      setShowPasswordSection(false);
    } catch (err) {
      const message = err.response?.data?.message || "";
      if (message === "Invalid old password") {
        setPasswordError("Your current password is incorrect.");
      } else {
        setPasswordError(message || "Failed to change password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.name || !newAddress.phone || !newAddress.fullAddress) {
      setAddressError("Name, phone and address are required");
      return;
    }
    if (!/^[0-9]{10}$/.test(newAddress.phone)) {
      setAddressError("Enter a valid 10-digit phone number");
      return;
    }
    setAddingAddress(true);
    setAddressError("");
    try {
      const res = await API.post("/api/v1/users/addresses", newAddress);
      setAddresses(res.data.data);
      setNewAddress(EMPTY_ADDRESS);
      setShowAddForm(false);
    } catch (err) {
      setAddressError(err.response?.data?.message || "Failed to add address");
    } finally {
      setAddingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    setDeletingId(addressId);
    try {
      const res = await API.delete(`/api/v1/users/addresses/${addressId}`);
      setAddresses(res.data.data);
    } catch (err) {
      console.error("Failed to delete address", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <ShoppingBag size={40} className="text-gray-300" />
        <p className="text-gray-500 text-base font-medium">Please log in to view your profile.</p>
        <Link to="/login" className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-500" />

          <div className="px-6 pb-6">

            {/* Avatar + Edit Button */}
            <div className="flex items-end justify-between -mt-12 mb-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
                  {avatarLoading ? (
                    <Loader2 size={24} className="text-blue-500 animate-spin" />
                  ) : user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-gray-400" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-md">
                  <Camera size={12} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              {!isEditing ? (
                <button onClick={handleEditStart}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <Pencil size={13} /> Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleEditCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <X size={13} /> Cancel
                  </button>
                  <button onClick={handleEditSave} disabled={editLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                    {editLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {editLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            {/* Name + Role */}
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 capitalize">{user.username}</h2>
                {user.role === "admin" && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Admin</span>
                )}
              </div>
            </div>

            {/* Feedback messages */}
            {editError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm mb-4">
                <AlertCircle size={15} /> {editError}
              </div>
            )}
            {editSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm mb-4">
                <CheckCircle size={15} /> {editSuccess}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm mb-4">
                <CheckCircle size={15} /> {passwordSuccess}
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Mobile */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Phone size={14} className="text-blue-500" />
                  <p className="text-xs text-gray-400 font-medium">Mobile</p>
                </div>
                {isEditing ? (
                  <div>
                    <input type="text" value={editData.mobileNumber} onChange={handleMobileChange}
                      className={`w-full text-sm font-semibold text-gray-800 bg-white border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:border-transparent transition-all
                        ${editData.mobileNumber && !isMobileValid ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-blue-500"}`} />
                    {editData.mobileNumber && (
                      <p className={`text-xs mt-1 ${isMobileValid ? "text-green-500" : "text-gray-400"}`}>
                        {editData.mobileNumber.length}/10 {isMobileValid && "✓"}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-gray-800">{user.mobileNumber}</p>
                )}
              </div>

              {/* Email */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={14} className="text-blue-500" />
                  <p className="text-xs text-gray-400 font-medium">Email</p>
                </div>
                {isEditing ? (
                  <input type="email" value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                ) : (
                  <p className="text-sm font-semibold text-gray-800 truncate">{user.email || "Not set"}</p>
                )}
              </div>

              {/* Username — only in edit mode */}
              {isEditing && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-blue-500" />
                    <p className="text-xs text-gray-400 font-medium">Username</p>
                  </div>
                  <input type="text" value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    className="w-full text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
              )}
            </div>

            {/* Change Password */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setShowPasswordSection(!showPasswordSection);
                  setPasswordError("");
                  setPasswordSuccess("");
                  setPasswordData({ oldPassword: "", newPassword: "" });
                }}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
              >
                <Lock size={13} />
                {showPasswordSection ? "Cancel Password Change" : "Change Password"}
              </button>

              {showPasswordSection && (
                <div className="mt-3 bg-gray-50 rounded-xl px-4 py-4 space-y-3">
                  <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Lock size={13} className="text-blue-500" /> Change Password
                  </p>

                  {passwordError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                      <AlertCircle size={13} /> {passwordError}
                    </div>
                  )}

                  <div className="relative">
                    <input type={showOld ? "text" : "password"} placeholder="Current password"
                      value={passwordData.oldPassword}
                      onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                      className="w-full pr-10 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    <button type="button" onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <div className="relative">
                    <input type={showNew ? "text" : "password"} placeholder="New password (min. 6 characters)"
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full pr-10 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {passwordData.newPassword && (
                    <p className={`text-xs pl-1 ${passwordData.newPassword.length >= 6 ? "text-green-500" : "text-gray-400"}`}>
                      {passwordData.newPassword.length >= 6 ? "Strong enough ✓" : `${passwordData.newPassword.length}/6 minimum`}
                    </p>
                  )}

                  <button onClick={handleChangePassword}
                    disabled={passwordLoading || passwordData.newPassword.length < 6}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                    {passwordLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Saved Addresses ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              <h3 className="text-base font-black text-gray-900">Saved Addresses</h3>
            </div>
            {addresses.length < 5 && (
              <button
                onClick={() => { setShowAddForm(!showAddForm); setAddressError(""); setNewAddress(EMPTY_ADDRESS); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={13} />
                {showAddForm ? "Cancel" : "Add New"}
              </button>
            )}
          </div>

          <div className="px-6 py-4 space-y-3">

            {/* Add Address Form */}
            {showAddForm && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <MapPin size={13} className="text-blue-500" /> New Address
                </p>

                {addressError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                    <AlertCircle size={13} /> {addressError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={newAddress.name}
                    onChange={e => setNewAddress({ ...newAddress, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Phone number"
                    value={newAddress.phone}
                    onChange={e => setNewAddress({ ...newAddress, phone: e.target.value.replace(/\D/, "") })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <textarea
                  placeholder="House / Flat no., Street, Area, City, State, Pincode"
                  value={newAddress.fullAddress}
                  onChange={e => setNewAddress({ ...newAddress, fullAddress: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={newAddress.isDefault}
                    onChange={e => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-xs font-semibold text-gray-600">Set as default address</span>
                </label>

                <button
                  onClick={handleAddAddress}
                  disabled={addingAddress}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
                >
                  {addingAddress
                    ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                    : <><Check size={14} /> Save Address</>}
                </button>
              </div>
            )}

            {/* Address List */}
            {addressLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : addresses.length === 0 && !showAddForm ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <MapPin size={32} className="text-gray-200" />
                <p className="text-gray-400 text-sm font-medium">No saved addresses</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  Add your first address
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div key={addr._id}
                    className={`relative flex items-start justify-between gap-3 p-4 rounded-xl border transition-all
                      ${addr.isDefault
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex gap-3 min-w-0">
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                        ${addr.isDefault ? "bg-blue-100" : "bg-gray-100"}`}>
                        <MapPin size={15} className={addr.isDefault ? "text-blue-600" : "text-gray-400"} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-800">{addr.name}</p>
                          {addr.isDefault && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              <Star size={10} fill="currentColor" /> Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{addr.phone}</p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{addr.fullAddress}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAddress(addr._id)}
                      disabled={deletingId === addr._id}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deletingId === addr._id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                ))}

                {addresses.length >= 5 && (
                  <p className="text-xs text-center text-gray-400">
                    Maximum 5 addresses reached
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-blue-600" />
              <h3 className="text-base font-black text-gray-900">My Orders</h3>
            </div>
            {orders.length > 0 && (
              <span className="text-xs font-semibold text-gray-400">
                {orders.length} order{orders.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="px-6 py-4">
            {loadingOrders ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : ordersError ? (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
                <AlertCircle size={16} /> {ordersError}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <ShoppingBag size={36} className="text-gray-200" />
                <p className="text-gray-400 text-sm font-medium">No orders yet</p>
                <Link to="/" className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const status = STATUS_STYLES[order.orderStatus] || STATUS_STYLES.placed;
                  const payment = PAYMENT_STATUS[order.paymentStatus];
                  const showPaymentBadge = order.paymentMethod === "online" && order.paymentStatus !== "paid";

                  return (
                    <Link to={`/orders/${order._id}`} key={order._id}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-xl transition-all duration-200 group">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-800">
                            Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                          </p>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                            {status.icon} {status.label}
                          </span>
                          {showPaymentBadge && payment && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${payment.color}`}>
                              {payment.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric"
                            })}
                          </span>
                          <span>·</span>
                          <span>{order.orderItems?.length} item{order.orderItems?.length > 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span className="capitalize">{order.paymentMethod === "cod" ? "COD" : "Online"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-black text-gray-900">₹{order.totalAmount}</p>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}