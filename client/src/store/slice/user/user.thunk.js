import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from 'react-hot-toast';
import { axiosInstance } from "../../../components/utilities/axiosInstance";

export const loginUserThunk = createAsyncThunk(
  "user/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/user/login", {
        email,
        password,
      });
      
      return response.data;
    } catch (error) {
      console.error("Axios error:", error); 
      const errorOutput = error?.response?.data?.errMessage || error.message;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const forgotPasswordUserThunk = createAsyncThunk(
  "user/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/user/forgot-password", {
        email,
      });
      toast.success("Password reset link sent successfully!!");
      return response.data;
    } catch (error) {
      console.error("Axios error:", error); 
      const errorOutput = error?.response?.data?.errMessage || error.message;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const registerUserThunk = createAsyncThunk(
  "user/signup",
  async ({ fullName, username, email, password, gender }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/user/register", {
        username,
        fullName,
        email,
        password,
        gender,
      });
      toast.success("Account created successfully!!");
      return response.data;
    } catch (error) {
      console.error("Axios error:", error); 
      const errorOutput = error?.response?.data?.errMessage || error.message;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const logoutUserThunk = createAsyncThunk(
  "user/logout",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/user/logout");
      toast.success("Logout successful!!");
      return response.data;
    } catch (error) {
      console.error("Axios error:", error); // Log the full error response
      const errorOutput = error?.response?.data?.errMessage || error.message;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const getUserProfileThunk = createAsyncThunk(
  "user/getProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/user/get-profile");
      return response.data;
    } catch (error) {
      console.error("Axios error:", error); // Log the full error response
      const errorOutput = error?.response?.data?.errMessage || error.message;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const getOtherUsersThunk = createAsyncThunk(
  "user/getOtherUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/user/get-other-users");
      return response.data;
    } catch (error) {
      console.error("Axios error:", error); 
      const errorOutput = error?.response?.data?.errMessage || error.message;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const updateUserProfileThunk = createAsyncThunk(
  "user/updateProfile",
  async ({ fullName, username, avatar }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put("/user/update-profile", {
        fullName,
        username,
        avatar, 
      });

      toast.success("Profile updated successfully!");
      return response.data;
    } catch (error) {
      console.error("Axios error:", error);
      const errorOutput = error?.response?.data?.errMessage || error.message;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const getAllUsersThunk = createAsyncThunk(
  "user/getAllUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/user/get-all-users");
      return response.data;
    } catch (error) {
      console.error("Axios error:", error);
      const errorOutput = error?.response?.data?.errMessage || error.message;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);
