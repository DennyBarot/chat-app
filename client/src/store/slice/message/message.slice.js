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
    setNewMessage: (state, { payload }) => {
      if (!payload?._id) return;
      state.messages = state.messages ?? [];
      const existingIndex = state.messages.findIndex(msg => msg._id === payload._id);
      if (existingIndex >= 0) {
        state.messages[existingIndex] = payload;
      } else {
        state.messages = [...state.messages, payload];
      }
    },
    messagesRead: (state, { payload }) => {
      if (!payload?.messageIds?.length) return;
      const { messageIds, readBy, readAt, conversationId } = payload;

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
    updateConversation: (state, { payload: newMessage }) => {
      const conversationId = newMessage.conversationId;
      const conversationIndex = state.conversations.findIndex(c => c._id === conversationId);

      if (conversationIndex !== -1) {
        const conversation = state.conversations[conversationIndex];
        conversation.lastMessage = newMessage;
        conversation.updatedAt = newMessage.createdAt;
        if (!conversation.messages.find(m => m._id === newMessage._id)) {
          conversation.messages.push(newMessage);
        }
        conversation.unreadCount = conversation.messages.filter(
          (msg) => !msg.readBy.includes(newMessage.senderId)
        ).length;
      } else {
        // If conversation is not found, we should probably fetch it
        // For now, we will just add it to the list
        // This part might need adjustment based on how conversations are loaded
        getConversationsThunk();
      }
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessageThunk.pending, (state) => {
        state.buttonLoading = true;
        state.sendMessageStatus = 'pending';
      })
      .addCase(sendMessageThunk.fulfilled, (state, { payload }) => {
        const newMsg = payload?.responseData ?? payload;
        if (!newMsg?._id) return;
        state.messages = state.messages ?? [];
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
        state.messages = messages.reduce((acc, msg) => {
          if (!acc.some(m => m._id === msg._id)) acc.push(msg);
          return acc;
        }, state.messages ? [...state.messages] : []);
        state.buttonLoading = false;
      })
      .addCase(getMessageThunk.rejected, (state) => {
        state.buttonLoading = false;
      });

    builder.addCase(getConversationsThunk.fulfilled, (state, { payload }) => {
      state.conversations = payload?.responseData ?? [];
    });
  },
});

export const { setNewMessage, messagesRead, updateReactions, updateConversation } = messageSlice.actions;
export default messageSlice.reducer;