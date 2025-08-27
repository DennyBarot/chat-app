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
  const userStatusInfo = userStatus[userDetails?._id] || { 
    isOnline: false, 
    lastSeen: null, 
    isRecording: false, 
    isInCall: false 
  };
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);

  const isUserOnline = userStatusInfo.isOnline;
  const isUserRecording = userStatusInfo.isRecording;
  const isUserInCall = userStatusInfo.isInCall;

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
        {isUserRecording && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-background rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </span>
        )}
        {isUserInCall && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 border-2 border-background rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </span>
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
          ) : isUserRecording ? (
            <p className="text-sm text-primary animate-pulse">Voice recording...</p>
          ) : isUserInCall ? (
            <p className="text-sm text-primary animate-pulse">In a call...</p>
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