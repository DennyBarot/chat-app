import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsersThunk } from "../store/slice/user/user.thunk.js";
import { selectAllUsers } from '../store/slice/user/user.slice.js';

const AddUserModal = ({ isOpen, onClose, onSelectUser }) => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  const allUsers = useSelector(selectAllUsers);

  useEffect(() => {
    if (isOpen && (!allUsers || allUsers.length === 0)) {
      dispatch(getAllUsersThunk());
    }
  }, [isOpen, dispatch, allUsers]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(allUsers);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = allUsers.filter((user) => {
        return (
          (user.username?.toLowerCase() ?? "").includes(lowerSearch) ||
          (user.fullName?.toLowerCase() ?? "").includes(lowerSearch)
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[450px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800">Add New User</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1 rounded-full hover:bg-slate-100"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="relative mb-5">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by username or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-slate-50 placeholder-slate-400"
          />
        </div>
        
        <div className="overflow-y-auto flex-grow pr-1 -mr-1">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              <p className="text-center font-medium">No users found</p>
              <p className="text-sm text-slate-400">Try a different search term</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredUsers.map((user) => (
                <li
                  key={user._id}
                  className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer rounded-lg transition-colors duration-200 group"
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-blue-200 transition-all duration-200"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white hidden group-hover:block"></div>
                  </div>
                  <div className="flex-grow">
                    <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-200">{user.username}</div>
                    <div className="text-sm text-slate-500">{user.fullName}</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;