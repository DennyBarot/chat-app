import { createSlice } from "@reduxjs/toolkit";
import io from "socket.io-client";

const initialState = {
  socket: null,
  onlineUsers: null,
    typingUsers: {},
};

export const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    // Initialize socket connection with the user's ID
    // Prevents double-connection if socket already exists
    initializeSocket: (state, { payload: userId }) => {
      if (state.socket?.connected) return;
      const socket = io(import.meta.env.VITE_BACKEND_URL || "", {
        query: { userId },
        transports: ["websocket"],
        path: "/socket.io",
      });
      state.socket = socket;
    },

    // Update the list of online users
    setOnlineUsers: (state, { payload }) => {
      state.onlineUsers = payload;
    },

    // Optional: Manually disconnect the socket
    disconnectSocket: (state) => {
      if (state.socket?.connected) {
        state.socket.disconnect();
      }
      state.socket = null;
    },
    setTypingUser: (state, { payload }) => {
    const { conversationId, userId, isTyping } = payload;
    if (isTyping) {
      // Start typing
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (!state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      }
    } else {
      // Stop typing
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          id => id !== userId
        );
        if (state.typingUsers[conversationId].length === 0) {
          delete state.typingUsers[conversationId];
        }
      }
    }
  }

  },
});

export const { initializeSocket, setOnlineUsers, disconnectSocket } = socketSlice.actions;
export default socketSlice.reducer;
