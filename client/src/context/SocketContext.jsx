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

// Context
const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const dispatch = useDispatch();

  useEffect(() => {
    // Disconnect if user logged out
    if (!userProfile?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Do nothing if socket exists and is connected
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    const backendUrl = trimTrailingSlash(import.meta.env.VITE_BACKEND_URL);
    const newSocket = io(backendUrl, {
      query: { userId: userProfile._id },
      transports: ['websocket', 'polling'],
    });

    // --- Ensure event listeners are cleaned up! ---
    // For every `.on()`, add the corresponding `.off()` in cleanup

    const handleConnect = () => {
      dispatch(setMe(newSocket.id));
    };
    const handleDisconnect = () => {
      dispatch(setMe(""));
    };
    const handleConnectError = (error) => {
      // Optionally, handle error
    };
    const handleReconnect = () => {};

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.on("connect_error", handleConnectError);
    newSocket.on("reconnect", handleReconnect);

    newSocket.on("userStatusUpdate", (statusData) => {
      dispatch(updateUserStatus(statusData));
    });

    newSocket.on("onlineUsers", (onlineUserIds) => {
      onlineUserIds.forEach(userId => {
        dispatch(updateUserStatus({ userId, isOnline: true, lastSeen: new Date() }));
      });
    });

    newSocket.on("voiceRecordingStatus", (data) => {
      dispatch(updateUserStatus({ 
        userId: data.senderId, 
        isRecording: data.status === "recording",
        lastSeen: new Date()
      }));
    });

newSocket.on("call-user", (data) => {
  console.log("SocketContext: Incoming call from", data.from, "signal:", data.signal);
  dispatch(setReceivingCall(true));
  dispatch(setCaller(data.from));
  dispatch(setCallerSignal(data.signal));
  if (data.name) dispatch(setName(data.name));
});


    const handleCallAccepted = (data) => {
      dispatch(setCallAccepted(true));
      if (data.signal) {
        dispatch(setAnswerSignal(data.signal));
      }
    };

    const handleCallRejected = () => {
      dispatch(setCallEnded(true));
      dispatch(resetCallState());
    };

    const handleEndCall = () => {
      dispatch(setCallEnded(true));
      dispatch(resetCallState());
    };

    const handleIceCandidate = (data) => {
      dispatch(addIceCandidate(data.candidate));
    };

    newSocket.on("call-user", handleCallUser);
    newSocket.on("call-accepted", handleCallAccepted);
    newSocket.on("call-rejected", handleCallRejected);
    newSocket.on("end-call", handleEndCall);
    newSocket.on("ice-candidate", handleIceCandidate);

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      // Remove all listeners to avoid event duplication on remount
      if (newSocket) {
        newSocket.off("connect", handleConnect);
        newSocket.off("disconnect", handleDisconnect);
        newSocket.off("connect_error", handleConnectError);
        newSocket.off("reconnect", handleReconnect);

        newSocket.off("userStatusUpdate");
        newSocket.off("onlineUsers");
        newSocket.off("voiceRecordingStatus");

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

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
