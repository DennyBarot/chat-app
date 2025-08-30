import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slice/user/user.slice";
import messageReducer from "./slice/message/message.slice";
import socketReducer from "./slice/socket/socket.slice";
import typingReducer from "./slice/typing/typing.slice";
import callReducer from "./slice/call/call.slice";

export const store = configureStore({
  reducer: {
    userReducer,
    messageReducer,
    socketReducer,
    typingReducer,
    callReducer,
  },
  middleware: (getDefaultMiddlware) =>
    getDefaultMiddlware({
      serializableCheck: {
        ignoredPaths: ["socketReducer.socket"],
      },
    }),
});
