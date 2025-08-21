import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { setOnlineUsers } from "../store/slice/socket/socket.slice";
import { setNewMessage, messagesRead } from "../store/slice/message/message.slice";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer || { userProfile: null });
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userProfile?._id) {
      // Disconnect existing socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Only create a new socket if one doesn't exist or userProfile changes
    if (socketRef.current && socketRef.current.connected && socketRef.current.io.opts.query.userId === userProfile._id) {
      return;
    }

    // Disconnect existing socket before creating a new one if userProfile changes
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const backendUrlRaw = import.meta.env.VITE_BACKEND_URL;
    const backendUrl = trimTrailingSlash(backendUrlRaw);
    console.log("SocketContext - Connecting to backend:", backendUrl);

    const newSocket = io(backendUrl, {
      query: {
        userId: userProfile._id,
      },
      transports: ['websocket', 'polling'], // Allow fallback to polling
      forceNew: true,
      path: '/socket.io',
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id, "UserId:", userProfile?._id);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason, "UserId:", userProfile?._id);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Direct Redux dispatch for socket events
    newSocket.on("newMessage", (message) => {
      console.log("📨 New message received via socket:", message);
      dispatch(setNewMessage(message));
    });

    newSocket.on("messagesRead", (data) => {
      console.log("👀 Messages read event received:", data);
      dispatch(messagesRead(data));
    });

    newSocket.on("onlineUsers", (onlineUsers) => {
      console.log("👥 Online users received:", onlineUsers);
      dispatch(setOnlineUsers(onlineUsers));
    });

    newSocket.io.on("reconnect", () => {
      console.log("🔄 Socket reconnected");
      // Re-emit viewConversation on reconnection if needed
      const userId = newSocket.handshake.query.userId;
      if (userId) {
        const pathParts = window.location.pathname.split('/');
        const conversationId = pathParts[pathParts.length - 1];
        if (conversationId && conversationId !== 'home') {
          newSocket.emit('viewConversation', {
            conversationId,
            userId
          });
        }
      }
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [userProfile, dispatch]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

