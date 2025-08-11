import React, { useState, useEffect } from 'react';
import { Link ,useNavigate } from "react-router-dom";
import {toast} from "react-hot-toast";
import { useDispatch, useSelector} from 'react-redux';
import { forgotPasswordUserThunk } from '../../store/slice/user/user.thunk';

const ForgotPassword = () => {

   const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.userReducer);

  useEffect(() => {
    // Redirect authenticated users away from forgot password page
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

   const [EmailData, setEmailData] = useState({
      email: '',
      
   });

   const handleInputChange = (e) => {
      setEmailData((prev) => ({
         ...prev,
         [e.target.name]: e.target.value,
      }));
   };
 
   const handlePasswordForgot = async () => {  
    try {
    await dispatch(forgotPasswordUserThunk(EmailData));
    }
    catch (error) {
      console.error("Error during password reset:", error); 
      toast.error("Error during password reset");
    }
     }   

   return (
      <div className='flex justify-center place-items-center p-6 h-screen bg-green-200'>
         <div className='max-w-[30rem] w-full flex flex-col fplace-item-center gap-5 bg-green-300 p-6 rounded-2xl'>
            <h2 className="text-2xl ">Forgot Password </h2>
            <label className="input validator input-bordered flex items-center gap-2 w-full ">
               <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                     <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                     <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </g>
               </svg>
               <input type="email" placeholder="name@gmail.com" name='email' onChange={handleInputChange} />
            </label>

       

            <button onClick={handlePasswordForgot}  className="btn btn-dash btn-success" >Send link</button>

         </div>
      </div>
   );
};

export default ForgotPassword;