import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import { markMessagesReadThunk } from "../../store/slice/message/message.thunk";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
 
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

const User = ({ userDetails, showUnreadCount = true, isTyping = false, displayType = 'sidebar' }) => {
  const { userStatus } = useSelector((state) => state.userReducer);
  const userStatusInfo = userStatus[userDetails?._id] || { isOnline: false, lastSeen: null };
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);

  const isUserOnline = userStatusInfo.isOnline;

  const handleUserClick = useCallback(() => {
    dispatch(setSelectedUser(userDetails));
     if (userDetails?.conversationId) {
      dispatch(markMessagesReadThunk({ conversationId: userDetails.conversationId }));
    }
  }, [dispatch, userDetails]);

  return (
    <div
      onClick={handleUserClick}
      className={`flex gap-3 items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-primary/10 ${
        userDetails?._id === selectedUser?._id ? "bg-primary/20" : ""
      }`}
    >
      <div className="relative">
        <div className={`avatar ${isUserOnline ? 'online' : ''}`}>
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
              <img src={userDetails?.avatar} alt={userDetails?.fullName} className="w-full h-full object-cover rounded-full" />
            </div>
        </div>
        {isUserOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h2 className="font-medium text-text-primary truncate">{userDetails?.fullName}</h2>
          {userDetails?.lastMessage && !isTyping && (
            <span className="text-xs text-text-secondary whitespace-nowrap ml-2">
              {formatTime(userDetails?.lastMessage?.createdAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-baseline">
          {isTyping ? (
            <p className="text-sm text-primary animate-pulse">typing...</p>
          ) : displayType === 'sidebar' ? (
            userDetails?.lastMessage ? (
              <p className="text-sm text-text-secondary truncate">
                {userDetails?.lastMessage?.content}
              </p>
            ) : (
              <p className="text-xs text-text-secondary mr-1">@{userDetails?.username}</p>
            )
          ) : (
            // Show last seen information in header
            <p className="text-xs text-text-secondary mr-1">
              {userStatusInfo.isOnline ? (
                "Online"
              ) : userStatusInfo.lastSeen ? (
                `Last seen ${formatTime(userStatusInfo.lastSeen)}`
              ) : (
                `@${userDetails?.username}`
              )}
            </p>
          )}
          {showUnreadCount && userDetails?.unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
              {userDetails.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(User);