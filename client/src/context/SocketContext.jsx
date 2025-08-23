import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userProfile?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    const backendUrl = trimTrailingSlash(import.meta.env.VITE_BACKEND_URL);
    
    const newSocket = io(backendUrl, {
      query: { userId: userProfile._id },
      transports: ['websocket', 'polling'],
    });

    newSocket.on("connect", () => console.log("Socket connected:", newSocket.id));
    newSocket.on("disconnect", () => console.log("Socket disconnected."));

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [userProfile?._id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
