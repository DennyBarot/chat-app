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
import { getToken } from './utils/authUtils.js';
import { ROUTES } from './utils/routes.js';

const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  { path: ROUTES.LOGIN, element: <Login /> },
  { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPassword /> },
  { path: ROUTES.RESET_PASSWORD, element: <ResetPassword /> },
  { path: ROUTES.SIGNUP, element: <Signup /> },
]);

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (window.location.pathname.startsWith(ROUTES.LOGIN) || window.location.pathname.startsWith(ROUTES.SIGNUP)) {
        return;
      }
      const token = getToken();
      if (!token) {
        dispatch({ type: "user/setScreenLoadingFalse" });
        return;
      }
      await dispatch(getUserProfileThunk());
    };

    fetchUserProfile();
  }, [dispatch]);

  return (
    <SocketProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <RouterProvider router={router} />
    </SocketProvider>
  );
}

export default App;