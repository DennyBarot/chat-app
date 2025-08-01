import { createSlice } from "@reduxjs/toolkit";
import io from "socket.io-client";

const initialState = {
  socket: null,
  onlineUsers: null,
};

export const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    initializeSocket: (state, action) => {
      const socket = io(import.meta.env.VITE_DB_ORIGIN, {
        query: {
          userId: action.payload,
        },
      });
      state.socket = socket;
    },

    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
   
    disconnectSocket: (state) => {
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
  state.onlineUsers = null;
},

  },
});

export const { initializeSocket, setOnlineUsers,disconnectSocket } = socketSlice.actions;

export default socketSlice.reducer;