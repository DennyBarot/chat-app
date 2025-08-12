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
  'message/get',
  async ({ otherParticipantId }, { rejectWithValue }) => {
    if (!otherParticipantId) {
      const err = 'otherParticipantId is required';
      toast.error(err);
      return rejectWithValue(err);
    }
    try {
      const response = await axiosInstance.get(`/api/v1/message/get-messages/${otherParticipantId}`);
      // Dedupe and validate messages (your backend should, but client defense is good)
      const messages = Array.isArray(response.data?.responseData)
        ? response.data.responseData
        : Array.isArray(response.data)
        ? response.data
        : [];
      return messages.filter(msg => msg?._id && msg?.content); // Basic validation
    } catch (error) {
      const errMessage = error?.response?.data?.errMessage || error.message || 'Failed to load messages';
      console.error('[getMessageThunk]', error);
      toast.error(errMessage);
      return rejectWithValue([]); // Return empty array to prevent null state
    }
  }
);

export const getConversationsThunk = createAsyncThunk(
  'message/getConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/api/v1/message/get-conversations');
      // Basic validation and cleaning
      const conversations = Array.isArray(response.data?.responseData)
        ? response.data.responseData
        : Array.isArray(response.data)
        ? response.data
        : [];
      return conversations.filter(conv => conv?._id); // Remove null/undefined
    } catch (error) {
      const errMessage = error?.response?.data?.errMessage || error.message || 'Failed to load conversations';
      console.error('[getConversationsThunk]', error);
      toast.error(errMessage);
      return rejectWithValue([]); // Return empty array to prevent null state
    }
  }
);


export const markMessagesReadThunk = createAsyncThunk(
  'message/markRead',
  async ({ conversationId }, { dispatch, rejectWithValue }) => {
    if (!conversationId) {
      const err = 'conversationId is required';
      toast.error(err);
      return rejectWithValue(err);
    }
    try {
      const response = await axiosInstance.post(`/api/v1/message/mark-read/${conversationId}`);
      // Refresh conversations to update unread counts
      await dispatch(getConversationsThunk());
      return response.data;
    } catch (error) {
      const errMessage = error?.response?.data?.errMessage || error.message || 'Failed to mark as read';
      console.error('[markMessagesReadThunk]', error);
      toast.error(errMessage);
      return rejectWithValue(errMessage);
    }
  }
);
