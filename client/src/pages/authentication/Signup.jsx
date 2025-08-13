import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { registerUserThunk } from '../../store/slice/user/user.thunk.js';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from "react-hot-toast";

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.userReducer);

  const [signupData, setSignupData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    gender: '',
  });

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    setSignupData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(prev => !prev);
  };

  const handleSignup = async () => {
    if (!signupData.fullName || !signupData.username || !signupData.email || !signupData.password || !signupData.gender) {
      return toast.error("All fields are required.");
    }

    const response = await dispatch(registerUserThunk(signupData));
    if (response?.payload?.success) {
      toast.success("Account created! Please log in.");
      navigate("/login");
    } else {
      toast.error(response?.payload || "Signup failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md bg-gray-850 p-8 rounded-xl shadow-xl space-y-6 text-white">
        <h2 className="text-3xl font-semibold text-center text-amber-400">Create Account</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter a username"
              pattern="[A-Za-z][A-Za-z0-9\-]*"
              minLength="3"
              maxLength="30"
              required
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Full Name</label>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              required
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300">Password</label>
            <input
              type={isPasswordVisible ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              required
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute top-[2.25rem] right-3 text-gray-400 hover:text-amber-400"
            >
              {isPasswordVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.054 0 2.065.18 3 .508M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                </svg>
              )}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Gender</label>
            <select
              name="gender"
              required
              onChange={handleInputChange}
              defaultValue=""
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="" disabled>Pick a gender</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>

          <button
            onClick={handleSignup}
            className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition duration-200"
          >
            Sign Up
          </button>
        </div>

        <div className="text-sm text-center text-gray-400">
          Already have an account?
          <Link to="/login" className="text-amber-400 hover:underline ml-1">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
