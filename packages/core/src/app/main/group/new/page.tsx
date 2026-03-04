"use client";

import React, { useId } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import {
  create_group_v2_group_create_post,
  switch_group_config_v2_group_switch_group_config__group_id__put,
} from "@repo/api-contracts/based_template/service";
import type { GroupCreateRequestSchemaType } from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import { mutate as globalMutate } from "swr";

// フォームの入力値の型
type GroupCreateForm = GroupCreateRequestSchemaType;

export default function NewGroupPage() {
  const router = useRouter();

  // 一意のIDを生成（SSRとクライアントで一貫性を保つ）
  const groupNameId = useId();
  const groupDescriptionId = useId();
  const tagId = useId();

  // react-hook-form で管理する
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid, errors },
  } = useForm<GroupCreateForm>({
    mode: "onChange", // 入力ごとにバリデーションを実施
  });

  // フォーム送信時に実行されるハンドラ
  const onSubmit: SubmitHandler<GroupCreateForm> = async (data) => {
    try {
      // 1. グループを作成
      const createResponse = await create_group_v2_group_create_post({
        groupName: data.groupName,
        groupDescription: data.groupDescription,
        tag: data.tag,
      });

      // 2. 作成されたグループのIDを取得してグループ設定を更新
      if (createResponse && createResponse.groupId) {
        try {
          await switch_group_config_v2_group_switch_group_config__group_id__put(
            createResponse.groupId,
            {
              allowGeneralInfoAnswers: true,
            },
          );
        } catch (configError) {
          // グループ設定の更新に失敗してもグループ作成は成功しているので続行
          handleErrorWithUI(configError, "グループ設定更新");
        }
      }

      showSuccessToast("グループを作成しました");

      await globalMutate("user-group-list");

      // 作成成功後にリダイレクト
      router.push("/main/group/home");
    } catch (error) {
      handleErrorWithUI(error, "グループ作成");
    }
  };

  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto bg-gradient-to-br from-indigo-50 via-white to-sky-50">
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-6">
          {/* ヘッダー */}
          <div>
            <p className="text-xs font-semibold text-primary-600 tracking-wide uppercase mb-1">
              グループ管理
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
              新しいグループを作成
            </h1>
            <p className="text-sm text-default-500">
              チームやプロジェクトごとにグループを作成し、チャットボットやデータを整理して管理できます。
            </p>
          </div>

          {/* カードフォーム */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-default-200 shadow-sm p-5 md:p-7">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    グループ名
                  </span>
                  <span className="text-xs text-red-500 font-medium">必須</span>
                </div>
                <Input
                  labelPlacement="outside"
                  id={groupNameId}
                  type="text"
                  variant="bordered"
                  placeholder="例）カスタマーサポートチーム"
                  {...register("groupName", { required: true })}
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    input:
                      "focus:outline-none focus-visible:outline-none text-sm",
                    inputWrapper:
                      "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                  }}
                />
                {errors.groupName && (
                  <p className="text-xs text-red-500">グループ名は必須です。</p>
                )}
                <p className="text-xs text-default-500">
                  チームメンバーが理解しやすい名前を入力してください。
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-900">
                  グループの説明文
                  <span className="ml-1 text-xs text-default-400">(任意)</span>
                </span>
                <Input
                  labelPlacement="outside"
                  id={groupDescriptionId}
                  type="text"
                  variant="bordered"
                  placeholder="グループの目的や利用シーンを簡潔に記載してください"
                  {...register("groupDescription")}
                  classNames={{
                    input:
                      "focus:outline-none focus-visible:outline-none text-sm",
                    inputWrapper:
                      "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                  }}
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-900">
                  タグ
                  <span className="ml-1 text-xs text-default-400">(任意)</span>
                </span>
                <Input
                  labelPlacement="outside"
                  id={tagId}
                  type="text"
                  variant="bordered"
                  placeholder="例）CS、営業、社内FAQ など"
                  {...register("tag")}
                  classNames={{
                    input:
                      "focus:outline-none focus-visible:outline-none text-sm",
                    inputWrapper:
                      "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                  }}
                />
                <p className="text-xs text-default-500">
                  後からグループを検索・整理しやすくするためのキーワードです。
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  color="primary"
                  className="px-6 md:px-8"
                  isDisabled={isSubmitting || !isValid}
                >
                  {isSubmitting ? "作成中..." : "グループを作成する"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
