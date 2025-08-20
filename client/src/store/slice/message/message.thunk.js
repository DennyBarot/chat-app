import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosInstance";

export const sendMessageThunk = createAsyncThunk(
  "message/send",
  async ({ receiverId, message, timestamp, replyTo }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/api/v1/message/send/${receiverId}`, {
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
  async ({ otherParticipantId, limit = 20, before }, { rejectWithValue }) => {
    if (!otherParticipantId) {
      const errorOutput = "otherParticipantId is required";
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
    try {
      const params = { limit };
      if (before) params.before = before;
      
      const response = await axiosInstance.get(
        `/api/v1/message/get-messages/${otherParticipantId}`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const loadMoreMessagesThunk = createAsyncThunk(
  "message/loadMore",
  async ({ otherParticipantId, before, limit = 20 }, { rejectWithValue }) => {
    if (!otherParticipantId || !before) {
      const errorOutput = "otherParticipantId and before cursor are required";
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
    try {
      const response = await axiosInstance.get(
        `/api/v1/message/get-messages/${otherParticipantId}`,
        { params: { limit, before } }
      );
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

export const markMessagesReadThunk = createAsyncThunk(
  "message/markRead",
  async ({ conversationId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/api/v1/message/mark-read/${conversationId}`);
      dispatch(getConversationsThunk());
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

export const getOtherUsersThunk = createAsyncThunk(
  "message/getOtherUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/v1/user/get-other-users");
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);
