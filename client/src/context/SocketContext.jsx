import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer || { userProfile: null });
  const [socket, setSocket] = useState(null);

    // Clean trailing slash from backend URL (shorter, no helper)
  const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '');


   const handleReconnect = () => {
    const event = new Event("socketReconnect");
    window.dispatchEvent(event);
   }

  useEffect(() => {
    if (!userProfile?._id) return;
       let isCleanup = false;
    const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;
    
    console.log("SocketContext - backendUrl:", backendUrl);

   const newSocket = io(backendUrl, {
  query: {
    userId: userProfile._id,
  },
  transports: ['websocket'], // ✅ prevent polling fallback
  forceNew: true,
  // Removed upgrade: false to allow upgrade from polling to websocket
   path: '/socket.io',  // ✅ prevent upgrade from websocket → polling
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

   // Custom event emitters for messagesRead/messageRead (if needed elsewhere in the app)
    const onMessageRead = (data) =>
      window.dispatchEvent(new CustomEvent("messageRead", { detail: data }));
    const onMessagesRead = (data) =>
      window.dispatchEvent(new CustomEvent("messagesRead", { detail: data }));
    newSocket.on("messageRead", onMessageRead);
    newSocket.on("messagesRead", onMessagesRead);

    // Reconnection logic
    newSocket.io.on("reconnect", handleReconnect);
      
      // Re-emit viewConversation on reconnection
     
        
           socket.emit('viewConversation', { conversationId, userId: userProfile._id });
      

    setSocket(newSocket);

    return () => {
      isCleanup = true;
      newSocket.off("messageRead", onMessageRead);
      newSocket.off("messagesRead", onMessagesRead);
      newSocket.io.off("reconnect", handleReconnect);
      newSocket.disconnect();
      setSocket(null);
    };
  }, [userProfile?._id]);
   const contextValue = useMemo(() => socket, [socket]);
  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

