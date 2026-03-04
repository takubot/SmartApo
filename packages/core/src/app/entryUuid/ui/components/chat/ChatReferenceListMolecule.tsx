"use client";

import React from "react";
import ChatReferenceList from "../feedback/ChatReferenceList";
import type { FileReferenceLinkJson } from "../../../types";
import { FileReferenceSchema, ReferenceLinkSchema } from "../../../types";
import type { FileReference, ReferenceLink } from "../../../types";

interface ChatReferenceListMoleculeProps {
  fileReferenceLinkJson?: FileReferenceLinkJson | null;
}

/**
 * 外部チャット用 参照情報ラッパー
 *
 * fileReferenceLinkJson を共通の ChatReferenceList のプロップスに変換。
 */
const ChatReferenceListMolecule: React.FC<ChatReferenceListMoleculeProps> = ({
  fileReferenceLinkJson,
}) => {
  // zodスキーマで検証してファイル参照を取得
  const files: FileReference[] = React.useMemo(() => {
    if (!fileReferenceLinkJson || !Array.isArray(fileReferenceLinkJson.files))
      return [];
    return fileReferenceLinkJson.files
      .map((file) => {
        const result = FileReferenceSchema.safeParse(file);
        if (!result.success) {
          console.warn("File reference validation failed:", result.error);
          return null;
        }
        return result.data;
      })
      .filter((file): file is FileReference => Boolean(file));
  }, [fileReferenceLinkJson]);

  // zodスキーマで検証してリンク参照を取得
  const links: ReferenceLink[] = React.useMemo(() => {
    if (!fileReferenceLinkJson || !Array.isArray(fileReferenceLinkJson.links))
      return [];
    return fileReferenceLinkJson.links
      .map((link) => {
        const result = ReferenceLinkSchema.safeParse(link);
        if (!result.success) {
          console.warn("Reference link validation failed:", result.error);
          return null;
        }
        return result.data;
      })
      .filter((link): link is ReferenceLink => Boolean(link));
  }, [fileReferenceLinkJson]);

  return <ChatReferenceList files={files} links={links} />;
};

export default ChatReferenceListMolecule;
