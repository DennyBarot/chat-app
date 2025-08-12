import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, sendMessageThunk, getConversationsThunk } from "./message.thunk";

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
      if (!action.payload) return; //
      state.messages = [...(state.messages ?? []), action.payload];
    },
    messagesRead(state, action) {
      if (!action.payload?.messageIds || !state.messages) return;
      const { messageIds, readBy, readAt } = action.payload;
      state.messages = state.messages.map((msg) => {
        if (messageIds.includes(msg._id)) {
          const newReadBy = [...(msg.readBy || [])];
          if (!newReadBy.includes(readBy)) {
            newReadBy.push(readBy);
          }
          return { ...msg, readBy: newReadBy, updatedAt: readAt };
        }
        return msg;
      });
    },
      updateConversation(state, action) {
      if (!action.payload?.conversationId || !action.payload?.newMessage) return;
      const { conversationId, newMessage } = action.payload;
      const conversationIndex = state.conversations.findIndex(
        (conv) => conv._id === conversationId
      );
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex] = {
          ...state.conversations[conversationIndex],
          messages: [
            newMessage,
            ...(state.conversations[conversationIndex].messages || []),
          ],
          updatedAt: new Date().toISOString(),
        };
      }
    },
  },
   extraReducers: (builder) => {
    // Send message
    builder
      .addCase(sendMessageThunk.pending, (state) => {
        state.buttonLoading = true;
        state.sendMessageStatus = "pending";
      })
      .addCase(sendMessageThunk.fulfilled, (state, action) => {
        const newMsg = action.payload?.responseData || action.payload;
        if (!newMsg?._id) {
          state.buttonLoading = false;
          state.sendMessageStatus = "rejected"; // Or 'idle' if you want
          return;
        }
        const existingIndex = (state.messages ?? []).findIndex(
          (msg) => msg._id === newMsg._id
        );
        if (existingIndex !== -1) {
          // Replace optimistic message with server response
          state.messages = state.messages.map((msg, idx) =>
            idx === existingIndex ? newMsg : msg
          );
        } else {
          state.messages = [...(state.messages ?? []), newMsg];
        }
        state.buttonLoading = false;
        state.sendMessageStatus = "fulfilled";
      })
      .addCase(sendMessageThunk.rejected, (state) => {
        state.buttonLoading = false;
        state.sendMessageStatus = "rejected";
      });

    // Get messages
    builder
      .addCase(getMessageThunk.pending, (state) => {
        state.buttonLoading = true;
      })
      .addCase(getMessageThunk.fulfilled, (state, action) => {
        const messages = Array.isArray(action.payload?.responseData)
          ? action.payload.responseData
          : Array.isArray(action.payload)
          ? action.payload
          : [];
        // Dedupe by ID (if needed)
        const uniqueMap = new Map(messages.map((msg) => [msg._id, msg]));
        state.messages = Array.from(uniqueMap.values());
        state.buttonLoading = false;
      })
      .addCase(getMessageThunk.rejected, (state) => {
        state.buttonLoading = false;
      });

    // Get conversations
    builder.addCase(getConversationsThunk.fulfilled, (state, action) => {
      state.conversations = action.payload?.responseData ?? [];
    });
  },
});

export const {addMessage, messagesRead, updateConversation} = messageSlice.actions;

export default messageSlice.reducer;