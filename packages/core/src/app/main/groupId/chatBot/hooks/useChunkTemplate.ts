import { addToast } from "@heroui/react";
import { list_templates_for_bot_v2_bot_get__group_id___bot_id__template_list_get } from "@repo/api-contracts/based_template/service";
import type {
  BotResponseSchemaType,
  ChunkTableTemplateResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { useCallback, useState } from "react";
import { useGroupContext } from "../../layout-client";
import type { ChunkTableItem } from "../types";
import { handleErrorWithUI } from "@common/errorHandler";

export function useChunkTemplate(refreshBotList?: () => Promise<void>) {
  const groupId = useGroupContext();
  const [isChunkTableEditModalOpen, setIsChunkTableEditModalOpen] =
    useState(false);
  const [chunkTableEditBot, setChunkTableEditBot] =
    useState<BotResponseSchemaType | null>(null);
  const [chunkTableListForEdit, setChunkTableListForEdit] = useState<
    ChunkTableItem[]
  >([]);
  const [isChunkTableListLoading, setIsChunkTableListLoading] = useState(false);

  // 新規作成用テーブル一覧取得（編集用の関数を流用）
  const fetchChunkTablesForCreate = useCallback(async () => {
    if (!groupId) {
      handleErrorWithUI(
        { message: "グループIDが不正です。" },
        "テーブル一覧取得",
      );
      return [];
    }

    setIsChunkTableListLoading(true);
    try {
      // 新規作成時はbot_id=0で全テーブルを取得（isAssociated=false）
      const response: ChunkTableTemplateResponseSchemaType[] =
        await list_templates_for_bot_v2_bot_get__group_id___bot_id__template_list_get(
          groupId,
          "0",
        );

      const chunkTableList = response.map(
        (template: ChunkTableTemplateResponseSchemaType) => ({
          templateId: template.templateId,
          templateName: template.templateName,
          isAssociated: false, // 新規作成時は常にfalse
        }),
      );

      setChunkTableListForEdit(chunkTableList);
      return chunkTableList;
    } catch (error) {
      handleErrorWithUI(error, "テーブル一覧取得");
      setChunkTableListForEdit([]);
      return [];
    } finally {
      setIsChunkTableListLoading(false);
    }
  }, [groupId]);

  // 編集モーダル用テーブル一覧取得
  const openChunkTableEditModal = useCallback(
    async (bot: BotResponseSchemaType) => {
      if (!groupId) {
        handleErrorWithUI(
          { message: "グループIDが不正です。" },
          "テーブル一覧取得",
        );
        return;
      }

      setChunkTableEditBot(bot);
      setIsChunkTableEditModalOpen(true);
      setIsChunkTableListLoading(true);

      try {
        const response: ChunkTableTemplateResponseSchemaType[] =
          await list_templates_for_bot_v2_bot_get__group_id___bot_id__template_list_get(
            groupId,
            bot.botId.toString(),
          );

        const chunkTableList = response.map(
          (template: ChunkTableTemplateResponseSchemaType) => ({
            templateId: template.templateId,
            templateName: template.templateName,
            isAssociated: template.isAssociated,
          }),
        );

        setChunkTableListForEdit(chunkTableList);
      } catch (error) {
        handleErrorWithUI(error, "テーブル一覧取得");
        setChunkTableListForEdit([]);
      } finally {
        setIsChunkTableListLoading(false);
      }
    },
    [groupId],
  );

  // テーブル編集モーダルを閉じる
  const closeChunkTableEditModal = useCallback(() => {
    setIsChunkTableEditModalOpen(false);
    setChunkTableEditBot(null);
    setChunkTableListForEdit([]);
  }, []);

  return {
    // 状態
    isChunkTableEditModalOpen,
    chunkTableEditBot,
    chunkTableListForEdit,
    isChunkTableListLoading,

    // 操作
    openChunkTableEditModal,
    closeChunkTableEditModal,
    fetchChunkTablesForCreate,
    setChunkTableListForEdit,
  };
}
