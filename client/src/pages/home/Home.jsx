import React, { useEffect, useState } from "react";
import UserSidebar from "./UserSidebar";
import MessageContainer from "./MessageContainer";
import { useDispatch, useSelector } from "react-redux";
import {initializeSocket, setOnlineUsers,} from "../../store/slice/socket/socket.slice";
import { setNewMessage } from "../../store/slice/message/message.slice";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { getMessageThunk } from "../../store/slice/message/message.thunk";
import { getConversationsThunk } from "../../store/slice/message/message.thunk";

const Home = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, userProfile, selectedUser } = useSelector(
    (state) => state.userReducer
  );

  React.useEffect(() => {
    console.log("Home.jsx: selectedUser changed:", selectedUser);
  }, [selectedUser]);
  const { socket, onlineUsers } = useSelector((state) => state.socketReducer);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMessageContainer, setShowMessageContainer] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(initializeSocket(userProfile?._id));
    dispatch(getConversationsThunk());
  }, [isAuthenticated, userProfile?._id]);

  useEffect(() => {
    if (!socket) return;
    socket.on("onlineUsers", (onlineUsers) => {
      dispatch(setOnlineUsers(onlineUsers));
    });
    const handleNewMessage = (newMessage) => {
      dispatch(setNewMessage(newMessage));
      // Always fetch messages for the selected user for true real-time updates
      if (selectedUser && selectedUser._id) {
        dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
      }
    };
    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
   
    };
  }, [socket, selectedUser, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      console.warn("Home.jsx: getMessageThunk not dispatched, user not authenticated");
      return;
    }
    if (selectedUser && selectedUser._id) {
      console.log("Home.jsx: selectedUser changed, fetching messages for:", selectedUser._id);
      dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
    } else {
      // Prevent dispatch if selectedUser or _id is missing
      console.warn("Home.jsx: getMessageThunk not dispatched, selectedUser or _id missing", selectedUser);
    }
  }, [selectedUser, dispatch]);

  useEffect(() => {
    if (isMobile) {
      setShowMessageContainer(!!selectedUser);
    } else {
      setShowMessageContainer(true);
    }
  }, [isMobile, selectedUser]);

  const handleUserSelect = (user) => {
    // This can be used if you want to handle user select locally
    // But since selectedUser is from Redux, this might not be necessary
  };

  const handleBackToSidebar = () => {
    dispatch(setSelectedUser(null));
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {(!isMobile || !showMessageContainer) && (
        <UserSidebar />
      )}
      {(!isMobile || showMessageContainer) && (
        <MessageContainer onBack={handleBackToSidebar} isMobile={isMobile} />
      )}
    </div>
  );
};

export default Home;
