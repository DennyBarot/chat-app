

import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosInstance";

export const sendMessageThunk = createAsyncThunk(
  "message/send",
  async ({ recieverId, message, timestamp }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/message/send/${recieverId}`, {
        message,
        timestamp
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
      const response = await axiosInstance.get(`/message/get-messages/${otherParticipantId}`);
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
      const response = await axiosInstance.get("/message/get-conversations");
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);
