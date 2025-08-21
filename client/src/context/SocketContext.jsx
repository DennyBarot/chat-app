import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { setOnlineUsers } from "../store/slice/socket/socket.slice";
import { setNewMessage, messagesRead } from "../store/slice/message/message.slice";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

const trimTrailingSlash = (url) => url?.endsWith('/') ? url.slice(0, -1) : url;

export const SocketProvider = ({ children }) => {
  const { userProfile } = useSelector((state) => state.userReducer || { userProfile: null });
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null); // Use a ref to hold the socket instance
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userProfile?._id) {
      // Disconnect existing socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Only create a new socket if one doesn't exist or userProfile changes
    if (socketRef.current && socketRef.current.connected && socketRef.current.io.opts.query.userId === userProfile._id) {
      // Socket already exists and is connected for the current user, do nothing
      return;
    }

    // Disconnect existing socket before creating a new one if userProfile changes
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const backendUrlRaw = import.meta.env.VITE_BACKEND_URL;
    const backendUrl = trimTrailingSlash(backendUrlRaw);
    console.log("SocketContext - backendUrl:", backendUrl);

    const newSocket = io(backendUrl, {
      query: {
        userId: userProfile._id,
      },
      transports: ['websocket'],
      forceNew: true, // Ensure a new connection when userProfile changes
      path: '/socket.io',
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

    newSocket.on("newMessage", (message) => {
      console.log("New message received via socket:", message);
      // Directly dispatch to Redux store instead of using CustomEvents
      dispatch(setNewMessage(message));
    });

    newSocket.on("messageRead", (data) => {
      console.log("Message read event received:", data);
      dispatch(messagesRead({ 
        messageIds: data.messageIds, 
        readBy: data.readBy, 
        readAt: data.readAt 
      }));
    });
   
    newSocket.on("messagesRead", (data) => {
      console.log("Messages read event received:", data);
      dispatch(messagesRead({ 
        messageIds: data.messageIds, 
        readBy: data.readBy, 
        readAt: data.readAt 
      }));
    });


    newSocket.on("onlineUsers", (onlineUsers) => {
      console.log("Online users received:", onlineUsers);
      dispatch(setOnlineUsers(onlineUsers));
    });

    newSocket.io.on("reconnect", () => {
      const event = new Event("socketReconnect");
      window.dispatchEvent(event);

      // Re-emit viewConversation on reconnection
      // Use newSocket.handshake.query.userId as it's the current socket's query
      const userId = newSocket.handshake.query.userId;
      if (userId) {
        const pathParts = window.location.pathname.split('/');
        const conversationId = pathParts[pathParts.length - 1];

        if (conversationId && conversationId !== 'home') {
          // Use newSocket here, not the state 'socket' which might be null or outdated
          newSocket.emit('viewConversation', {
            conversationId,
            userId
          });
        }
      }
    });

    setSocket(newSocket);
    socketRef.current = newSocket; // Store in ref

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [userProfile, dispatch]); // Only userProfile in dependency array

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

