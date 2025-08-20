import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, loadMoreMessagesThunk, getConversationsThunk } from "./message.thunk";

const messageSlice = createSlice({
  name: "message",
  initialState: {
    messages: [],
    conversations: [],
    newMessage: null,
    isLoading: false,
    error: null,
    pagination: {
      hasMore: false,
      cursor: null,
      isLoadingMore: false
    }
  },
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    prependMessages: (state, action) => {
      state.messages = [...action.payload, ...state.messages];
    },
    addMessage: (state, action) => {
      state.messages = [...state.messages, action.payload];
    },
    setNewMessage: (state, action) => {
      state.newMessage = action.payload;
    },
    messagesRead: (state, action) => {
      const { messageIds, readBy, readAt } = action.payload;
      state.messages = state.messages.map(msg =>
        messageIds.includes(msg._id)
          ? { ...msg, readBy: [...(msg.readBy || []), readBy], readAt }
          : msg
      );
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setLoadingMore: (state, action) => {
      state.pagination.isLoadingMore = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getMessageThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMessageThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages = action.payload?.messages || [];
        state.pagination = {
          hasMore: action.payload?.hasMore || false,
          cursor: action.payload?.cursor || null,
          isLoadingMore: false
        };
      })
      .addCase(getMessageThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(loadMoreMessagesThunk.pending, (state) => {
        state.pagination.isLoadingMore = true;
        state.error = null;
      })
      .addCase(loadMoreMessagesThunk.fulfilled, (state, action) => {
        state.pagination.isLoadingMore = false;
        state.messages = [...action.payload?.messages || [], ...state.messages];
        state.pagination = {
          hasMore: action.payload?.hasMore || false,
          cursor: action.payload?.cursor || null
        };
      })
      .addCase(loadMoreMessagesThunk.rejected, (state, action) => {
        state.pagination.isLoadingMore = false;
        state.error = action.payload;
      })
      .addCase(getConversationsThunk.fulfilled, (state, action) => {
        state.conversations = action.payload?.responseData ?? [];
      });
  },
});

export const { setNewMessage, messagesRead, prependMessages, setPagination, setLoadingMore } = messageSlice.actions;
export default messageSlice.reducer;
