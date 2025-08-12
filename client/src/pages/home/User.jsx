import React, { memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { markMessagesReadThunk } from "../../store/slice/message/message.thunk";
import PropTypes from "prop-types";

const DEFAULT_AVATAR = "/images/default-avatar.png";

const User = ({ userDetails, showUnreadCount = true }) => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);
  const { onlineUsers } = useSelector((state) => state.socketReducer);

  const isUserOnline = onlineUsers?.includes(userDetails?._id);

  const handleUserClick = () => {
    dispatch(setSelectedUser(userDetails));
    if (userDetails?.conversationId) {
      dispatch(markMessagesReadThunk({ conversationId: userDetails.conversationId }));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleUserClick();
  };

  const avatarSrc = userDetails?.avatar || DEFAULT_AVATAR;
  const lastMessage = userDetails?.lastMessage || {};

  // Format timestamp for last message (extract to utils if reused)
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  };

  const isSelected = userDetails?._id === selectedUser?._id;

  return (
    <div
      onClick={handleUserClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex="0"
      aria-selected={isSelected}
      className={`flex gap-3 items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-indigo-50 dark:hover:bg-slate-700 ${
        isSelected ? "bg-indigo-100" : ""
      }`}
    >
      <div className="relative">
        <div className={`avatar ${isUserOnline ? "online" : ""}`}>
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
            <img
              src={avatarSrc}
              alt={userDetails?.fullName || "User"}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.target.src = DEFAULT_AVATAR;
              }}
            />
          </div>
        </div>
        {isUserOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h2 className="font-medium text-slate-800 truncate">{userDetails?.fullName}</h2>
          {lastMessage?.createdAt && (
            <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        <div className="flex items-baseline min-h-[1.5rem]">
          <p className="text-xs text-slate-500 mr-1">@{userDetails?.username}</p>
          {lastMessage?.message && (
            <p className="text-sm text-slate-600 truncate flex-1">{lastMessage.message}</p>
          )}
          {showUnreadCount && userDetails?.unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
              {userDetails.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

User.propTypes = {
  userDetails: PropTypes.shape({
    _id: PropTypes.string,
    avatar: PropTypes.string,
    fullName: PropTypes.string,
    username: PropTypes.string,
    lastMessage: PropTypes.shape({
      message: PropTypes.string,
      createdAt: PropTypes.string,
    }),
    unreadCount: PropTypes.number,
    conversationId: PropTypes.string,
  }),
  showUnreadCount: PropTypes.bool,
};

export default memo(User);
