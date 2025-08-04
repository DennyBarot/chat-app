import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from 'react-redux';
import { loginUserThunk } from '../../store/slice/user/user.thunk';

const Login = () => {
   const navigate = useNavigate();
   const dispatch = useDispatch();
   const { isAuthenticated } = useSelector((state) => state.userReducer);

   const [loginData, setLoginData] = useState({ email: '', password: '' });
   const [isPasswordVisible, setIsPasswordVisible] = useState(false);

   useEffect(() => {
      if (isAuthenticated) {
         navigate("/", { replace: true });
      }
   }, [isAuthenticated, navigate]);

   const handleInputChange = (e) => {
      setLoginData((prev) => ({
         ...prev,
         [e.target.name]: e.target.value,
      }));
   };

   const handleLogin = async () => {
      try {
         const response = await dispatch(loginUserThunk(loginData));
         if (response?.payload?.success) {
            toast.success("Login successful");
            navigate("/");
         } else {
            toast.error(response?.payload || "Login failed");
         }
      } catch (error) {
         toast.error(error?.message || "Login failed");
      }
   };

   const togglePasswordVisibility = () => {
      setIsPasswordVisible((prev) => !prev);
   };

   return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
         <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md space-y-6">
            <h2 className="text-3xl font-semibold text-center text-gray-800">Login</h2>

            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="relative">
                     <input
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                     <input
                        type={isPasswordVisible ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                     />
                     <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                     >
                        {isPasswordVisible ? (
                           <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                           </svg>
                        ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.054 0 2.065.18 3 .508M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                           </svg>
                        )}
                     </button>
                  </div>
               </div>

               <button
                  onClick={handleLogin}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition duration-200"
               >
                  Login
               </button>
            </div>

            <div className="text-sm text-center text-gray-600">
               Don't have an account?
               <Link to="/signup" className="text-blue-500 hover:underline ml-1">
                  Sign Up
               </Link>
            </div>

            <div className="text-sm text-center">
               <Link to="/forgot-password" className="text-blue-500 hover:underline">
                  Forgot Password?
               </Link>
            </div>
         </div>
      </div>
   );
};

export default Login;
