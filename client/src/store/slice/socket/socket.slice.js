import { createSlice } from "@reduxjs/toolkit";
import io from "socket.io-client";


const initialState = {
  socket: null,
  // Track connection status for UI feedback
  isConnected: false,
  // Track online users (as array or map, depending on your UI)
  onlineUsers: null,
};

export const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    /**
     * Initialize socket.io connection for the current user.
     * Only creates a new socket if none exists, unless forced.
     * @param {Object} state - Redux state
     * @param {Object} action - { payload: userId, meta: { forceReconnect?: boolean } }
     */
    initializeSocket: (state, action) => {
      if (state.socket && !action.meta?.forceReconnect) {
        // Avoid duplicate sockets unless explicitly asked to reconnect
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (!backendUrl) {
        console.error("VITE_BACKEND_URL is missing from environment");
        return;
      }

      // Clean up any existing socket (important for hot reload, logout, etc.)
      if (state.socket) {
        state.socket.disconnect();
      }

      // Initialize new socket with user ID in query
      state.socket = io(backendUrl, {
        query: {
          userId: action.payload,
        },
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });

      // Optionally track connection state
      state.socket.on("connect", () => {
        /* Update isConnected via extraReducers or in your component if needed */
      });
      state.socket.on("disconnect", () => {
        /* Update isConnected via extraReducers or in your component if needed */
      });
    },

    /**
     * Disconnect the current socket.
     */
    disconnectSocket: (state) => {
      if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
        state.isConnected = false;
      }
    },

    /**
     * Update the list of online users.
     * @param {Object} state - Redux state
     * @param {Object[]} action.payload - Array of user IDs
     */
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },

    /**
     * Optional: Set socket connection state (call from socket event handlers)
     */
    setSocketConnected: (state, action) => {
      state.isConnected = action.payload;
    },
  },
});

export const { initializeSocket, setOnlineUsers, disconnectSocket, setSocketConnected } = socketSlice.actions;
export default socketSlice.reducer;