import React from "react";

interface LoadingScreenProps {
  /**
   * If true, the loader will cover the whole viewport using fixed positioning.
   * Otherwise it will just center inside its parent container.
   */
  fullScreen?: boolean;
  /** Optional message under the loader */
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullScreen = false,
  message = "Loading...",
}) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-50"
    : "flex items-center justify-center w-full h-full";

  return (
    <div className={containerClasses} aria-label="loading">
      <div className="flex flex-col items-center gap-4">
        {/* Circular spinner */}
        <div
          className="animate-spin"
          style={{
            width: "2.5rem",
            height: "2.5rem",
            borderWidth: "4px",
            borderStyle: "solid",
            borderColor: "#3b82f6",
            borderTopColor: "transparent",
            borderRadius: "50%",
          }}
        ></div>
        {message && (
          <p className="text-sm text-gray-700 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};
