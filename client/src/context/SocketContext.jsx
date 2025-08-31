import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useSelector, useDispatch } from "react-redux";
import { updateUserStatus } from "../store/slice/user/user.slice";
import {
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
  setCaller,
  setCallerSignal,
  resetCallState,
  setMe,
  setAnswerSignal,
  addIceCandidate,
  setName,
} from "../store/slice/call/call.slice";

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

  const dispatch = useDispatch();

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

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      dispatch(setMe(newSocket.id));
    });
    newSocket.on("disconnect", () => {
      console.log("Socket disconnected.");
      dispatch(setMe(""));
    });
    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
    newSocket.on("reconnect", () => {
      console.log("Socket reconnected");
    });

    // Listen for user status updates
    newSocket.on("userStatusUpdate", (statusData) => {
      dispatch(updateUserStatus(statusData));
    });

    // Listen for online users list
    newSocket.on("onlineUsers", (onlineUserIds) => {
      // Update status for all online users
      onlineUserIds.forEach(userId => {
        dispatch(updateUserStatus({ userId, isOnline: true, lastSeen: new Date() }));
      });
    });

    // Listen for voice recording status
    newSocket.on("voiceRecordingStatus", (data) => {
      dispatch(updateUserStatus({ 
        userId: data.senderId, 
        isRecording: data.status === "recording",
        lastSeen: new Date()
      }));
    });

    // Call signaling events - handle both incoming calls and call acceptance
    newSocket.on("call-user", (data) => {
      console.log('Received incoming call:', data);
      dispatch(setReceivingCall(true));
      dispatch(setCaller(data.from));
      dispatch(setCallerSignal(data.signal));
      // Also set the caller's name for display
      if (data.name) {
        dispatch(setName(data.name));
      }
    });

    newSocket.on("call-accepted", (data) => {
      console.log('Call was accepted:', data);
      dispatch(setCallAccepted(true));
      // Handle the answer signal from the callee
      if (data.signal) {
        dispatch(setAnswerSignal(data.signal));
      }
    });

    newSocket.on("call-rejected", () => {
      console.log('Call was rejected');
      dispatch(setCallEnded(true));
      // Add a delay to ensure proper cleanup
      setTimeout(() => {
        dispatch(resetCallState());
      }, 2000);
    });

    newSocket.on("end-call", () => {
      console.log('Received end-call event, cleaning up call state');
      dispatch(setCallEnded(true));
      // Add a delay to ensure proper cleanup before resetting state
      setTimeout(() => {
        dispatch(resetCallState());
      }, 2000);
    });

    // Handle ICE candidates for WebRTC
    newSocket.on("ice-candidate", (data) => {
      console.log('Received ICE candidate:', data);
      dispatch(addIceCandidate(data.candidate));
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    // Cleanup on unmount.
    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [userProfile?._id, dispatch]);

  // 4. Provide the raw socket object as the value.
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};