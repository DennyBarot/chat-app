import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, sendMessageThunk, getConversationsThunk, markMessagesReadThunk } from "./message.thunk";

const initialState = {
  buttonLoading: false,
  screenLoading: false,
  messages: null,
  conversations: [],
  sendMessageStatus: 'idle', 
};

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    addMessage: (state, action) => {
      if (!action.payload) return; // Handle undefined or null payload
      state.messages = [...(state.messages ?? []), action.payload];
    },
    messagesRead: (state, action) => {
      if (!action.payload || !state.messages) return; // Handle undefined or null payload or messages
      const { messageIds, readBy, readAt } = action.payload;
      if (!messageIds) return;

      state.messages = state.messages.map(msg => {
        if (messageIds.includes(msg._id)) {
          const newReadBy = msg.readBy ? [...msg.readBy] : [];
          if (!newReadBy.includes(readBy)) {
            newReadBy.push(readBy);
          }
          return { ...msg, readBy: newReadBy, updatedAt: readAt };
        }
        return msg;
      });
    },
    updateConversation: (state, action) => {
      if (!action.payload || !action.payload.conversationId || !action.payload.newMessage) return; // Handle undefined or null payload or properties
      const { conversationId, newMessage } = action.payload;
      const conversationIndex = state.conversations.findIndex(conv => conv._id === conversationId);
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex].messages.unshift(newMessage);
        state.conversations[conversationIndex].updatedAt = new Date().toISOString();
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessageThunk.pending, (state, action) => {
      state.buttonLoading = true;
      state.sendMessageStatus = 'pending';
    });
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      if (!action.payload) return; // Handle undefined or null payload
      const newMsg = action.payload?.responseData || action.payload;
      if (!newMsg?._id) return;

      const existingMessageIndex = (state.messages ?? []).findIndex(msg => msg._id === newMsg._id);

      if (existingMessageIndex !== -1) {
        // Replace existing message (e.g., placeholder with real message from server)
        state.messages[existingMessageIndex] = newMsg;
      } else {
        // Add new message
        state.messages = [...(state.messages ?? []), newMsg];
      }
      state.buttonLoading = false;
      state.sendMessageStatus = 'fulfilled';
    });
    builder.addCase(sendMessageThunk.rejected, (state, action) => {
      state.buttonLoading = false;
      state.sendMessageStatus = 'rejected';
    });

    // get messages
    builder.addCase(getMessageThunk.pending, (state, action) => {
      state.buttonLoading = true;
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      const messages = Array.isArray(action.payload?.responseData)
        ? action.payload.responseData
        : Array.isArray(action.payload)
        ? action.payload
        : [];
      const uniqueMessagesMap = new Map();
      messages.forEach((msg) => {
        uniqueMessagesMap.set(msg._id, msg);
      });
      state.messages = Array.from(uniqueMessagesMap.values());
      state.buttonLoading = false;
    });
    builder.addCase(getMessageThunk.rejected, (state, action) => {
      state.buttonLoading = false;
    });

    // get conversations
    builder.addCase(getConversationsThunk.fulfilled, (state, action) => {
      state.conversations = action.payload?.responseData ?? [];
    });
  },
});

export const {addMessage, messagesRead, updateConversation} = messageSlice.actions;

export default messageSlice.reducer;