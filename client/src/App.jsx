import "./App.css";
import React, { useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
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
import { setCall, setCallAccepted, setCallEnded, setCaller, setCallerSignal, setStream, setIsStreamReady } from "./store/slice/call/call.slice.js";

function App() {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { userProfile } = useSelector((state) => state.userReducer);
  const { call, callAccepted, callEnded, stream, caller, callerSignal, isStreamReady } = useSelector((state) => state.callReducer || { call: null, callAccepted: false, callEnded: false, stream: null, caller: '', callerSignal: null, isStreamReady: false });

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        dispatch(setStream(currentStream));
        dispatch(setIsStreamReady(true));
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      } catch (error) {
        console.error("Failed to get media devices:", error);
        // Fallback to audio only if video fails
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          dispatch(setStream(audioStream));
          dispatch(setIsStreamReady(true));
        } catch (audioError) {
          console.error("Failed to get audio devices:", audioError);
          toast.error("Could not access camera or microphone. Please check if they are in use by another application.");
        }
      }
    };

    initializeMedia();

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
    console.log("Answering call from:", caller);
    dispatch(setCallAccepted(true));

    try {
      const peer = new Peer({ initiator: false, trickle: false, stream: stream });

      peer.on("signal", (data) => {
        console.log("Answer call signal generated:", data);
        if (socket && caller) {
          socket.emit("answerCall", { signal: data, to: caller });
          console.log("Answer call signal sent to:", caller);
        }
      });

      peer.on("stream", (currentStream) => {
        console.log("Remote stream received");
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      });

      peer.on("error", (error) => {
        console.error("Peer connection error in answerCall:", error);
        toast.error("Connection error. Please try again.");
        leaveCall();
      });

      peer.on("close", () => {
        console.log("Peer connection closed in answerCall");
      });

      if (callerSignal) {
        console.log("Signaling with caller signal");
        peer.signal(callerSignal);
      }

      connectionRef.current = peer;
    } catch (error) {
      console.error("Error creating peer in answerCall:", error);
      toast.error("Failed to answer call. Please try again.");
      leaveCall();
    }
  };

  const callUser = (id) => {
    console.log("Calling user:", id);
    if (!stream) {
      console.error("No media stream available");
      toast.error("Microphone/camera access denied or not available.");
      return;
    }
    if (!userProfile?._id) {
      console.error("User profile not available");
      toast.error("User profile not available. Please try again.");
      return;
    }
    if (!socket || !socket.connected) {
      console.error("Socket not connected");
      toast.error("Connection not ready. Please wait and try again.");
      return;
    }

    try {
      const peer = new Peer({ initiator: true, trickle: false, stream: stream });

      peer.on("signal", (data) => {
        console.log("Call signal generated:", data);
        if (socket) {
          socket.emit("callUser", { 
            userToCall: id, 
            signalData: data, 
            from: userProfile._id, 
            name: userProfile.fullName 
          });
          console.log("Call signal sent to user:", id);
        }
      });

      peer.on("stream", (currentStream) => {
        console.log("Remote stream received in call");
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      });

      peer.on("error", (error) => {
        console.error("Peer connection error in callUser:", error);
        toast.error("Connection error. Please try again.");
        leaveCall();
      });

      peer.on("close", () => {
        console.log("Peer connection closed in callUser");
      });

      // Store the cleanup function for this specific call
      const handleCallAccepted = (signal) => {
        console.log("Call accepted signal received:", signal);
        dispatch(setCallAccepted(true));
        if (peer) {
          peer.signal(signal);
        }
        // Clean up the listener
        socket.off("callAccepted", handleCallAccepted);
      };

      // Add the listener with a specific identifier
      socket.on("callAccepted", handleCallAccepted);

      // Store cleanup function
      connectionRef.current = {
        peer,
        cleanup: () => socket.off("callAccepted", handleCallAccepted)
      };
    } catch (error) {
      console.error("Error creating peer in callUser:", error);
      toast.error("Failed to initiate call. Please try again.");
    }
  };

  const leaveCall = (isReject = false) => {
    console.log("Leaving call, isReject:", isReject);
    if (isReject) {
      socket.emit("callRejected", { to: call.from });
      console.log("Call rejected signal sent to:", call.from);
    } else if (call && call.from) {
      socket.emit("callEnded", { to: call.from });
      console.log("Call ended signal sent to:", call.from);
    }

    dispatch(setCallEnded(true));
    if (connectionRef.current) {
      // Handle both old and new connectionRef structures
      if (connectionRef.current.peer) {
        connectionRef.current.peer.destroy();
        // Clean up socket listeners
        if (connectionRef.current.cleanup) {
          connectionRef.current.cleanup();
        }
      } else {
        connectionRef.current.destroy();
      }
      connectionRef.current = null;
    }

    // Reset call state without reloading the page
    setTimeout(() => {
      dispatch(setCall(null));
      dispatch(setCallAccepted(false));
      dispatch(setCallEnded(false));
      dispatch(setCaller(''));
      dispatch(setCallerSignal(null));
      console.log("Call state reset");
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
          element: <Home callUser={callUser} isStreamReady={isStreamReady} />,
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
