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
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessageThunk.pending, (state, action) => {
      state.buttonLoading = true;
      state.sendMessageStatus = 'pending';
    });
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      const oldMessages = state.messages ?? [];
      // Support both {responseData: {...}} and direct message object
      const newMsg = action.payload?.responseData || action.payload;
      if (!newMsg?._id) return;
      const filteredOldMessages = oldMessages.filter(
        (msg) => msg._id !== newMsg._id
      );
      state.messages = [...filteredOldMessages, newMsg];
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
      // Support both {responseData: [...]} and direct array
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

export const {setNewMessage} = messageSlice.actions;

export default messageSlice.reducer;
