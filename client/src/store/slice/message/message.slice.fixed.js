import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, getConversationsThunk } from "./message.thunk";

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
    builder.addCase(getMessageThunk.pending, (state, action) => {
      state.buttonLoading = true;
      state.sendMessageStatus = 'pending';
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      // Handle both old format (array) and new format (object with messages array)
      let messages = [];
      
      if (Array.isArray(action.payload)) {
        // Old format - direct array
        messages = action.payload;
      } else if (action.payload?.messages) {
        // New format - paginated response
        messages = action.payload.messages;
      } else if (Array.isArray(action.payload?.responseData)) {
        // Another possible format
        messages = action.payload.responseData;
      } else {
        // Fallback
        messages = action.payload || [];
      }

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

export const {setNewMessage, messagesRead} = messageSlice.actions;
export default messageSlice.reducer;
