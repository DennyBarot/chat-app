import React from "react";

const DateSeparator = ({ label }) => {
  return (
    <div className="flex justify-center my-4">
      <span className="px-4 py-1 bg-gray-300 text-gray-700 rounded-full text-sm select-none">
        {label}
      </span>
    </div>
  );
};

export default DateSeparator;
