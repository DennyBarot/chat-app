import { createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-hot-toast';
import { axiosInstance } from '../../../components/utilities/axiosInstance';

/**
 * Logs in a user with email and password.
 * Stores JWT token in localStorage on success.
 * @param {Object} payload - { email: string, password: string }
 * @returns {Promise<Object>} Server response with user and token
 */
export const loginUserThunk = createAsyncThunk(
  'user/login',
  async ({ email, password }, { rejectWithValue }) => {
    if (!email || !password) {
      const err = 'Email and password are required';
      toast.error(err);
      return rejectWithValue(err);
    }
    try {
      const response = await axiosInstance.post('/api/v1/user/login', {
        email,
        password,
      });
      const token = response.data?.responseData?.token;
      if (token) {
        localStorage.setItem('token', token);
      } else {
        console.warn('No token received in login response');
      }
      toast.success('Logged in successfully!');
      return response.data;
    } catch (error) {
      const errMessage =
        error?.response?.data?.message ||
        error.message ||
        'Login failed. Please try again.';
      console.error('[loginUserThunk]', error);
      toast.error(errMessage);
      return rejectWithValue(errMessage);
    }
  }
);

/**
 * Requests a password reset link for the given email.
 * @param {Object} payload - { email: string }
 * @returns {Promise<Object>} Server response
 */
export const forgotPasswordUserThunk = createAsyncThunk(
  'user/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    if (!email) {
      const err = 'Email is required';
      toast.error(err);
      return rejectWithValue(err);
    }
    try {
      const response = await axiosInstance.post('/api/v1/user/forgot-password', {
        email,
      });
      toast.success('Password reset link sent successfully!');
      return response.data;
    } catch (error) {
      const errMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to send reset link.';
      console.error('[forgotPasswordUserThunk]', error);
      toast.error(errMessage);
      return rejectWithValue(errMessage);
    }
  }
);

/**
 * Registers a new user.
 * Stores JWT token in localStorage on success.
 * @param {Object} payload - { fullName: string, username: string, email: string, password: string, gender: string }
 * @returns {Promise<Object>} Server response with user and token
 */
export const registerUserThunk = createAsyncThunk(
  'user/signup',
  async ({ fullName, username, email, password, gender }, { rejectWithValue }) => {
    if (!fullName || !username || !email || !password || !gender) {
      const err = 'All fields are required';
      toast.error(err);
      return rejectWithValue(err);
    }
    try {
      const response = await axiosInstance.post('/api/v1/user/register', {
        fullName,
        username,
        email,
        password,
        gender,
      });
      const token = response.data?.responseData?.token;
      if (token) {
        localStorage.setItem('token', token);
      }
      toast.success('Account created successfully! Please login.');
      return response.data;
    } catch (error) {
      const errMessage =
        error?.response?.data?.message ||
        error.message ||
        'Registration failed. Please try again.';
      console.error('[registerUserThunk]', error);
      toast.error(errMessage);
      return rejectWithValue(errMessage);
    }
  }
);

/**
 * Logs out the current user.
 * Clears JWT token from localStorage.
 * @returns {Promise<Object>} Server response
 */
export const logoutUserThunk = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/api/v1/user/logout');
      localStorage.removeItem('token');
      toast.success('Logged out successfully!');
      return response.data;
    } catch (error) {
      const errMessage =
        error?.response?.data?.message ||
        error.message ||
        'Logout failed. Please try again.';
      console.error('[logoutUserThunk]', error);
      toast.error(errMessage);
      // Still remove token even on error
      localStorage.removeItem('token');
      return rejectWithValue(errMessage);
    }
  }
);

/**
 * Fetches the current user's profile.
 * Clears token if request fails (e.g., token expired).
 * @returns {Promise<Object>} Server response with user profile
 */
export const getUserProfileThunk = createAsyncThunk(
  'user/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/api/v1/user/get-profile');
      return response.data;
    } catch (error) {
      const errMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to fetch profile.';
      console.error('[getUserProfileThunk]', error);
      toast.error(errMessage);
      // Force re-login if profile fetch fails (likely expired/invalid token)
      localStorage.removeItem('token');
      return rejectWithValue(errMessage);
    }
  }
);

/**
 * Fetches a list of other users (non-current).
 * @returns {Promise<Array<Object>>} Array of user objects
 */
export const getOtherUsersThunk = createAsyncThunk(
  'user/getOtherUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/api/v1/user/get-other-users');
      return response.data;
    } catch (error) {
      const errMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to fetch other users.';
      console.error('[getOtherUsersThunk]', error);
      toast.error(errMessage);
      return rejectWithValue(errMessage);
    }
  }
);

/**
 * Fetches a paginated list of all users.
 * @param {Object} payload - { page: number, limit: number }
 * @returns {Promise<Object>} { users: Array<Object>, totalPages: number, ... }
 */
export const getAllUsersThunk = createAsyncThunk(
  'user/getAllUsers',
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/api/v1/user/get-all-users?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      const errMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to fetch all users.';
      console.error('[getAllUsersThunk]', error);
      toast.error(errMessage);
      return rejectWithValue(errMessage);
    }
  }
);

/**
 * Updates the current user's profile.
 * @param {Object} payload - { fullName?: string, username?: string, avatar?: string }
 * @returns {Promise<Object>} Updated user profile
 */
export const updateUserProfileThunk = createAsyncThunk(
  'user/updateProfile',
  async ({ fullName, username, avatar }, { rejectWithValue }) => {
    if (!fullName && !username && !avatar) {
      const err = 'At least one field is required';
      toast.error(err);
      return rejectWithValue(err);
    }
    try {
      const response = await axiosInstance.put('/api/v1/user/update-profile', {
        fullName,
        username,
        avatar,
      });
      toast.success('Profile updated successfully!');
      return response.data;
    } catch (error) {
      const errMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to update profile.';
      console.error('[updateUserProfileThunk]', error);
      toast.error(errMessage);
      return rejectWithValue(errMessage);
    }
  }
);
