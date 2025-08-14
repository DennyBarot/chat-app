import { createSlice } from "@reduxjs/toolkit";

const typingSlice = createSlice({
  name: "typing",
  initialState: {
    // userId: true/false
    typingUsers: {}, 
  },
  reducers: {
    setTyping: (state, action) => {
      const { userId, isTyping } = action.payload;
      state.typingUsers[userId] = isTyping;
    },
    clearTyping: (state, action) => {
      const { userId } = action.payload;
      delete state.typingUsers[userId];
    },
    // This reducer can be used to clear all typing indicators, e.g., on logout or conversation change
    clearAllTyping: (state) => {
      state.typingUsers = {};
    },
  },
});

export const { setTyping, clearTyping, clearAllTyping } = typingSlice.actions;
export default typingSlice.reducer;
