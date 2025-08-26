import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import WebRTCManager from "../utils/webrtcManager";

// 1. Create the context with a default value of null.
const SocketContext = createContext(null);

// 2. Create a clean, reusable hook to access the context.
export const useSocket = () => {
  return useContext(SocketContext);
};

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

// 3. The provider's ONLY job is to create and manage the socket connection.
export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const webRTCManager = useRef(new WebRTCManager()).current;

  useEffect(() => {
    // Disconnect if the user is not logged in.
    if (!userProfile?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Do nothing if a valid connection already exists.
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

    // Make WebRTCManager globally available for message components
    window.webRTCManager = webRTCManager;

    // Handle WebRTC signaling
    newSocket.on('webrtc-signal', (data) => {
      const { type, offer, answer, candidate, targetUserId } = data;

      if (type === 'offer') {
        webRTCManager.handleOffer(offer, targetUserId, newSocket);
      } else if (type === 'answer') {
        webRTCManager.handleAnswer(answer, targetUserId);
      } else if (type === 'ice-candidate') {
        webRTCManager.handleIceCandidate(candidate, targetUserId);
      }
    });

    // Cleanup on unmount.
    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [userProfile?._id]);

  // 4. Provide the raw socket object as the value.
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
