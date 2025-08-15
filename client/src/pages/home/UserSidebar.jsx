import React, { useEffect, useState, useMemo } from "react";
import ProfileUpdateModal from "../../components/ProfileUpdateModal";
import AddUserModal from "../../components/AddUserModal";
import User from "./User";
import { useDispatch, useSelector } from "react-redux";
import { logoutUserThunk } from "../../store/slice/user/user.thunk";
import { getConversationsThunk } from "../../store/slice/message/message.thunk";
import { useSocket } from "../../context/SocketContext";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import ThemeToggle from "../../components/ThemeToggle";
import { setTyping } from "../../store/slice/typing/typing.slice";

const UserSidebar = ({ onUserSelect }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const dispatch = useDispatch();
  const { userProfile } = useSelector((state) => state.userReducer);
  const conversations = useSelector((state) => state.messageReducer.conversations);
  const typingUsers = useSelector((state) => state.typingReducer.typingUsers);

  const socket = useSocket();

  // Effect for managing modal-open class on body
  useEffect(() => {
    document.body.classList.toggle('modal-open', isModalOpen || isAddUserModalOpen);
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isModalOpen, isAddUserModalOpen]);

  const handleLogout = async () => {
    await dispatch(logoutUserThunk());
  };

  const handleSelectUser = (user) => {
    // console.log("UserSidebar: User selected:", user);
    dispatch(setSelectedUser(user));
    setIsAddUserModalOpen(false);
    if (onUserSelect) {
      onUserSelect(user);
    }
  };
  const calculateUnreadCount = (conversation, currentUserId) => {
    if (!conversation?.messages || !Array.isArray(conversation.messages)) return 0;

    return conversation.messages.filter(
      msg =>
        msg.senderId !== currentUserId && // Only count messages not sent by current user
        (!msg.readBy || !msg.readBy.some(u => u._id === currentUserId))
    ).length;
  };

  useEffect(() => {
    if (!socket || !userProfile?._id) {
      return;
    }

    const handleNewMessage = () => {
      // Refetch conversations to update unread counts
      dispatch(getConversationsThunk());
    };

    const handleTyping = ({ senderId, receiverId }) => {
      if (receiverId === userProfile._id) {
        dispatch(setTyping({ userId: senderId, isTyping: true }));
      }
    };

    const handleStopTyping = ({ senderId, receiverId }) => {
      if (receiverId === userProfile._id) {
        dispatch(setTyping({ userId: senderId, isTyping: false }));
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    const handleSocketReconnect = () => {
      dispatch(getConversationsThunk());
    };
    window.addEventListener("socketReconnect", handleSocketReconnect);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      window.removeEventListener("socketReconnect", handleSocketReconnect);
    };
  }, [dispatch, socket, userProfile]);

  useEffect(() => {
    if (!userProfile?._id) {
      return;
    }
    dispatch(getConversationsThunk());
  }, [dispatch, userProfile]);

  const users = useMemo(() => {
    if (!userProfile?._id) {
      return [];
    }
    if (conversations.length === 0) {
      return [];
    }

    let usersList = conversations.map((conv) => {
      if (!Array.isArray(conv.participants)) {
        return null;
      }
      const otherUser = conv.participants.find(
        (participant) => participant && participant._id && userProfile && userProfile._id && participant._id !== userProfile._id
      );
      if (!otherUser) {
        return null;
      }
      const sortedMessages = conv.messages && conv.messages.length > 0
        ? [...conv.messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];
      return {
        ...otherUser,
        lastMessage: sortedMessages.length > 0 ? sortedMessages[0] : null,
        conversationId: conv._id,
        updatedAt: conv.updatedAt,
        unreadCount: calculateUnreadCount(conv, userProfile._id),
      };
    }).filter(Boolean);

    if (searchValue) {
      usersList = usersList.filter((user) => {
        return (
          (user.username?.toLowerCase() ?? "").includes(searchValue.toLowerCase()) ||
          (user.fullName?.toLowerCase() ?? "").includes(searchValue.toLowerCase()) ||
          (user.email?.toLowerCase() ?? "").includes(searchValue.toLowerCase())
        );
      });
    }

    // Sort users by last message time (most recent first)
    usersList = usersList.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.updatedAt || 0;
      const bTime = b.lastMessage?.createdAt || b.updatedAt || 0;
      return new Date(bTime) - new Date(aTime);
    });
    return usersList;
  }, [conversations, userProfile, searchValue]);

  return (
    <div className=" h-full flex flex-col bg-white dark:bg-slate-900 shadow-lg z-10">

      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
          CHAT APP
        </h1>
        <ThemeToggle />
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-200">
        <div className="relative">
          <input
            type="search"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-2">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            <p className="text-center font-medium">No conversations yet</p>
            <p className="text-sm text-slate-400 text-center mt-1">Click the &quot;Add&quot; button to start a new conversation</p>
          </div>
        ) : (
          <div className="space-y-1">
            {users.map((userDetails) => (
              <User key={userDetails?._id} userDetails={userDetails} isTyping={typingUsers[userDetails._id]} displayType="sidebar" />
            ))}
          </div>
        )}
      </div>

      {/* User Profile Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 h-10 rounded-full ring-2 ring-indigo-500 ring-offset-2 overflow-hidden">
              <img src={userProfile?.avatar} alt={userProfile?.fullName} className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
          <div className="truncate">
            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{userProfile?.fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">@{userProfile?.username}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="p-2 rounded-full bg-indigo-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-slate-600 transition-colors"
            title="Add new conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 rounded-full bg-indigo-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-slate-600 transition-colors"
            title="Edit profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-4-4H3zm6.293 11.293a1 1 0 001.414 0l4-4a1 1 0 10-1.414-1.414L11 11.586V8a1 1 0 10-2 0v3.586l-2.293-2.293a1 1 0 10-1.414 1.414l4 4z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <ProfileUpdateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} onSelectUser={handleSelectUser} />
    </div>
  );
};

export default UserSidebar;
