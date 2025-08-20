import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setOnlineUsers } from '../store/slice/socket/socket.slice';

export const useOnlineUsers = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleOnlineUsers = (event) => {
      const onlineUsers = event.detail;
      console.log('Dispatching online users:', onlineUsers);
      dispatch(setOnlineUsers(onlineUsers));
    };

    window.addEventListener('onlineUsers', handleOnlineUsers);

    return () => {
      window.removeEventListener('onlineUsers', handleOnlineUsers);
    };
  }, [dispatch]);
};
