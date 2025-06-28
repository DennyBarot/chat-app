import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from 'react-redux';
import { loginUserThunk } from '../../store/slice/user/user.thunk';

const Login = () => {

   const navigate = useNavigate();
   const dispatch = useDispatch();
   const { isAuthenticated } = useSelector((state) => state.userReducer);

   const [loginData, setLoginData] = useState({
      email: '',
      password: ''
   });

   useEffect(() => {
      if (isAuthenticated) navigate("/");
   }, [isAuthenticated]);


   const [isPasswordVisible, setIsPasswordVisible] = useState(false);

   const togglePasswordVisibility = () => {
      setIsPasswordVisible(prev => !prev);
   };

   const handleInputChange = (e) => {
      setLoginData((prev) => ({
         ...prev,
         [e.target.name]: e.target.value,
      }));
   };

   const handleLogin = async () => {
      console.log("login successful")
      toast.success("Login successful");
      const response = await dispatch(loginUserThunk(loginData));
      if (response?.payload?.success) {
         navigate("/");
      }


   }

   return (
      <div className='flex justify-center place-items-center p-6 h-screen bg-green-200'>
         <div className='max-w-[30rem] w-full flex flex-col fplace-item-center gap-5 bg-green-300 p-6 rounded-2xl'>
            <h2 className="text-2xl ">Login </h2>
            <label className="input validator input-bordered flex items-center gap-2 w-full ">
               <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                     <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                     <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </g>
               </svg>
               <input type="email" placeholder="name@gmail.com" name='email' onChange={handleInputChange} />
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


            <button onClick={handleLogin} className="btn btn-dash btn-success" >Login</button>

            <p>
               Don't have an account?<Link to="/signup" className='text-blue-500'> Sign Up</Link>
               <Link to="/forgot-password" className='text-blue-500 ml-5'>Forgot Password </Link>
            </p>
         </div>
      </div>
   );
};

export default Login;
