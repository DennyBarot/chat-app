import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userProfile?._id) return;

    const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;
    const backendUrlRaw = import.meta.env.VITE_BACKEND_URL
    const backendUrl = trimTrailingSlash(backendUrlRaw);
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

    //reconnect event to handle reconnections
  newSocket.io.on("reconnect", () => {
    const event = new Event("socketReconnect");
    window.dispatchEvent(event);
  });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userProfile]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
