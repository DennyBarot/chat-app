import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, sendMessageThunk, getConversationsThunk } from "./message.thunk";

const initialState = {
  buttonLoading: false,
  screenLoading: false,
  messages: null,
  conversations: [],
  sendMessageStatus: 'idle', // new state to track sendMessageThunk status
};

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setNewMessage: (state, action) => {
      const oldMessages = state.messages ?? [];
      // Filter out duplicates by _id
      const filteredOldMessages = oldMessages.filter(
        (msg) => msg._id !== action.payload._id
      );
      state.messages = [...filteredOldMessages, action.payload];
    },
  },
  extraReducers: (builder) => {
    // send message
    builder.addCase(sendMessageThunk.pending, (state, action) => {
      state.buttonLoading = true;
      state.sendMessageStatus = 'pending';
    });
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      const oldMessages = state.messages ?? [];
      // Filter out duplicates by _id
      const filteredOldMessages = oldMessages.filter(
        (msg) => msg._id !== action.payload?.responseData?._id
      );
      state.messages = [...filteredOldMessages, action.payload?.responseData];
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
      // Filter duplicates by _id
      const messages = action.payload?.responseData?.messages ?? [];
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
