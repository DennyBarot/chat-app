import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, sendMessageThunk, getConversationsThunk, getOtherUsersThunk } from "./message.thunk";

const initialState = {
  buttonLoading: false,
  screenLoading: false,
  messages: null,
  conversations: [],
  otherUsers: [],
  sendMessageStatus: 'idle', 
};

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setNewMessage: (state, action) => {
      const oldMessages = state.messages ?? [];
      const messageExists = oldMessages.some(msg => msg._id === action.payload._id);
      if (!messageExists) {
        state.messages = [...oldMessages, action.payload];
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
    },
    // --- NEW REDUCER for handling real-time conversation updates ---
    updateSingleConversation: (state, action) => {
        const updatedConversation = action.payload;
        const index = state.conversations.findIndex(c => c._id === updatedConversation._id);

        if (index !== -1) {
            // If conversation exists, update it
            state.conversations[index] = updatedConversation;
        } else {
            // If it's a new conversation, add it to the top
            state.conversations.unshift(updatedConversation);
        }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessageThunk.pending, (state) => {
      state.buttonLoading = true;
      state.sendMessageStatus = 'pending';
    });
    // The message is added via socket, so we only need to handle loading state here
    builder.addCase(sendMessageThunk.fulfilled, (state) => {
      state.buttonLoading = false;
      state.sendMessageStatus = 'fulfilled';
    });
    builder.addCase(sendMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
      state.sendMessageStatus = 'rejected';
    });

    // get messages
    builder.addCase(getMessageThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      const { messages: fetchedMessages, currentPage } = action.payload;
      if (currentPage === 1) {
        state.messages = fetchedMessages || [];
      } else {
        const existingMessages = state.messages || [];
        const uniqueNewMessages = fetchedMessages.filter(
          (newMessage) => !existingMessages.some((existing) => existing._id === newMessage._id)
        );
        state.messages = [...uniqueNewMessages, ...existingMessages];
      }
      state.buttonLoading = false;
    });
    builder.addCase(getMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    // get conversations (only for initial load now)
    builder.addCase(getConversationsThunk.fulfilled, (state, action) => {
      state.conversations = action.payload?.responseData ?? [];
    });

    // get other users
    builder.addCase(getOtherUsersThunk.fulfilled, (state, action) => {
      state.otherUsers = action.payload?.responseData ?? [];
    });
  },
});

// Export the new action
export const { setNewMessage, messagesRead, updateSingleConversation } = messageSlice.actions;

export default messageSlice.reducer;
