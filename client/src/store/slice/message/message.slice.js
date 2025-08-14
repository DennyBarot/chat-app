import { createSlice } from "@reduxjs/toolkit";
import {
  getMessageThunk,
  sendMessageThunk,
  getConversationsThunk,
  markMessagesReadThunk,

} from "./message.thunk";

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
    // Adds a new message or updates an existing one in the messages array
    setNewMessage: (state, { payload }) => {
      if (!payload?._id) return;
      state.messages = state.messages ?? [];
      const existingIndex = state.messages.findIndex(msg => msg._id === payload._id);
      if (existingIndex >= 0) {
        // Update existing message
        state.messages[existingIndex] = payload;
      } else {
        // Add new message
        state.messages = [...state.messages, payload];
      }
    },
    // Mark messages as read by a specific user
    messagesRead: (state, { payload }) => {
      if (!payload?.messageIds?.length) return;
      const { messageIds, readBy, readAt, conversationId } = payload;

      // Update messages in the active conversation
      if (state.messages) {
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

      // Update unread count in the conversations list
      if (state.conversations) {
        const conversationIndex = state.conversations.findIndex(c => c._id === conversationId);
        if (conversationIndex !== -1) {
          const conversation = state.conversations[conversationIndex];
          const newMessages = conversation.messages.map(msg => {
            if (messageIds.includes(msg._id)) {
              const newReadBy = msg.readBy ? [...msg.readBy] : [];
              if (!newReadBy.includes(readBy)) {
                newReadBy.push(readBy);
              }
              return { ...msg, readBy: newReadBy, updatedAt: readAt };
            }
            return msg;
          });
          const newUnreadCount = newMessages.filter(
            (msg) => !msg.readBy.includes(readBy)
          ).length;
          state.conversations[conversationIndex] = {
            ...conversation,
            messages: newMessages,
            unreadCount: newUnreadCount,
            updatedAt: readAt,
          };
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Send message
    builder
      .addCase(sendMessageThunk.pending, (state) => {
        state.buttonLoading = true;
        state.sendMessageStatus = 'pending';
      })
      .addCase(sendMessageThunk.fulfilled, (state, { payload }) => {
        const newMsg = payload?.responseData ?? payload;
        if (!newMsg?._id) return;
        state.messages = state.messages ?? [];
        // Replace or add the new message (ensures uniqueness)
        const existingIndex = state.messages.findIndex(msg => msg._id === newMsg._id);
        if (existingIndex >= 0) {
          state.messages[existingIndex] = newMsg;
        } else {
          state.messages = [...state.messages, newMsg];
        }
        state.buttonLoading = false;
        state.sendMessageStatus = 'fulfilled';
      })
      .addCase(sendMessageThunk.rejected, (state) => {
        state.buttonLoading = false;
        state.sendMessageStatus = 'rejected';
      });

    // Get messages
    builder
      .addCase(getMessageThunk.pending, (state) => {
        state.buttonLoading = true;
      })
      .addCase(getMessageThunk.fulfilled, (state, { payload }) => {
        const messages = Array.isArray(payload?.responseData)
          ? payload.responseData
          : Array.isArray(payload)
          ? payload
          : [];
        // Normalize: ensure no duplicates, and order is preserved
        state.messages = messages.reduce((acc, msg) => {
          if (!acc.some(m => m._id === msg._id)) acc.push(msg);
          return acc;
        }, state.messages ? [...state.messages] : []);
        state.buttonLoading = false;
      })
      .addCase(getMessageThunk.rejected, (state) => {
        state.buttonLoading = false;
      });

    // Get conversations
    builder.addCase(getConversationsThunk.fulfilled, (state, { payload }) => {
      state.conversations = payload?.responseData ?? [];
    });
    
    
    // builder.addCase(markMessagesReadThunk.fulfilled, (state, { payload }) => {
    //   // If you want to handle something here after marking as read
    // });
  },
 updateReactions: (state, action) => {
    const { _id, reactions } = action.payload;
    if (state.messages) {
      const foundIndex = state.messages.findIndex(msg => msg._id === _id);
      if (foundIndex !== -1) {
        state.messages[foundIndex].reactions = reactions;
      }
    }
  },
  // in message.slice.js reducers:
updateConversation: (state, { payload }) => {
  const index = state.conversations.findIndex(c => c._id === payload._id);
  if (index !== -1) {
    state.conversations[index] = payload;
  }
}


});

export const { setNewMessage, messagesRead,updateReactions,updateConversation } = messageSlice.actions;
export default messageSlice.reducer;