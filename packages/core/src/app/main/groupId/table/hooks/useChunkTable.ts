"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  create_chunk_table_template_v2_chunk_table_template_create__group_id__post,
  list_chunk_table_template_v2_chunk_table_template_list__group_id__post,
  update_chunk_table_template_v2_chunk_table_template_update__group_id__post,
  delete_chunk_table_template_v2_chunk_table_template_delete__group_id___template_id__post,
  create_chunk_table_v2_chunk_table_create__group_id__post,
  list_chunk_table_v2_chunk_table_list__group_id__post,
  delete_chunk_table_v2_chunk_table_delete__group_id___chunk_table_id__post,
  batch_update_chunk_tables_v2_chunk_table_batch_update__group_id__post,
} from "@repo/api-contracts/based_template/service";
import type {
  CreateChunkTableTemplateSchemaType,
  ChunkTableTemplateItemType,
  GetChunkTableTemplateResponseType,
  UpdateChunkTableTemplateSchemaType,
  CreateChunkTableSchemaType,
  ChunkTableItemType,
  GetChunkTableResponseType,
  ListChunkTableTemplateRequestType,
  ListChunkTableRequestType,
  BatchUpdateChunkTableSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import {
  handleErrorWithUI,
  showSuccessToast,
  showLoadingToast,
} from "@common/errorHandler";

interface UseChunkTableOptions {
  groupId: string;
}

interface UseChunkTableReturn {
  // テンプレート関連
  templates: ChunkTableTemplateItemType[] | undefined;
  templatesLoading: boolean;
  templatesError: any;
  createTemplate: (data: CreateChunkTableTemplateSchemaType) => Promise<number>;
  updateTemplate: (data: UpdateChunkTableTemplateSchemaType) => Promise<void>;
  deleteTemplate: (templateId: number) => Promise<void>;
  refreshTemplates: () => void;
  mutateTemplates: () => Promise<any>;

  // テーブルデータ関連
  tables: ChunkTableItemType[] | undefined;
  tablesLoading: boolean;
  tablesError: any;
  createTable: (data: CreateChunkTableSchemaType) => Promise<number>;
  deleteTable: (chunkTableId: number) => Promise<void>;
  refreshTables: () => void;
  mutateTables: () => Promise<any>;

  // テンプレート別データ取得
  getTablesByTemplate: (templateId: number) => ChunkTableItemType[];
  batchUpdateTableRows: (
    templateId: number,
    data: Record<string, unknown>[],
  ) => Promise<void>;

  // 共通
  isMutating: boolean;
}

export const useChunkTable = ({
  groupId,
}: UseChunkTableOptions): UseChunkTableReturn => {
  const [isMutating, setIsMutating] = useState(false);

  // テンプレート一覧取得
  const {
    data: templatesData,
    error: templatesError,
    isLoading: templatesLoading,
    mutate: mutateTemplates,
  } = useSWR(
    `chunk-table-templates-${groupId}`,
    async () => {
      const request: ListChunkTableTemplateRequestType = {
        search: null,
        limit: 100,
        offset: 0,
        sort: "template_id_desc",
      };
      return await list_chunk_table_template_v2_chunk_table_template_list__group_id__post(
        groupId,
        request,
      );
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  // テーブルデータ一覧取得
  const {
    data: tablesData,
    error: tablesError,
    isLoading: tablesLoading,
    mutate: mutateTables,
  } = useSWR(
    `chunk-tables-${groupId}`,
    async () => {
      const request: ListChunkTableRequestType = {
        templateId: null,
        search: null,
        limit: 1000,
        offset: 0,
        sort: "chunk_table_id_desc",
      };

      return await list_chunk_table_v2_chunk_table_list__group_id__post(
        groupId,
        request,
      );
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  // テンプレート作成
  const createTemplate = useCallback(
    async (data: CreateChunkTableTemplateSchemaType): Promise<number> => {
      setIsMutating(true);
      try {
        showLoadingToast("テンプレート作成");
        const response =
          await create_chunk_table_template_v2_chunk_table_template_create__group_id__post(
            groupId,
            data,
          );
        await mutateTemplates();
        showSuccessToast("テンプレート作成");
        return response.templateId;
      } catch (error) {
        handleErrorWithUI(error, "テンプレート作成");
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [groupId, mutateTemplates],
  );

  // テンプレート更新
  const updateTemplate = useCallback(
    async (data: UpdateChunkTableTemplateSchemaType): Promise<void> => {
      setIsMutating(true);
      try {
        showLoadingToast("テンプレート更新");
        await update_chunk_table_template_v2_chunk_table_template_update__group_id__post(
          groupId,
          data,
        );
        await mutateTemplates();
        showSuccessToast("テンプレート更新");
      } catch (error) {
        handleErrorWithUI(error, "テンプレート更新");
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [groupId, mutateTemplates],
  );

  // テンプレート削除
  const deleteTemplate = useCallback(
    async (templateId: number): Promise<void> => {
      setIsMutating(true);
      try {
        showLoadingToast("テンプレート削除");
        await delete_chunk_table_template_v2_chunk_table_template_delete__group_id___template_id__post(
          groupId,
          templateId.toString(),
        );
        await mutateTemplates();
        showSuccessToast("テンプレート削除");
      } catch (error) {
        handleErrorWithUI(error, "テンプレート削除");
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [groupId, mutateTemplates],
  );

  // テーブルデータ作成
  const createTable = useCallback(
    async (data: CreateChunkTableSchemaType): Promise<number> => {
      setIsMutating(true);
      try {
        showLoadingToast("テーブルデータ作成");
        const response =
          await create_chunk_table_v2_chunk_table_create__group_id__post(
            groupId,
            data,
          );
        await mutateTables();
        showSuccessToast("テーブルデータ作成");
        return response.chunkTableId;
      } catch (error) {
        handleErrorWithUI(error, "テーブルデータ作成");
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [groupId, mutateTables],
  );

  // テーブルデータ更新
  // テーブルデータ削除
  const deleteTable = useCallback(
    async (chunkTableId: number): Promise<void> => {
      setIsMutating(true);
      try {
        showLoadingToast("テーブルデータ削除");
        await delete_chunk_table_v2_chunk_table_delete__group_id___chunk_table_id__post(
          groupId,
          chunkTableId.toString(),
        );
        await mutateTables();
        showSuccessToast("テーブルデータ削除");
      } catch (error) {
        handleErrorWithUI(error, "テーブルデータ削除");
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [groupId, mutateTables],
  );

  // テンプレート別データ取得
  const getTablesByTemplate = useCallback(
    (templateId: number): ChunkTableItemType[] => {
      if (!tablesData?.dataList) return [];
      return tablesData.dataList.filter(
        (table: ChunkTableItemType) => table.templateId === templateId,
      );
    },
    [tablesData],
  );

  // テンプレート用データ作成（1行ずつバッチ保存）（非効率なため削除）
  // const createTableForTemplate = useCallback(...)

  // 1行ずつデータを保存する関数（非効率なため削除）
  // const createTableRows = useCallback(...)

  // バッチ更新関数
  const batchUpdateTableRows = useCallback(
    async (
      templateId: number,
      data: Record<string, unknown>[],
    ): Promise<void> => {
      setIsMutating(true);
      try {
        showLoadingToast("テーブルデータ一括更新");
        const request: BatchUpdateChunkTableSchemaType = {
          templateId,
          chunkContent: data,
        };
        await batch_update_chunk_tables_v2_chunk_table_batch_update__group_id__post(
          groupId,
          request,
        );
        await mutateTables();
        showSuccessToast("テーブルデータ一括更新");
      } catch (error) {
        handleErrorWithUI(error, "テーブルデータ一括更新");
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [groupId, mutateTables],
  );

  // リフレッシュ関数
  const refreshTemplates = useCallback(() => {
    mutateTemplates();
  }, [mutateTemplates]);

  const refreshTables = useCallback(() => {
    mutateTables();
  }, [mutateTables]);

  return {
    // テンプレート関連
    templates: templatesData?.dataList,
    templatesLoading,
    templatesError,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refreshTemplates,
    mutateTemplates,

    // テーブルデータ関連
    tables: tablesData?.dataList,
    tablesLoading,
    tablesError,
    createTable,
    deleteTable,
    refreshTables,
    mutateTables,

    // テンプレート別データ取得
    getTablesByTemplate,

    // バッチ処理関数
    batchUpdateTableRows,

    // 共通
    isMutating,
  };
};
