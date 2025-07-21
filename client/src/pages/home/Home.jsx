import React, { useEffect, useState } from "react";
import UserSidebar from "./UserSidebar";
import MessageContainer from "./MessageContainer";
import { useDispatch, useSelector } from "react-redux";
import {initializeSocket, setOnlineUsers,} from "../../store/slice/socket/socket.slice";
import { setNewMessage } from "../../store/slice/message/message.slice";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { getMessageThunk } from "../../store/slice/message/message.thunk";

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
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;
    socket.on("onlineUsers", (onlineUsers) => {
      dispatch(setOnlineUsers(onlineUsers));
    });
    socket.on("newMessage", (newMessage) => {
      dispatch(setNewMessage(newMessage));
      // Fetch fresh messages for the selected user when a new message arrives
      if (selectedUser && selectedUser._id && (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id)) {
        console.log("Home.jsx: Dispatching getMessageThunk with otherParticipantId:", selectedUser._id);
        dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
      } else {
        console.log("Home.jsx: Skipping getMessageThunk due to missing selectedUser or _id", selectedUser);
      }
    });
    return () => {
      socket.close();
    };
  }, [socket, selectedUser, dispatch]);

  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      console.log("Home.jsx: selectedUser changed, fetching messages for:", selectedUser._id);
      dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
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
