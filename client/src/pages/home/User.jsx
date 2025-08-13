import React, { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { markMessagesReadThunk } from "../../store/slice/message/message.thunk";

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

const User = memo(({ userDetails, showUnreadCount = true }) => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);
  const { onlineUsers } = useSelector((state) => state.socketReducer);

  const isUserOnline = !!onlineUsers?.includes(userDetails?._id);
  const isSelected = userDetails?._id === selectedUser?._id;
  const { _id, fullName, username, avatar, lastMessage, unreadCount, conversationId } = userDetails || {};
  const { createdAt, message } = lastMessage || {};
  const hasUnread = showUnreadCount && unreadCount > 0;

  const handleUserClick = useCallback(() => {
    dispatch(setSelectedUser(userDetails));
    if (conversationId) {
      dispatch(markMessagesReadThunk({ conversationId }));
    }
  }, [dispatch, userDetails, conversationId]);

  const itemClass = [
    "flex gap-3 items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-indigo-50 dark:hover:bg-slate-700",
    isSelected ? "bg-indigo-100" : "",
  ].join(" ");

  return (
    <div onClick={handleUserClick} className={itemClass}>
      <div className="relative">
        <div className={`avatar ${isUserOnline ? "online" : ""}`}>
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
            <img
              src={avatar}
              alt={fullName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>
        {isUserOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h2 className="font-medium text-slate-800 truncate">{fullName}</h2>
          {createdAt && (
            <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
              {formatTime(createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-baseline">
          <p className="text-xs text-slate-500 mr-1">@{username}</p>
          {message && <p className="text-sm text-slate-600 truncate">{message}</p>}
          {hasUnread && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if userDetails, showUnreadCount, selectedUser, or onlineUsers change
  return (
    JSON.stringify(prevProps.userDetails) === JSON.stringify(nextProps.userDetails) &&
    prevProps.showUnreadCount === nextProps.showUnreadCount &&
    prevProps.selectedUser === nextProps.selectedUser &&
    prevProps.onlineUsers === nextProps.onlineUsers
  );
});

export default User;
