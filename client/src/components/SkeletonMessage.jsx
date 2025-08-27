import React from "react";

const SkeletonMessage = ({ isOwnMessage = false }) => {
  return (
    <div className={`flex gap-3 mb-4 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      {!isOwnMessage && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
        </div>
      )}
      <div className={`max-w-xs ${isOwnMessage ? "order-1" : "order-2"}`}>
        <div className={`p-3 rounded-2xl ${isOwnMessage ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-800"}`}>
          <div className="space-y-2">
            <div className="h-4 bg-gray-400 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-400 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
        <div className={`text-xs mt-1 text-gray-500 ${isOwnMessage ? "text-right" : "text-left"}`}>
          <div className="h-3 bg-gray-300 rounded animate-pulse w-16"></div>
        </div>
      </div>
      {isOwnMessage && (
        <div className="flex-shrink-0 order-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

export const SkeletonMessageList = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonMessage key={index} isOwnMessage={index % 3 === 0} />
      ))}
    </div>
  );
};

export default SkeletonMessage;
