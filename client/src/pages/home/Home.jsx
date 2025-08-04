

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

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true" || false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

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
      console.log("Home.jsx: Received newMessage socket event:", newMessage);
      dispatch(setNewMessage(newMessage));
      // Always fetch messages for the selected user for true real-time updates
      if (selectedUser && selectedUser._id) {
        console.log("Home.jsx: Dispatching getMessageThunk for selectedUser:", selectedUser._id);
        dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
      } else {
        console.log("Home.jsx: No selectedUser or _id, not dispatching getMessageThunk");
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
    <div className="flex h-screen bg-slate-100 dark:bg-gray-900 overflow-hidden transition-colors">
      <header className="p-4 border-b border-slate-300 dark:border-gray-700 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center transition-colors">
          CHAT APP
        </h1>
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          title="Toggle dark mode"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-slate-600 dark:text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </button>
      </header>
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
