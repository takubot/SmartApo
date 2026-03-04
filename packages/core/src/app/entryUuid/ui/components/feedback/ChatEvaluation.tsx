"use client";

import React from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { EvaluationEnumType } from "@repo/api-contracts/based_template/zschema";

interface ChatEvaluationProps {
  evaluation: EvaluationEnumType | null;
  onEvaluate: (evaluation: "GOOD" | "BAD") => void;
  disabled?: boolean;
}

const ChatEvaluation: React.FC<ChatEvaluationProps> = ({
  evaluation,
  onEvaluate,
  disabled = false,
}) => {
  return (
    <div className="flex gap-1">
      <button
        className={`p-1 rounded-full transition-colors ${
          evaluation === "GOOD"
            ? "bg-green-100 text-green-600"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
        onClick={() => onEvaluate("GOOD")}
        aria-label="Good"
        disabled={disabled}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        className={`p-1 rounded-full transition-colors ${
          evaluation === "BAD"
            ? "bg-red-100 text-red-600"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
        onClick={() => onEvaluate("BAD")}
        aria-label="Bad"
        disabled={disabled}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
};

export default ChatEvaluation;
