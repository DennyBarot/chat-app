import "./App.css";
import React from "react";  
import {Toaster} from "react-hot-toast";
import { useDispatch } from "react-redux";
import { getUserProfileThunk } from "./store/slice/user/user.thunk";
import { useEffect } from "react";
import { Buffer } from 'buffer';
window.Buffer = Buffer;
function App() {

    
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      // Prevent profile retrieval on login and signup pages
      if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
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
