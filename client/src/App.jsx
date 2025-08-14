import "./App.css";
import React, { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { getUserProfileThunk } from "./store/slice/user/user.thunk";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/home/Home.jsx";
import Login from "./pages/authentication/Login.jsx";
import Signup from "./pages/authentication/Signup.jsx";
import ForgotPassword from "./pages/authentication/ForgotPassword.jsx";
import ResetPassword from "./pages/authentication/ResetPassword.jsx";
import ProtectedRoute from "./components/ProtectedRoutes.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
]);

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    async function autoLogin() {
      // Skip for auth pages
      if (window.location.pathname.startsWith("/login") || 
          window.location.pathname.startsWith("/signup")) {
        return;
      }
      // Find token in cookie or localStorage
      const cookieToken = document.cookie.split("; ").find((row) => row.startsWith("token="));
      const token = cookieToken ? cookieToken.split("=")[1] : localStorage.getItem("token");
      // If no token, tell app loading is done (can show auth UI)
      if (!token) {
        dispatch({ type: "user/setScreenLoadingFalse" });
        return;
      }
      // Attempt to get user profile
      try {
        await dispatch(getUserProfileThunk()).unwrap();
      } catch (err) {
        dispatch({ type: "user/setScreenLoadingFalse" });
      }
    }
    autoLogin();
  }, [dispatch]);

  return (
    <SocketProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <RouterProvider router={router} />
    </SocketProvider>
  );
}
