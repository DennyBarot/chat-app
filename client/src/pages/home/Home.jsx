import React, { useEffect, useState, useCallback } from "react";
import UserSidebar from "./UserSidebar";
import MessageContainer from "./MessageContainer";
import { useDispatch, useSelector } from "react-redux";
import { setOnlineUsers } from "../../store/slice/socket/socket.slice";
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
  const { socket } = useSelector((state) => state.socketReducer);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMessageContainer, setShowMessageContainer] = useState(false);

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (!isAuthenticated || !userProfile?._id) return;
    dispatch(getConversationsThunk());
  }, [isAuthenticated, userProfile?._id, dispatch]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (newMessage) => {
      console.log("Home.jsx: Received newMessage socket event:", newMessage);
      dispatch(setNewMessage(newMessage));
    };
    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
   
    };
  }, [socket, dispatch]);

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
  }, [selectedUser, dispatch, isAuthenticated]);

  useEffect(() => {
    if (isMobile) {
      setShowMessageContainer(!!selectedUser);
    } else {
      setShowMessageContainer(true);
    }
  }, [isMobile, selectedUser]);

  const handleBackToSidebar = useCallback(() => {
    dispatch(setSelectedUser(null));
  }, [dispatch]);

  return (
  <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden">

  {(!isMobile || !showMessageContainer) && (
    <div className={`${isMobile ? 'w-full' : 'w-80'} transition-all duration-300`}>
      <UserSidebar />
    </div>
  )}

  {(!isMobile || showMessageContainer) && (
    <div className={`flex-1 transition-all duration-300 ${isMobile ? 'w-full' : ''}`}>
      <MessageContainer onBack={handleBackToSidebar} isMobile={isMobile} />
    </div>
  )}

</div>

  );
};

export default Home;
