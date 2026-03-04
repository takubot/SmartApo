"use client";

import React from "react";
import { Spinner } from "@heroui/react";
import { FileText, ExternalLink, Link } from "lucide-react";
import type { FileReference, ReferenceLink } from "../../types";

interface ChatReferenceListProps {
  files?: FileReference[];
  links?: ReferenceLink[];
  citations?: string[];
  onOpenFile?: (fileId: number) => void;
  loadingFileId?: number | null;
  label?: string;
}

const ChatReferenceList: React.FC<ChatReferenceListProps> = ({
  files = [],
  links = [],
  citations = [],
  onOpenFile,
  loadingFileId,
  label = "参考情報",
}) => {
  const validCitations = citations.filter(
    (url) => url && typeof url === "string" && url.trim() !== "",
  );
  const validFiles = files.filter(
    (ref) => ref && typeof ref.fileId === "number",
  );
  const uniqueFiles = Object.values(
    validFiles.reduce(
      (acc, ref) => {
        const existing = acc[ref.fileId];
        if (!existing) {
          acc[ref.fileId] = {
            ...ref,
            relevantPages: Array.from(new Set(ref.relevantPages || [])),
          };
        } else {
          existing.relevantPages = Array.from(
            new Set([
              ...(existing.relevantPages || []),
              ...(ref.relevantPages || []),
            ]),
          );
          if (!existing.fileName && ref.fileName)
            existing.fileName = ref.fileName;
          if (
            existing.displayFileLink !== false &&
            ref.displayFileLink === false
          ) {
            existing.displayFileLink = false;
          }
        }
        return acc;
      },
      {} as Record<number, FileReference>,
    ),
  );
  const validLinks = links.filter(
    (link) => link && typeof link.referenceLinkId === "number",
  );

  const getDisplayName = (url: string): string => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  if (
    uniqueFiles.length === 0 &&
    validLinks.length === 0 &&
    validCitations.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-0.5 sm:mt-1 ml-2 sm:ml-3 border-l-2 border-gray-300 pl-2 text-[11px] sm:text-xs text-gray-600 bg-none">
      <p className="font-semibold mb-0.5 text-gray-700 text-[11px] sm:text-xs">
        {label}
      </p>
      <div className="space-y-1.5">
        {uniqueFiles.length > 0 && (
          <ul className="bg-none space-y-0">
            {uniqueFiles.map((ref, idx) => (
              <li
                key={`file-${ref.fileId}-${idx}`}
                className="leading-snug py-0.5"
              >
                <div className="flex items-start gap-1.5">
                  <FileText
                    size={12}
                    className="mt-0.5 flex-shrink-0 text-gray-500 w-3 h-3 sm:w-3.5 sm:h-3.5"
                  />
                  <div className="flex-1 min-w-0">
                    {ref.displayFileLink !== false && ref.fileUrl ? (
                      <a
                        href={ref.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-[11px] sm:text-xs truncate transition-colors duration-150 leading-tight cursor-pointer"
                      >
                        {ref.fileName || "関連ファイル"}
                      </a>
                    ) : ref.displayFileLink !== false && onOpenFile ? (
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800 underline text-[11px] sm:text-xs truncate transition-colors duration-150 leading-tight"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onOpenFile(ref.fileId);
                        }}
                        disabled={loadingFileId === ref.fileId}
                      >
                        {loadingFileId === ref.fileId ? (
                          <Spinner size="sm" />
                        ) : (
                          ref.fileName ||
                          ref.chunkSummaryDescription ||
                          "関連ファイル"
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-600 text-[11px] sm:text-xs truncate leading-tight">
                        {ref.fileName ||
                          ref.chunkSummaryDescription ||
                          "関連ファイル"}
                      </span>
                    )}
                    {ref.relevantPages && ref.relevantPages.length > 0 && (
                      <span className="ml-1 text-gray-400 text-[10px] sm:text-xs">
                        (Pages: {ref.relevantPages.join(", ")})
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {validLinks.length > 0 && (
          <ul className="bg-none space-y-0">
            {validLinks.map((link, idx) => (
              <li
                key={`link-${link.referenceLinkId}-${idx}`}
                className="leading-snug py-0.5"
              >
                <div className="flex items-start gap-1.5">
                  <Link
                    size={12}
                    className="mt-0.5 flex-shrink-0 text-gray-500 w-3 h-3 sm:w-3.5 sm:h-3.5"
                  />
                  <div className="flex-1 min-w-0">
                    {link.linkUrl ? (
                      <a
                        href={link.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-[11px] sm:text-xs truncate transition-colors duration-150 leading-tight cursor-pointer"
                      >
                        {link.linkName || `リンク(ID: ${link.referenceLinkId})`}
                      </a>
                    ) : (
                      <span className="text-gray-600 text-[11px] sm:text-xs truncate leading-tight">
                        {link.linkName || `リンク(ID: ${link.referenceLinkId})`}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {validCitations.length > 0 && (
          <ul className="bg-none space-y-0">
            {validCitations.map((url, idx) => (
              <li key={`citation-${idx}`} className="leading-snug py-0.5">
                <div className="flex items-start gap-1.5">
                  <ExternalLink
                    size={12}
                    className="mt-0.5 flex-shrink-0 text-gray-500 w-3 h-3 sm:w-3.5 sm:h-3.5"
                  />
                  <div className="flex-1 min-w-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-[11px] sm:text-xs truncate transition-colors duration-150 leading-tight"
                      title={url}
                    >
                      [{idx + 1}] {getDisplayName(url)}
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChatReferenceList;
