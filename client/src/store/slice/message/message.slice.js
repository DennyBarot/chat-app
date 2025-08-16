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
    setNewMessage: (state, action) => {
      const oldMessages = state.messages ?? [];
      // Check if the new message already exists
      const messageExists = oldMessages.some(msg => msg._id === action.payload._id);
      if (!messageExists) {
        state.messages = [...oldMessages, action.payload];
      }
      // If message exists, replace it to update
      else {
        state.messages = oldMessages.map(msg =>
          msg._id === action.payload._id ? action.payload : msg
        );
      }
    },
    messagesRead: (state, action) => {
      const { messageIds, readBy, readAt } = action.payload;
      if (!state.messages || !messageIds) return;

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
    }
  },
    extraReducers: (builder) => {
        builder.addCase(sendMessageThunk.pending, (state, _) => {
      state.buttonLoading = true;
      state.sendMessageStatus = 'pending';
    });
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      const oldMessages = state.messages ?? [];
      const newMsg = action.payload?.responseData || action.payload;
      if (!newMsg?._id) return;
      const filteredOldMessages = oldMessages.filter(
        (msg) => msg._id !== newMsg._id
      );
      state.messages = [...filteredOldMessages, newMsg];
      state.buttonLoading = false;
      state.sendMessageStatus = 'fulfilled';
    });
    builder.addCase(sendMessageThunk.rejected, (state, _) => {
      state.buttonLoading = false;
      state.sendMessageStatus = 'rejected';
    });

    // get messages
    builder.addCase(getMessageThunk.pending, (state, _) => {
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
    builder.addCase(getMessageThunk.rejected, (state, _) => {
      state.buttonLoading = false;
    });

    // get conversations
    builder.addCase(getConversationsThunk.fulfilled, (state, action) => {
      console.log("MessageSlice: Conversations received:", action.payload?.responseData);
      state.conversations = action.payload?.responseData ?? [];
    });
    builder.addCase(getConversationsThunk.rejected, (state, action) => {
      console.log("MessageSlice: Conversations fetch failed:", action.error);
      state.conversations = [];
    });
  },
});

export const {setNewMessage, messagesRead} = messageSlice.actions;

export default messageSlice.reducer;