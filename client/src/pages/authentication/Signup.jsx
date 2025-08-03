import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { registerUserThunk } from '../../store/slice/user/user.thunk';

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

  useEffect(() => {
    // Redirect authenticated users away from signup page
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(prev => !prev);
  };

  const handleInputChange = (e) => {
    setSignupData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignup = async () => {
    console.log("Signup function called");
    console.log("Signup data:", signupData);

    if (!signupData.fullName || !signupData.username || !signupData.email || !signupData.password || !signupData.gender) {
      return toast.error("All fields are required.");
    }

    const response = await dispatch(registerUserThunk(signupData));
    // console.log("Response from dispatch:", response); 
    // console.log("Response from signup:", response); 
    // console.log("Response:", response);
    if (response?.payload?.success) {
      // toast.success("Account created successfully! Please login with email and password");
      // navigate("/login");
    }
  };

  return (
    <div className='flex justify-center place-items-center p-6 h-screen bg-orange-400'>
      <div className='max-w-[30rem] w-full flex flex-col place-item-center gap-5 bg-orange-500 p-6 rounded-2xl'>
        <h2 className="text-2xl ">Sign Up </h2>

        <label className="input validator input-bordered flex items-center gap-2 w-full ">
          <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </g>
          </svg>
          <input type="input" required placeholder="Username" pattern="[A-Za-z][A-Za-z0-9\-]*" minLength="3" maxLength="30" onChange={handleInputChange} title="Only letters, numbers or dash" name='username' />
        </label>
        <input type="text" placeholder="Full Name" className="FullName input input-bordered flex items-center gap-2 w-full" required name='fullName' onChange={handleInputChange} />


        <label className="input validator input-bordered flex items-center gap-2 w-full ">
          <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </g>
          </svg>
          <input type="email" placeholder="mail@site.com" onChange={handleInputChange} name='email' required />
        </label>

        <label className="input validator input-bordered flex items-center gap-2 w-full">
          <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
              <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path>
              <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
            </g>
          </svg>
          <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 end-0 flex items-center z-20 px-3 cursor-pointer text-gray-400 rounded-e-md focus:outline-hidden focus:text-blue-600 dark:text-neutral-600 dark:focus:text-blue-500">
            <svg className="shrink-0 size-3.5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path className={isPasswordVisible ? "hidden" : "hs-password-active:hidden"} d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
              <path className={isPasswordVisible ? "hidden" : "hs-password-active:hidden"} d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
              <path className={isPasswordVisible ? "hidden" : "hs-password-active:hidden"} d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
              <line className={isPasswordVisible ? "hidden" : "hs-password-active:hidden"} x1="2" x2="22" y1="2" y2="22"></line>
              <path className={isPasswordVisible ? "hs-password-active:block" : "hidden"} d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
              <circle className={isPasswordVisible ? "hs-password-active:block" : "hidden"} cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <input type={isPasswordVisible ? "text" : "password"} name='password' required placeholder="Password" onChange={handleInputChange} />
        </label>


        <select defaultValue="Pick an Gender" name='gender' onChange={handleInputChange} className="gender select select-warning w-full">

          <option disabled={true}>Pick an Gender </option>
          <option>Male</option>
          <option>Female</option>
        </select>

        <button className="btn btn-soft btn-error bg-amber-600 text-red-600" onClick={handleSignup}>Sign up</button>

        <p>
          already have an account?<Link to="/login" className='text-blue-500'> Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
