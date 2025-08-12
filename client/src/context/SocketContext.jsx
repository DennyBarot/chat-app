import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { trimTrailingSlash } from "../utils/stringUtils";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer || { userProfile: null });
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userProfile?._id) return;

    const backendUrlRaw = import.meta.env.VITE_BACKEND_URL
    const backendUrl = trimTrailingSlash(backendUrlRaw);

    const newSocket = io(backendUrl, {
      query: {
        userId: userProfile._id,
      },
      transports: ['websocket'],
      forceNew: true,
      path: '/socket.io',
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id, "UserId:", userProfile?._id);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected:", newSocket.id, "UserId:", userProfile?._id);
    });

    newSocket.on("messageRead", (data) => {
      const event = new CustomEvent("messageRead", { detail: data });
      window.dispatchEvent(event);
    });

    newSocket.on("messagesRead", (data) => {
      const event = new CustomEvent("messagesRead", { detail: data });
      window.dispatchEvent(event);
    });

    newSocket.io.on("reconnect", () => {
      const event = new Event("socketReconnect");
      window.dispatchEvent(event);
      
      const userId = newSocket.handshake.query.userId;
      if (userId) {
        const pathParts = window.location.pathname.split('/');
        const conversationId = pathParts[pathParts.length - 1];
        
        if (conversationId && conversationId !== 'home') {
          socket.emit('viewConversation', { 
            conversationId, 
            userId 
          });
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [userProfile?._id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};