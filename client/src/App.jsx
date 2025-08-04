import "./App.css";
import React, { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { getUserProfileThunk } from "./store/slice/user/user.thunk";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/home/Home.jsx"; 
import Login from "./pages/authentication/Login.jsx";
import Signup from "./pages/authentication/Signup.jsx";
import ForgotPassword from './pages/authentication/ForgotPassword.jsx';
import ResetPassword from './pages/authentication/ResetPassword.jsx';
import ProtectedRoute from './components/ProtectedRoutes.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

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
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/signup", element: <Signup /> },
]);

function App() {
  const dispatch = useDispatch();

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

  return (
    <ThemeProvider>
      <SocketProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <RouterProvider router={router} />
      </SocketProvider>
    </ThemeProvider>
  );
}


export default App;
