import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state) => state.userReducer);
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Redirect authenticated users away from reset password page
        if (isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        try {
            const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/v1/user/reset-password`, {
                email: emailParam, // Send email from URL parameter
                password: newPassword,
            });
            setMessage(response.data.message);
        } catch {
            setMessage("Error resetting password. Please try again.");
        }
    }, [newPassword, confirmPassword, emailParam]);

    const handleNewPasswordChange = useCallback((e) => {
        setNewPassword(e.target.value);
    }, []);

    const handleConfirmPasswordChange = useCallback((e) => {
        setConfirmPassword(e.target.value);
    }, []);

    return (
        <div>
            <h2>Reset Password</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>New Password:</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={handleNewPasswordChange}
                        required
                    />
                </div>
                <div>
                    <label>Confirm Password:</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        required
                    />
                </div>
                <button type="submit">Reset Password</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
}

export default ResetPassword;
