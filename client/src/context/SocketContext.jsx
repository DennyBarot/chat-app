import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { setOnlineUsers as setOnlineUsersRedux } from "../store/slice/socket/socket.slice";
import { messagesRead } from "../store/slice/message/message.slice";

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer || { userProfile: null });
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsersState] = useState([]);
  const socketRef = useRef(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userProfile?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    if (socketRef.current && socketRef.current.connected && socketRef.current.io.opts.query.userId === userProfile._id) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const backendUrlRaw = import.meta.env.VITE_BACKEND_URL;
    const backendUrl = trimTrailingSlash(backendUrlRaw);
    console.log("SocketContext - backendUrl:", backendUrl);

    const newSocket = io(backendUrl, {
      query: {
        userId: userProfile._id,
      },
      transports: ['websocket', 'polling'],
      forceNew: false,
      path: '/socket.io',
    });

    newSocket.io.on("packet", (packet) => {
      console.log("Socket packet event:", packet);
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id, "UserId:", userProfile?._id);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected:", newSocket.id, "UserId:", userProfile?._id);
    });

    newSocket.on("newMessage", (message) => {
      console.log("New message received via socket:", message);
      const event = new CustomEvent("newMessage", { detail: message });
      window.dispatchEvent(event);
    });

    newSocket.on("messageRead", (data) => {
      console.log("Message read event received:", data);
      const event = new CustomEvent("messageRead", { detail: data });
      window.dispatchEvent(event);
    });
   
    newSocket.on("messagesRead", (data) => {
      console.log("Messages read event received:", data);
      const event = new CustomEvent("messagesRead", { detail: data });
      window.dispatchEvent(event);
      dispatch(messagesRead({ 
        messageIds: data.messageIds, 
        readBy: data.readBy, 
        readAt: data.readAt 
      }));
    });

    newSocket.on("onlineUsers", (users) => {
      setOnlineUsersState(users);
      dispatch(setOnlineUsersRedux(users));
    });

    newSocket.io.on("reconnect", () => {
      const event = new Event("socketReconnect");
      window.dispatchEvent(event);

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
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [userProfile?._id, dispatch]);

  return (
    <SocketContext.Provider value={{socket, onlineUsers}}>
      {children}
    </SocketContext.Provider>
  );
};

