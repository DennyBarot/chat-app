import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import { useSelector, useDispatch } from "react-redux";
import { updateUserStatus } from "../store/slice/user/user.slice";
import { setIncomingCall, setLocalStream, setRemoteStream, closeCallModal } from "../store/slice/call/call.slice";

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
  const { incomingCall } = useSelector((state) => state.callReducer);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const dispatch = useDispatch();

  useEffect(() => {
    // Disconnect if the user is not logged in.
    if (!userProfile?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
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

    // WebRTC call events
    newSocket.on("incoming-call", ({ callerId, offer }) => {
      // Find caller info from user list or assume it's passed
      dispatch(setIncomingCall({ callerId, callerName: "Caller", offer }));
    });

    newSocket.on("call-accepted", ({ answer }) => {
      if (peerRef.current) {
        peerRef.current.signal(answer);
      }
    });

    newSocket.on("ice-candidate", ({ candidate }) => {
      if (peerRef.current) {
        peerRef.current.signal(candidate);
      }
    });

    newSocket.on("call-ended", () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      dispatch(closeCallModal());
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    // Cleanup on unmount.
    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [userProfile?._id, dispatch]);

  const initiateCall = async (receiverId, callType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      localStreamRef.current = stream;
      dispatch(setLocalStream(stream));

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      peerRef.current = peer;

      peer.on('signal', (data) => {
        socketRef.current.emit('call-user', { receiverId, offer: data });
      });

      peer.on('stream', (remoteStream) => {
        dispatch(setRemoteStream(remoteStream));
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
      });

    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const acceptCall = async (callerId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true, // Assume video for now
        audio: true,
      });
      localStreamRef.current = stream;
      dispatch(setLocalStream(stream));

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      peerRef.current = peer;

      peer.on('signal', (data) => {
        socketRef.current.emit('call-accepted', { callerId, answer: data });
      });

      peer.on('stream', (remoteStream) => {
        dispatch(setRemoteStream(remoteStream));
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
      });

      // Signal the offer
      if (incomingCall && incomingCall.offer) {
        peer.signal(incomingCall.offer);
      }

    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    dispatch(closeCallModal());
  };

  // 4. Provide the socket object and call functions.
  const value = {
    socket,
    initiateCall,
    acceptCall,
    endCall,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
