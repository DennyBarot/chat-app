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
        replyTo, // <-- add this
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

export const markConversationReadThunk = createAsyncThunk(
  'message/markRead',
  async (conversationId, { rejectWithValue, getState }) => {
    try {
      const response = await axiosInstance.post(`/api/v1/message/mark-read/${conversationId}`);
      
      // Emit socket event for read status
      const state = getState();
      const userId = state.userReducer.user?._id;
      if (userId) {
        // You would need to access socket here, but since we can't import it directly,
        // this would typically be handled in the component or context
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.errMessage || error.message);
    }
  }
);
