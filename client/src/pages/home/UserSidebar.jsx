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
// --- Import the new action ---
import { updateSingleConversation } from "../../store/slice/message/message.slice";

const UserSidebar = ({ onUserSelect }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const dispatch = useDispatch();
  const { userProfile } = useSelector((state) => state.userReducer);
  const conversations = useSelector((state) => state.messageReducer.conversations);
  const typingUsers = useSelector((state) => state.typingReducer.typingUsers);
  const { socket } = useSocket();

  useEffect(() => {
    document.body.classList.toggle('modal-open', isModalOpen || isAddUserModalOpen);
    return () => document.body.classList.remove('modal-open');
  }, [isModalOpen, isAddUserModalOpen]);

  // --- UPDATED SOCKET EFFECT ---
  useEffect(() => {
    if (!socket || !userProfile?._id) return;

    // Listener for the new, efficient conversation update
    const handleConversationUpdate = (updatedConversation) => {
      dispatch(updateSingleConversation(updatedConversation));
    };

    const handleTyping = ({ senderId }) => {
      dispatch(setTyping({ userId: senderId, isTyping: true }));
    };

    const handleStopTyping = ({ senderId }) => {
      dispatch(setTyping({ userId: senderId, isTyping: false }));
    };

    socket.on("conversationUpdated", handleConversationUpdate);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("conversationUpdated", handleConversationUpdate);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [dispatch, socket, userProfile]);

  // Initial fetch of conversations when the component mounts
  useEffect(() => {
    if (userProfile?._id) {
      dispatch(getConversationsThunk());
    }
  }, [dispatch, userProfile]);

  const users = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];

    let usersList = conversations.map((conv) => {
      const otherUser = conv.participants[0];
      if (!otherUser) return null;
      return {
        ...otherUser,
        lastMessage: conv.lastMessage,
        conversationId: conv._id,
        updatedAt: conv.updatedAt,
        unreadCount: conv.unreadCount,
      };
    }).filter(Boolean);

    if (searchValue) {
      usersList = usersList.filter((user) =>
        (user.fullName?.toLowerCase() ?? "").includes(searchValue.toLowerCase())
      );
    }

    // Sort users by last message time (most recent first)
    return usersList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [conversations, searchValue]);

  const handleLogout = () => dispatch(logoutUserThunk());

  const handleSelectUser = (user) => {
    dispatch(setSelectedUser(user));
    if (onUserSelect) onUserSelect(user);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-lg z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-700">CHAT APP</h1>
        <ThemeToggle />
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-200">
        <input
          type="search"
          placeholder="Search conversations..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-2">
        {users.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">
            <p>No conversations yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {users.map((userDetails) => (
              <User 
                key={userDetails?._id} 
                userDetails={userDetails} 
                isTyping={typingUsers[userDetails._id]} 
                displayType="sidebar" 
                onSelect={handleSelectUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* User Profile Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={userProfile?.avatar} alt={userProfile?.fullName} className="w-10 h-10 rounded-full" />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{userProfile?.fullName}</p>
            <p className="text-xs text-slate-500">@{userProfile?.username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsAddUserModalOpen(true)} title="Add new conversation">...</button>
          <button onClick={() => setIsModalOpen(true)} title="Edit profile">...</button>
          <button onClick={handleLogout} title="Logout">...</button>
        </div>
      </div>

      <ProfileUpdateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} onSelectUser={handleSelectUser} />
    </div>
  );
};

export default UserSidebar;
