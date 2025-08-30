import React, { useEffect, useState, useCallback } from "react";
import UserSidebar from "./UserSidebar";
import MessageContainer from "./MessageContainer";
import CallModal from "../../components/CallModal";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { getConversationsThunk, getOtherUsersThunk } from "../../store/slice/message/message.thunk";

const Home = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, userProfile, selectedUser } = useSelector((state) => state.userReducer);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMessageContainer, setShowMessageContainer] = useState(false);

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Initial data fetch when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userProfile?._id) {
      dispatch(getConversationsThunk());
      dispatch(getOtherUsersThunk());
    }
  }, [isAuthenticated, userProfile?._id, dispatch]);

  // Logic to show/hide message container on mobile
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

  // NO MORE SOCKET LISTENERS HERE. This component is now clean and simple.

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-hidden">
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
      <CallModal />
    </div>
  );
};

export default Home;
