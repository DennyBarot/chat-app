import "./App.css";
import React, { useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { getUserProfileThunk } from "./store/slice/user/user.thunk";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import Home from "./pages/home/Home.jsx"; 
import Login from "./pages/authentication/Login.jsx";
import Signup from "./pages/authentication/Signup.jsx";
import ForgotPassword from './pages/authentication/ForgotPassword.jsx';
import ResetPassword from './pages/authentication/ResetPassword.jsx';
import ProtectedRoute from './components/ProtectedRoutes.jsx';
import { SocketProvider, useSocket } from './context/SocketContext.jsx';
import CallModal from "./components/CallModal.jsx";
import Peer from "simple-peer";
import { setCall, setCallAccepted, setCallEnded, setCaller, setCallerSignal, setStream } from "./store/slice/call/call.slice.js";

function App() {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { userProfile } = useSelector((state) => state.userReducer);
  const { call, callAccepted, callEnded, stream, caller, callerSignal } = useSelector((state) => state.callReducer);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        dispatch(setStream(currentStream));
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    (async () => {
      if (window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/signup")) {
        return;
      }
      const token =
        document.cookie.split("; ").find((row) => row.startsWith("token="))?.split("=")[1] ||
        localStorage.getItem("token");
      if (!token) {
        dispatch({ type: "user/setScreenLoadingFalse" });
        return;
      }
      await dispatch(getUserProfileThunk());
    })();
  }, [dispatch]);

  useEffect(() => {
    if (socket) {
      socket.on("callUser", ({ from, name: callerName, signal }) => {
        dispatch(setCaller(from));
        dispatch(setCallerSignal(signal));
        dispatch(setCall({ isReceivingCall: true, from, name: callerName, signal }));
        
        // Play incoming call sound
        const audio = new Audio('/sounds/incoming-call.mp3');
        audio.loop = true;
        audio.play().catch(console.error);
      });

      socket.on("callAccepted", (signal) => {
        dispatch(setCallAccepted(true));
        if (connectionRef.current) {
          connectionRef.current.signal(signal);
        }
      });

      socket.on("callEnded", ({ reason }) => {
        console.log("Call ended:", reason);
        dispatch(setCallEnded(true));
        if (connectionRef.current) {
          connectionRef.current.destroy();
        }
        // Show call ended notification
        if (reason) {
          // You could show a toast notification here
          console.log("Call ended reason:", reason);
        }
      });

      socket.on("callFailed", ({ reason }) => {
        console.log("Call failed:", reason);
        // Show call failed notification
        if (reason === "User is offline") {
          // Show offline message
          console.log("User is offline");
        } else if (reason === "No answer") {
          console.log("No answer from user");
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("callUser");
        socket.off("callAccepted");
        socket.off("callEnded");
        socket.off("callFailed");
      }
    };
  }, [socket, dispatch]);

  const answerCall = () => {
    dispatch(setCallAccepted(true));

    const peer = new Peer({ initiator: false, trickle: false, stream: stream });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(callerSignal);

    connectionRef.current = peer;
  };

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream: stream });

    peer.on("signal", (data) => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: userProfile._id, name: userProfile.fullName });
    });

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    socket.on("callAccepted", (signal) => {
      dispatch(setCallAccepted(true));
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    dispatch(setCallEnded(true));
    if (call && call.from) {
      socket.emit("callEnded", { to: call.from });
    }
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    // Reset call state without reloading the page
    setTimeout(() => {
      dispatch(setCall(null));
      dispatch(setCallAccepted(false));
      dispatch(setCallEnded(false));
      dispatch(setCaller(''));
      dispatch(setCallerSignal(null));
    }, 1000);
  };

  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <Outlet />
        </ProtectedRoute>
      ),
      children: [
        {
          path: "/",
          element: <Home callUser={callUser} />,
        },
      ],
    },
    { path: "/login", element: <Login /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/reset-password", element: <ResetPassword /> },
    { path: "/signup", element: <Signup /> },
  ]);

  return (
    <SocketProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <RouterProvider router={router} />
      {call && call.isReceivingCall && !callAccepted && (
        <CallModal
          call={call}
          callAccepted={callAccepted}
          myVideo={myVideo}
          userVideo={userVideo}
          stream={stream}
          answerCall={answerCall}
          leaveCall={leaveCall}
          callEnded={callEnded}
        />
      )}
    </SocketProvider>
  );
}

export default App;
