import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserProfileThunk } from '../store/slice/user/user.thunk';

const ProfileUpdateModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { userProfile, buttonLoading } = useSelector((state) => state.userReducer);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName || '');
      setUsername(userProfile.username || '');
      setAvatar(userProfile.avatar || '');
    }
  }, [userProfile, isOpen]);

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setAvatar('');
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    await dispatch(updateUserProfileThunk({ fullName, username, avatar }));
    onClose();
  }, [dispatch, fullName, username, avatar, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-background rounded-xl shadow-2xl p-8 w-[450px] max-w-full transform transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center mb-6 border-b border-foreground pb-4">
          <h2 className="text-2xl font-bold text-primary">Update Profile</h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors duration-200"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            {avatar ? (
              <img 
                src={avatar} 
                alt="Profile avatar" 
                className="w-28 h-28 rounded-full object-cover border-4 border-primary/20 shadow-md transition-all duration-300" 
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary font-bold text-xl border-4 border-primary/10 shadow-md">
                {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <label 
                htmlFor="avatar-upload" 
                className="w-full h-full rounded-full flex items-center justify-center bg-primary/80 text-primary-foreground cursor-pointer"
              >
                <span className="text-sm font-medium">Change</span>
              </label>
            </div>
            
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          
          <div className="mt-4 flex space-x-2">
            <button
              type="button"
              onClick={() => document.getElementById('avatar-upload').click()}
              className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors duration-200 font-medium"
            >
              Upload
            </button>
            
            {avatar && (
              <button
                onClick={handleRemoveAvatar}
                className="px-3 py-1.5 text-sm bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors duration-200 font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-foreground rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-foreground rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                placeholder="username"
                required
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-foreground flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg font-medium text-text-secondary bg-foreground hover:bg-foreground/80 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={buttonLoading || isUploading}
              className="px-5 py-2.5 rounded-lg font-medium text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buttonLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileUpdateModal;
