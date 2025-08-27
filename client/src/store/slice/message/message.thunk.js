import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosInstance";

export const sendMessageThunk = createAsyncThunk(
  "message/send",
  async ({ receiverId, message, timestamp, replyTo, audio, audioData, audioDuration, tempId }, { rejectWithValue }) => {
    try {
      let response;
      
      if (audio) {
        // If audio is provided as FormData (file upload - for backward compatibility)
        response = await axiosInstance.post(`/api/v1/message/send/${receiverId}`, audio, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else if (audioData) {
        // If audio is provided as Base64 data
        response = await axiosInstance.post(`/api/v1/message/send/${receiverId}`, {
          message,
          timestamp,
          replyTo,
          audioData,
          audioDuration,
        });
      } else {
        // Regular text message
        response = await axiosInstance.post(`/api/v1/message/send/${receiverId}`, {
          message,
          timestamp,
          replyTo,
        });
      }
      
      return { message: response.data, tempId };
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue({ error: errorOutput, tempId });
    }
  }
);

// Client-side message cache
const messageCache = new Map();

export const getMessageThunk = createAsyncThunk(
  "message/get",
  async ({ otherParticipantId, page = 1, limit = 20 }, { rejectWithValue }) => {
    if (!otherParticipantId) {
      const errorOutput = "otherParticipantId is required";
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
    
    // Check cache first
    const cacheKey = `${otherParticipantId}-${page}-${limit}`;
    const cachedData = messageCache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < 30000) { // 30 second cache
      return { ...cachedData.data, fromCache: true };
    }
    
    try {
      const response = await axiosInstance.get(`/api/v1/message/get-messages/${otherParticipantId}?page=${page}&limit=${limit}`);
      const responseData = response.data;
      
      // Cache the response
      messageCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });
      
      return responseData;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);

// Clear cache for a specific conversation when needed
export const clearMessageCache = (otherParticipantId) => {
  for (const [key] of messageCache.entries()) {
    if (key.startsWith(`${otherParticipantId}-`)) {
      messageCache.delete(key);
    }
  }
};

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
  async ({ conversationId }, {  rejectWithValue }) => {
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

export const createConversationThunk = createAsyncThunk(
  "conversation/create",
  async ({ participants }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/api/v1/conversation/", { participants });
      return response.data;
    } catch (error) {
      console.error(error);
      const errorOutput = error?.response?.data?.errMessage;
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);