import "./App.css";
import React from "react";  
import {Toaster} from "react-hot-toast";
import { useDispatch } from "react-redux";
import { getUserProfileThunk } from "./store/slice/user/user.thunk";
import { useEffect } from "react";

function App() {

    
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      // Prevent profile retrieval on login and signup pages
      if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
        return;
      }
      // Check if token exists in cookies or localStorage before dispatching
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
      if (!token) {
        return;
      }
      await dispatch(getUserProfileThunk());
    })();
  }, []);
 
 return (
    <>
   
   <Toaster position="top-right" reverseOrder={false}
/>
       
    </>
  );
}

export default App
