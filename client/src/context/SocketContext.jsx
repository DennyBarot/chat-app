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

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

const trimTrailingSlash = (url) => (url?.endsWith("/") ? url.slice(0, -1) : url);

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const dispatch = useDispatch();

  useEffect(() => {
    // Disconnect socket if user logged out
    if (!userProfile?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Avoid reconnect if already connected
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    const backendUrl = trimTrailingSlash(import.meta.env.VITE_BACKEND_URL);
    const newSocket = io(backendUrl, {
      query: { userId: userProfile._id },
      transports: ["websocket", "polling"],
    });

    // --- Define all handlers BEFORE adding listeners ---

    const handleConnect = () => {
      dispatch(setMe(newSocket.id));
      console.log("Socket connected:", newSocket.id);
    };

    const handleDisconnect = () => {
      dispatch(setMe(""));
      console.log("Socket disconnected.");
    };

    const handleConnectError = (error) => {
      console.error("Socket connection error:", error);
    };

    const handleReconnect = () => {
      console.log("Socket reconnected");
    };

    const handleUserStatusUpdate = (statusData) => {
      dispatch(updateUserStatus(statusData));
    };

    const handleOnlineUsers = (onlineUserIds) => {
      onlineUserIds.forEach((userId) => {
        dispatch(updateUserStatus({ userId, isOnline: true, lastSeen: new Date() }));
      });
    };

    const handleVoiceRecordingStatus = (data) => {
      dispatch(
        updateUserStatus({
          userId: data.senderId,
          isRecording: data.status === "recording",
          lastSeen: new Date(),
        })
      );
    };

    const handleCallUser = (data) => {
      console.log("Received incoming call:", data);
      dispatch(setReceivingCall(true));
      dispatch(setCaller(data.from));
      dispatch(setCallerSignal(data.signal));
      if (data.name) {
        dispatch(setName(data.name));
      }
    };

    const handleCallAccepted = (data) => {
      console.log("Call was accepted:", data);
      dispatch(setCallAccepted(true));
      if (data.signal) {
        dispatch(setAnswerSignal(data.signal));
      }
      // Add debug log for call accepted state
      console.log("Dispatching call accepted and setting answer signal");
    };

    const handleCallRejected = () => {
      console.log("Call was rejected");
      dispatch(setCallEnded(true));
      dispatch(resetCallState());
    };

    const handleEndCall = () => {
      console.log("Received end-call event, cleaning up call state");
      dispatch(setCallEnded(true));
      dispatch(resetCallState());
    };

    const handleIceCandidate = (data) => {
      console.log("Received ICE candidate:", data);
      dispatch(addIceCandidate(data.candidate));
    };

    // --- Add event listeners ---

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.on("connect_error", handleConnectError);
    newSocket.on("reconnect", handleReconnect);

    newSocket.on("userStatusUpdate", handleUserStatusUpdate);
    newSocket.on("onlineUsers", handleOnlineUsers);
    newSocket.on("voiceRecordingStatus", handleVoiceRecordingStatus);

    newSocket.on("call-user", handleCallUser);
    newSocket.on("call-accepted", handleCallAccepted);
    newSocket.on("call-rejected", handleCallRejected);
    newSocket.on("end-call", handleEndCall);
    newSocket.on("ice-candidate", handleIceCandidate);

    setSocket(newSocket);
    socketRef.current = newSocket;

    // --- Cleanup ---

    return () => {
      if (newSocket) {
        newSocket.off("connect", handleConnect);
        newSocket.off("disconnect", handleDisconnect);
        newSocket.off("connect_error", handleConnectError);
        newSocket.off("reconnect", handleReconnect);

        newSocket.off("userStatusUpdate", handleUserStatusUpdate);
        newSocket.off("onlineUsers", handleOnlineUsers);
        newSocket.off("voiceRecordingStatus", handleVoiceRecordingStatus);

        newSocket.off("call-user", handleCallUser);
        newSocket.off("call-accepted", handleCallAccepted);
        newSocket.off("call-rejected", handleCallRejected);
        newSocket.off("end-call", handleEndCall);
        newSocket.off("ice-candidate", handleIceCandidate);

        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [userProfile?._id, dispatch]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
