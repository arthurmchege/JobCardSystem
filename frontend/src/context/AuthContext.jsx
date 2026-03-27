/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // INITIALIZATION - Load user from localStorage on mount

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Error loading user from localStorage:", error);
        // Clear corrupted data
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // LOGIN -  Authenticate user and store credentials
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      console.log("🔵 Full response:", response); // Debug

      // Your backend wraps data in a "data" property
      const userData = response.data;

      console.log("🔵 User:", userData);

      if (!userData) {
        throw new Error("Invalid response from server");
      }

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      console.log("✅ User stored in state:", userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        success: false,
        error: typeof error === "string" ? error : error.message,
      };
    }
  };

  // LOGOUT - Clear credentials and state
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // This will run whether the api call succeeded or failed
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  // REGISTER - Create a new user account
  // REGISTER - Create a new user account
  const register = async (userData) => {
    try {
      // Register first (backend doesn't return token on register)
      await authAPI.register(userData);

      // Then immediately login to get the token
      const loginResult = await authAPI.login(
        userData.email,
        userData.password,
      );
      const newUser = loginResult.data;

      // Store in localStorage
      localStorage.setItem("user", JSON.stringify(newUser));

      // Update state
      setUser(newUser);

      return { success: true, user: newUser };
    } catch (error) {
      return {
        success: false,
        error: typeof error === "string" ? error : error.message,
      };
    }
  };

  // UPDATE USER - Update user info
  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // HELPER FUNCTIONS
  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Get user's role
  const getRole = () => {
    return user?.role || null;
  };

  // CONTEXT VALUE
  const value = {
    // State
    user,
    loading,

    // Auth Functions
    login,
    logout,
    register,
    updateUser,

    // Helper Functions
    isAuthenticated: isAuthenticated(),
    hasRole,
    getRole,

    // Convenience flags
    isSupervisor: user?.role === "supervisor",
    isTechnician: user?.role === "technician",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default AuthContext;
