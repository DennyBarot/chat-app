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

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    console.log("SocketContext - backendUrl:", backendUrl);

    const newSocket = io(backendUrl, {
      query: {
        userId: userProfile?._id,
      },
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id, "UserId:", userProfile?._id);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected:", newSocket.id, "UserId:", userProfile?._id);
    });

    // Add reconnect listener to fetch conversations on reconnect
    newSocket.on("connect", () => {
      console.log("Socket reconnected");
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
