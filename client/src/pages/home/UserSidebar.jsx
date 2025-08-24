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
import { updateSingleConversation } from "../../store/slice/message/message.slice";
import { setOnlineUsers } from "../../store/slice/socket/socket.slice";
import { createConversationThunk } from "../../store/slice/message/message.thunk";

const UserSidebar = ({ onUserSelect }) => {


const dispatch = useDispatch();
  const { userProfile } = useSelector((state) => state.userReducer);
  const conversations = useSelector((state) => state.messageReducer.conversations);
  const typingUsers = useSelector((state) => state.typingReducer.typingUsers);

  const socket = useSocket(); // Get the clean socket instance directly
     const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => {
    document.body.classList.toggle('modal-open', isModalOpen || isAddUserModalOpen);
    return () => document.body.classList.remove('modal-open');
  }, [isModalOpen, isAddUserModalOpen]);

    // This effect now handles all socket events for the sidebar
  useEffect(() => {
    // The socket can be null initially, so we check for it.
    if (!socket) return;

    const handleConversationUpdate = (updatedConversation) => {
      dispatch(updateSingleConversation(updatedConversation));
    };
    const handleOnlineUsers = (users) => dispatch(setOnlineUsers(users));
    const handleTyping = ({ senderId }) => dispatch(setTyping({ userId: senderId, isTyping: true }));
    const handleStopTyping = ({ senderId }) => dispatch(setTyping({ userId: senderId, isTyping: false }));

    socket.on("conversationUpdated", handleConversationUpdate);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    // Cleanup function to remove listeners when component unmounts
    return () => {
      socket.off("conversationUpdated", handleConversationUpdate);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [socket, dispatch]); 

  // --- UPDATED SOCKET EFFECT ---
  // Initial fetch of conversations when the component mounts and the user is logged in.
  useEffect(() => {
    if (userProfile?._id) {
      dispatch(getConversationsThunk());
    }
  }, [dispatch, userProfile?._id]);


  const users = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];

    let usersList = conversations.map((conv) => {
      const otherUser = conv.participants.find(p => p._id !== userProfile._id);
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
  }, [conversations, searchValue, userProfile._id]);

  const handleLogout = () => dispatch(logoutUserThunk());

  const handleSelectUser = (user) => {
    dispatch(setSelectedUser(user));
    if (user?._id) {
      const participants = [userProfile._id, user._id];
      dispatch(createConversationThunk({ participants })).then((action) => {
        if (action.payload) {
          if (onUserSelect) onUserSelect(user);
        }
      });
    } else {
      if (onUserSelect) onUserSelect(user);
    }
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
                key={userDetails?.conversationId || userDetails?._id} 
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
