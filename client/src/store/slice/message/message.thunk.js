import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosInstance.js";

// Helper for consistent error reporting
const handleApiError = (error) => {
  const message = error?.response?.data?.errMessage || "Request failed";
  toast.error(message);
  if (process.env.NODE_ENV !== "production") console.error(error);
  // Return message for rejectWithValue
  return message;
};

// Send a new message and refresh conversations
export const sendMessageThunk = createAsyncThunk(
  "message/send",
  async ({ recieverId, message, timestamp, replyTo }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/api/v1/message/send/${recieverId}`, {
        message,
        timestamp,
        replyTo,
      });
      // Always refresh conversations after a new message
      await dispatch(getConversationsThunk());
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);
// Fetch all conversations for the user
export const getConversationsThunk = createAsyncThunk(
  "message/getConversations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/v1/message/get-conversations");
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Fetch messages for a conversation
export const getMessageThunk = createAsyncThunk(
  "message/get",
  async ({ otherParticipantId }, { rejectWithValue }) => {
    if (!otherParticipantId) {
      const message = "otherParticipantId is required";
      toast.error(message);
      return rejectWithValue(message);
    }
    try {
      const response = await axiosInstance.get(`/api/v1/message/get-messages/${otherParticipantId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);




// Mark messages as read
export const markMessagesReadThunk = createAsyncThunk(
  "message/markRead",
  async ({ conversationId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/api/v1/message/mark-read/${conversationId}`);
      // Removed client-side dispatch of getConversationsThunk to avoid race condition.
      // Server should send updated unreadCount via socket event or getConversationsThunk will fetch it later.
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateConversationThunk = createAsyncThunk(
  'message/updateConversation',
  async ({ newMessage }, { getState, dispatch }) => {
    const state = getState();
    const { userProfile } = state.userReducer;

    const conversationId = newMessage.conversationId;
    const conversationIndex = state.messageReducer.conversations.findIndex(c => c._id === conversationId);

    if (conversationIndex !== -1) {
      return {
        conversationIndex,
        newMessage,
        userProfile,
      };
    } else {
      dispatch(getConversationsThunk());
      return null;
    }
  }
);