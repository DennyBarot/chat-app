import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosInstance.js";

// Centralized error handling with toast and optional logging for development
const handleApiError = (error) => {
  const message = error?.response?.data?.errMessage || error.message;
  toast.error(message);
  if (process.env.NODE_ENV !== "production") console.error("Axios error:", error);
  return message;
};

// Sets the auth token in localStorage if present in the response
const handleTokenStorage = (response) => {
  if (response?.data?.responseData?.token) {
    localStorage.setItem("token", response.data.responseData.token);
  }
  return response.data;
};

// Clears the auth token from localStorage
const clearToken = () => localStorage.removeItem("token");

// Login
export const loginUserThunk = createAsyncThunk(
  "user/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/v1/user/login", {
        email,
        password,
      });
      handleTokenStorage(response);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Signup
export const registerUserThunk = createAsyncThunk(
  "user/signup",
  async ({ fullName, username, email, password, gender }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/v1/user/register", {
        username,
        fullName,
        email,
        password,
        gender,
      });
      handleTokenStorage(response);
      toast.success("Account created successfully! Please login with email and password");
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Logout
export const logoutUserThunk = createAsyncThunk(
  "user/logout",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/v1/user/logout");
      clearToken();
      toast.success("Logout successful!!");
      return response.data;
    } catch (error) {
      clearToken();
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Get user profile
export const getUserProfileThunk = createAsyncThunk(
  "user/getProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/v1/user/get-profile");
      return response.data;
    } catch (error) {
      clearToken();
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Forgot password
export const forgotPasswordUserThunk = createAsyncThunk(
  "user/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/v1/user/forgot-password", {
        email,
      });
      toast.success("Password reset link sent successfully!!");
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Get other users (non-self)
export const getOtherUsersThunk = createAsyncThunk(
  "user/getOtherUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/v1/user/get-other-users");
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Update profile
export const updateUserProfileThunk = createAsyncThunk(
  "user/updateProfile",
  async ({ fullName, username, avatar }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put("/api/v1/user/update-profile", {
        fullName,
        username,
        avatar,
      });
      toast.success("Profile updated successfully!");
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Get all users (including self)
export const getAllUsersThunk = createAsyncThunk(
  "user/getAllUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/v1/user/get-all-users");
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);
