"use client";

import React from "react";
import { User } from "lucide-react";

interface UserAvatarProps {
  size?: "sm" | "md" | "lg";
  src?: string | null;
  userName?: string | null;
  gradientFrom?: string;
  gradientTo?: string;
}

export const UserAvatar = ({
  size = "md",
  src,
  userName,
  gradientFrom = "primary-400",
  gradientTo = "primary-600",
}: UserAvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28,
  };
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  if (src) {
    return (
      <img
        src={src}
        alt={userName || "Avatar"}
        className={`${sizeClass} rounded-[18px] object-cover flex-shrink-0 shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-[18px] bg-gradient-to-br from-${gradientFrom} to-${gradientTo} flex items-center justify-center flex-shrink-0 shadow-sm`}
    >
      <User size={iconSize} className="text-white" />
    </div>
  );
};

export default UserAvatar;
