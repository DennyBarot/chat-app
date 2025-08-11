import React, { useEffect, useState } from "react";
import UserSidebar from "./UserSidebar";
import MessageContainer from "./MessageContainer";
import { useDispatch, useSelector } from "react-redux";
import {initializeSocket, setOnlineUsers,} from "../../store/slice/socket/socket.slice";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { getConversationsThunk } from "../../store/slice/message/message.thunk";

const Home = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, userProfile, selectedUser } = useSelector(
    (state) => state.userReducer
  );

  const { socket } = useSelector((state) => state.socketReducer);

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
    if (!isAuthenticated || !userProfile?._id) return;
    dispatch(initializeSocket(userProfile._id));
    dispatch(getConversationsThunk());
  }, [isAuthenticated, userProfile?._id, dispatch]);

  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (onlineUsers) => {
      dispatch(setOnlineUsers(onlineUsers));
    };

    socket.on("onlineUsers", handleOnlineUsers);

    return () => {
      socket.off("onlineUsers", handleOnlineUsers);
    };
  }, [socket, dispatch]);

  useEffect(() => {
    if (isMobile) {
      setShowMessageContainer(!!selectedUser);
    } else {
      setShowMessageContainer(true);
    }
  }, [isMobile, selectedUser]);

  const handleBackToSidebar = () => {
    dispatch(setSelectedUser(null));
  };

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