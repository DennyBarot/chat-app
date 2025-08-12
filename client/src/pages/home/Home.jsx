import React, { useEffect, useState } from "react";

import UserSidebar from "./UserSidebar";
import MessageContainer from "./MessageContainer";
import { useDispatch, useSelector } from "react-redux";
import { initializeSocket, setOnlineUsers } from "../../store/slice/socket/socket.slice";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { getConversationsThunk } from "../../store/slice/message/message.thunk";
// import Spinner from "../../components/Spinner";
import ErrorBoundary from "../../components/ErrorBoundary";


// Custom hook for window size (optional, but cleaner)
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return windowSize;
};

const Home = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, userProfile, selectedUser } = useSelector(
    (state) => state.userReducer
  );
  const { socket } = useSelector((state) => state.socketReducer);
  
  const { width } = useWindowSize();
  const isMobile = width <= 768;
  const [showMessageContainer, setShowMessageContainer] = useState(false);

  // Initialize socket and load conversations
  useEffect(() => {
    if (!isAuthenticated || !userProfile?._id) return;
    dispatch(initializeSocket(userProfile._id))
      .then(() => {})
      .finally(() => {});
    dispatch(getConversationsThunk());
  }, [isAuthenticated, userProfile?._id, dispatch]);

  // Listen for online users
  useEffect(() => {
    if (!socket) return;
    const handleOnlineUsers = (onlineUsers) => {
      dispatch(setOnlineUsers(onlineUsers));
    };
    socket.on("onlineUsers", handleOnlineUsers);
    return () => {
      socket?.off("onlineUsers", handleOnlineUsers);
    };
  }, [socket, dispatch]);

  // Mobile/desktop layout logic
  useEffect(() => {
    setShowMessageContainer(isMobile ? !!selectedUser : true);
  }, [isMobile, selectedUser]);

  const handleBackToSidebar = () => {
    dispatch(setSelectedUser(null));
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Sidebar - complementary landmark for accessibility */}
      {(!isMobile || !showMessageContainer) && (
        <aside
          className={`${isMobile ? 'w-full' : 'w-80'} transition-all duration-300`}
          aria-label="Conversation list"
        >
          <ErrorBoundary>
            <UserSidebar />
          </ErrorBoundary>
        </aside>
      )}

      {/* Main content - main landmark for accessibility */}
      {(!isMobile || showMessageContainer) && (
        <main
          className={`flex-1 transition-all duration-300 ${isMobile ? 'w-full' : ''}`}
          aria-label="Message area"
        >
          <ErrorBoundary>
            <MessageContainer onBack={handleBackToSidebar} isMobile={isMobile} />
          </ErrorBoundary>
        </main>
      )}
    </div>
  );
};



export default Home;
