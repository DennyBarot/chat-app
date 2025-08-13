import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { initializeSocket, setOnlineUsers } from "../../store/slice/socket/socket.slice";
import { setNewMessage } from "../../store/slice/message/message.slice";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { getMessageThunk, getConversationsThunk } from "../../store/slice/message/message.thunk";
import UserSidebar from "./UserSidebar";
import MessageContainer from "./MessageContainer";

const Home = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, userProfile, selectedUser } = useSelector((state) => state.userReducer);
  const { socket, onlineUsers } = useSelector((state) => state.socketReducer);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMessageContainer, setShowMessageContainer] = useState(!isMobile);

  // Listen for window resize (debounce or throttle not needed for this simple case)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Always show messages on desktop, only show when selectedUser is set on mobile
  useEffect(() => {
    setShowMessageContainer(!isMobile || !!selectedUser);
  }, [isMobile, selectedUser]);

  // Init socket & fetch conversations on auth
  useEffect(() => {
    if (isAuthenticated && userProfile?._id) {
      dispatch(initializeSocket(userProfile._id));
      dispatch(getConversationsThunk());
    }
  }, [dispatch, isAuthenticated, userProfile?._id]);

  // Handle online users and new messages from socket
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (newMessage) => {
      // Dispatch new message to Redux and fetch latest if a user is selected
      dispatch(setNewMessage(newMessage));
      if (selectedUser?._id) {
        dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
      }
    };

    socket.on("onlineUsers", (users) => dispatch(setOnlineUsers(users)));
    socket.on("newMessage", handleMessage);
    return () => socket.off("newMessage", handleMessage);
  }, [socket, selectedUser, dispatch]);

  // If selectedUser changes, fetch messages (but only if authenticated)
  useEffect(() => {
    if (isAuthenticated && selectedUser?._id) {
      dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
    }
  }, [dispatch, isAuthenticated, selectedUser]);

  const handleBackToSidebar = useCallback(() => {
    dispatch(setSelectedUser(null));
  }, [dispatch]);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden">
      {(!isMobile || !showMessageContainer) && (
        <div className={`${isMobile ? "w-full" : "w-80"} transition-all duration-300`}>
          <UserSidebar />
        </div>
      )}
      {(!isMobile || showMessageContainer) && (
        <div className={`flex-1 transition-all duration-300 ${isMobile ? "w-full" : ""}`}>
          <MessageContainer onBack={handleBackToSidebar} isMobile={isMobile} />
        </div>
      )}
    </div>
  );
};

export default Home;
