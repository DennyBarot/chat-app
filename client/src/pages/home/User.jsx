import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "../../store/slice/user/user.slice";

const User = ({ userDetails, unreadCount }) => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);
  const { onlineUsers } = useSelector(state => state.socketReducer);
  const isUserOnline = onlineUsers?.includes(userDetails?._id);

  const handleUserClick = () => {
    dispatch(setSelectedUser(userDetails));
  };

  // Format timestamp for last message
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

  return (
    <div
      onClick={handleUserClick}
      className={`flex gap-3 items-center p-3 rounded-lg cursor-pointer transition-all duration-200hover:bg-indigo-50 dark:hover:bg-slate-700 ${
        userDetails?._id === selectedUser?._id ? "bg-indigo-100" : ""
      }`}
    >
      <div className="relative">
        <div className={`avatar ${isUserOnline ? 'online' : ''}`}>
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
              <img src={userDetails?.avatar} alt={userDetails?.fullName} className="w-full h-full object-cover rounded-full" />
            </div>
        </div>
        {isUserOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h2 className="font-medium text-slate-800 truncate">{userDetails?.fullName}</h2>
          {userDetails?.lastMessage && (
            <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
              {formatTime(userDetails?.lastMessage?.createdAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-baseline">
          <p className="text-xs text-slate-500 mr-1">@{userDetails?.username}</p>
          {userDetails?.lastMessage && (
            <p className="text-sm text-slate-600 truncate">
              {userDetails?.lastMessage?.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default User;
