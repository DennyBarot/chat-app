import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slice/user/user.slice.js";
import messageReducer from "./slice/message/message.slice.js";
import socketReducer from "./slice/socket/socket.slice.js";

export const store = configureStore({
  reducer: {
    userReducer,
    messageReducer,
    socketReducer,
  },
  middleware: (getDefaultMiddlware) =>
    getDefaultMiddlware({
      serializableCheck: {
        ignoredPaths: ["socketReducer.socket"],
      },
    }),
});