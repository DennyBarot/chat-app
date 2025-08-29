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
      });

      socket.on("callAccepted", (signal) => {
        dispatch(setCallAccepted(true));
        connectionRef.current.signal(signal);
      });

      socket.on("callEnded", () => {
        dispatch(setCallEnded(true));
        connectionRef.current.destroy();
        window.location.reload();
      });
    }
  }, [socket, dispatch]);

  const answerCall = () => {
    dispatch(setCallAccepted(true));

    const peer = new Peer({ initiator: false, trickle: false, stream });

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
    const peer = new Peer({ initiator: true, trickle: false, stream });

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
    socket.emit("callEnded", { to: call.from });
    connectionRef.current.destroy();
    window.location.reload();
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
          element: <Home />,
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
