import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosInstance";

export const sendMessageThunk = createAsyncThunk(
  "message/send",
  async ({ recieverId, message, timestamp, replyTo }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/api/v1/message/send/${recieverId}`, {
        message,
        timestamp,
        replyTo,
      });
      // After sending message, refresh conversations
      await dispatch(getConversationsThunk());
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const getMessageThunk = createAsyncThunk(
  "message/get",
  async ({ otherParticipantId }, { rejectWithValue }) => {
    if (!otherParticipantId) {
      const errorOutput = "otherParticipantId is required";
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
    try {
      const response = await axiosInstance.get(`/api/v1/message/get-messages/${otherParticipantId}`);
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const getConversationsThunk = createAsyncThunk(
  "message/getConversations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/v1/message/get-conversations");
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

// New thunks for unread count functionality
export const getUnreadCountThunk = createAsyncThunk(
  "message/getUnreadCount",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const endpoint = conversationId 
        ? `/api/v1/message/unread-count/${conversationId}`
        : '/api/v1/message/unread-count';
      const response = await axiosInstance.get(endpoint);
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const markMessagesAsReadThunk = createAsyncThunk(
  "message/markMessagesAsRead",
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/api/v1/message/mark-read/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);
