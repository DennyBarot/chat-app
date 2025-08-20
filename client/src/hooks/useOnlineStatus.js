import { useEffect, useState } from 'react';
import { useSocketContext } from '../context/SocketContext';

const useOnlineStatus = (userId) => {
  const [isOnline, setIsOnline] = useState(false);
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (onlineUsers) => {
      setIsOnline(onlineUsers.includes(userId));
    };

    socket.on('onlineUsers', handleOnlineUsers);

    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
    };
  }, [socket, userId]);

  return isOnline;
};

export default useOnlineStatus;
