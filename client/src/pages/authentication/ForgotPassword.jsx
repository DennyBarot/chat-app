import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { forgotPasswordUserThunk } from "../../store/slice/user/user.thunk";
import PropTypes from "prop-types";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.userReducer);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await dispatch(forgotPasswordUserThunk({ email }));
      toast.success("Password reset link sent to your email");
    } catch (error) {
      console.error("Error during password reset:", error);
      const errMsg = error?.response?.data?.message || "Error during password reset";
      toast.error(errMsg);
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center p-6 h-screen bg-green-200">
      <div className="max-w-[30rem] w-full bg-green-300 p-6 rounded-2xl">
        <h2 className="text-2xl mb-6">Forgot Password</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <label className="flex gap-2 items-center">
            <svg className="h-5 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </g>
            </svg>
            <input
              type="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input input-bordered w-full"
            />
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="btn btn-success"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send link"}
          </button>
        </form>
      </div>
    </div>
  );
};

ForgotPassword.propTypes = {
  // Add if you accept props
};

export default ForgotPassword;
