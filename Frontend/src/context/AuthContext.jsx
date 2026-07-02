

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

export const AuthContext = createContext();

const API = `${import.meta.env.VITE_API_URL}/api/v1/admin`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // add loading state

  // Restore user on app load
  useEffect(() => {
  const storedUser = localStorage.getItem("user");

  if (storedUser && storedUser !== "undefined") {
    try {
      setUser(JSON.parse(storedUser));
    } catch (err) {
      console.warn("Corrupted user in localStorage:", err);
      localStorage.removeItem("user");
    }
  }

  refreshUser();
}, []);

  // verify user with backend
  const refreshUser = async () => {
    try {
      const res = await axios.get(`${API}/current-admin`, {
        withCredentials: true
      });
      setUser(res.data.data);
      localStorage.setItem("user", JSON.stringify(res.data.data));
    } catch (error) {
      clearUser();
    } finally {
      setLoading(false);
    }
  };

  // login
  // const login = (data) => {
  //   setUser(data.user);
  //   localStorage.setItem("user", JSON.stringify(data.user));
  //   // removed token from localStorage — handled by httpOnly cookie
  //   localStorage.setItem("accessToken", data.accessToken);
  // };
  const login = (data) => {
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    // CRITICAL: This is your mobile fix
    localStorage.setItem("accessToken", data.accessToken);
  };

  const clearUser = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken"); // Cleanup
    setUser(null);
  };

  // logout — calls backend to clear refresh token
  const logout = async () => {
    try {
      await axios.post(`${API}/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      clearUser();
    }
  };


  return (
    <AuthContext.Provider
      value={{ user, login, logout, setUser, refreshUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);