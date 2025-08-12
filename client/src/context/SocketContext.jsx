import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { trimTrailingSlash } from "../utils/stringUtils";
import PropTypes from "prop-types";

export const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer || { userProfile: null });
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userProfile?._id) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const backendUrlRaw = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrlRaw) {
      console.error("VITE_BACKEND_URL is missing in env");
      return;
    }
    const backendUrl = trimTrailingSlash(backendUrlRaw);

    const newSocket = io(backendUrl, {
      query: { userId: userProfile._id },
      transports: ['websocket'],
      forceNew: true,
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const handleConnect = () => {
      setIsConnected(true);
      console.log("Socket connected:", newSocket.id, "UserId:", userProfile._id);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log("Socket disconnected:", newSocket.id, "UserId:", userProfile._id);
    };

    const handleMessageRead = (data) => {
      window.dispatchEvent(new CustomEvent("messageRead", { detail: data }));
    };

    const handleMessagesRead = (data) => {
      window.dispatchEvent(new CustomEvent("messagesRead", { detail: data }));
    };

    const handleError = (err) => {
      console.error("Socket error:", err);
      // toast.error("Connection lost—retrying...");
    };

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.on("messageRead", handleMessageRead);
    newSocket.on("messagesRead", handleMessagesRead);
    newSocket.on("connect_error", handleError);
    newSocket.on("error", handleError);

    newSocket.io.on("reconnect", () => {
      window.dispatchEvent(new Event("socketReconnect"));
      const userId = newSocket.handshake.query.userId;
      if (userId) {
        const pathParts = window.location.pathname.split('/');
        const conversationId = pathParts[pathParts.length - 1];
        if (conversationId && conversationId !== 'home') {
          newSocket.emit('viewConversation', { conversationId, userId });
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.off("messageRead", handleMessageRead);
      newSocket.off("messagesRead", handleMessagesRead);
      newSocket.off("connect_error", handleError);
      newSocket.off("error", handleError);
      newSocket.io.off("reconnect");
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [userProfile?._id]);

  const providerValue = useMemo(
    () => ({ socket, isConnected }),
    [socket, isConnected]
  );

  return (
    <SocketContext.Provider value={providerValue}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
