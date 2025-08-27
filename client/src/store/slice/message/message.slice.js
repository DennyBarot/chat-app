import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, sendMessageThunk, getConversationsThunk, getOtherUsersThunk, createConversationThunk } from "./message.thunk";

const initialState = {
  buttonLoading: false,
  screenLoading: false,
  messages: {},
  conversations: [],
  otherUsers: [],
  sendMessageStatus: 'idle',
};

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setNewMessage: (state, action) => {
      const newMessage = action.payload;
      const { conversationId } = newMessage;
      if (state.messages[conversationId]) {
        const messageExists = state.messages[conversationId].some(msg => msg._id === newMessage._id);
        if (!messageExists) {
          state.messages[conversationId] = [...state.messages[conversationId], newMessage];
        }
      } else {
        state.messages[conversationId] = [newMessage];
      }
    },
    messagesRead: (state, action) => {
      const { messageIds, readBy, readAt, conversationId } = action.payload;
      if (!state.messages[conversationId] || !messageIds) return;

      state.messages[conversationId] = state.messages[conversationId].map(msg => {
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
    updateSingleConversation: (state, action) => {
        const updatedConversation = action.payload;
        const index = state.conversations.findIndex(c => c._id === updatedConversation._id);

        if (index !== -1) {
            state.conversations = [
                ...state.conversations.slice(0, index),
                updatedConversation,
                ...state.conversations.slice(index + 1),
            ];
        } else {
            state.conversations = [updatedConversation, ...state.conversations];
        }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessageThunk.pending, (state) => {
      state.buttonLoading = true;
      state.sendMessageStatus = 'pending';
    });
    builder.addCase(sendMessageThunk.fulfilled, (state) => {
      state.buttonLoading = false;
      state.sendMessageStatus = 'fulfilled';
    });
    builder.addCase(sendMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
      state.sendMessageStatus = 'rejected';
    });

    builder.addCase(getMessageThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      const { messages: fetchedMessages, currentPage, conversationId } = action.payload;
      if (currentPage === 1) {
        state.messages[conversationId] = fetchedMessages || [];
      } else {
        const existingMessages = state.messages[conversationId] || [];
        const uniqueNewMessages = fetchedMessages.filter(
          (newMessage) => !existingMessages.some((existing) => existing._id === newMessage._id)
        );
        state.messages[conversationId] = [...uniqueNewMessages, ...existingMessages];
      }
      state.buttonLoading = false;
    });
    builder.addCase(getMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(getConversationsThunk.fulfilled, (state, action) => {
      state.conversations = action.payload?.responseData ?? [];
    });

    builder.addCase(getOtherUsersThunk.fulfilled, (state, action) => {
      state.otherUsers = action.payload?.responseData ?? [];
    });

    builder.addCase(createConversationThunk.fulfilled, (state, action) => {
      const newConversation = action.payload;
      const index = state.conversations.findIndex(c => c._id === newConversation._id);
      if (index === -1) {
        state.conversations = [newConversation, ...state.conversations];
      }
    });
  },
});

export const { setNewMessage, messagesRead, updateSingleConversation } = messageSlice.actions;

export default messageSlice.reducer;