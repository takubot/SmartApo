"use client";

import {
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  Radio,
  RadioGroup,
} from "@heroui/react";
import {
  ArrowRightIcon,
  HashtagIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type MergeStep = "select" | "confirm" | "processing";

type MergeModalProps = {
  isOpen: boolean;
  step: MergeStep;
  selectedCategory: CategoryResponseSchemaType | null;
  selectedTargetCategoryId: number | null;
  searchQuery: string;
  candidates: CategoryResponseSchemaType[];
  onClose: () => void;
  onClearSearch: () => void;
  onChangeSearch: (q: string) => void;
  onSelectTarget: (targetId: number) => void;
  onBackToSelect: () => void;
  onExecute: () => void;
};

export default function MergeModal({
  isOpen,
  step,
  selectedCategory,
  selectedTargetCategoryId,
  searchQuery,
  candidates,
  onClose,
  onClearSearch,
  onChangeSearch,
  onSelectTarget,
  onBackToSelect,
  onExecute,
}: MergeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3>カテゴリーを統合</h3>
          <div className="flex items-center gap-2 text-sm text-default-500">
            <div
              className={`w-2 h-2 rounded-full ${step === "select" ? "bg-primary" : step === "confirm" ? "bg-warning" : "bg-success"}`}
            />
            {step === "select" && "統合先を選択"}
            {step === "confirm" && "統合内容を確認"}
            {step === "processing" && "統合中..."}
          </div>
        </ModalHeader>
        <ModalBody>
          {selectedCategory && (
            <div className="space-y-6">
              <div className="p-4 gradient-primary-light rounded-lg border border-primary-200 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center shadow-sm">
                    <HashtagIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary-900">
                      統合元カテゴリー
                    </h4>
                    <p className="text-lg font-medium text-primary-800">
                      {selectedCategory.categoryName}
                    </p>
                    {/* チャンク数の表示は非表示に変更 */}
                  </div>
                </div>
              </div>

              {step === "select" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        placeholder="統合先カテゴリーを検索..."
                        value={searchQuery}
                        onChange={(e) => onChangeSearch(e.target.value)}
                        className="pl-10"
                        variant="bordered"
                        startContent={
                          <span className="pl-1 text-default-400">🔎</span>
                        }
                      />
                      {searchQuery && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onPress={onClearSearch}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {candidates.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        <RadioGroup
                          value={selectedTargetCategoryId?.toString()}
                          onValueChange={(value) =>
                            onSelectTarget(parseInt(value))
                          }
                        >
                          {candidates.map((category) => (
                            <Radio
                              key={category.categoryId}
                              value={category.categoryId.toString()}
                              classNames={{
                                base: "inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between flex-row-reverse max-w-full cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent data-[selected=true]:border-primary",
                              }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 gradient-primary-light rounded-full flex items-center justify-center shadow-sm">
                                    <HashtagIcon className="w-4 h-4 text-primary-700" />
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {category.categoryName}
                                    </p>
                                    {/* 個別行のチャンク数表示は削除 */}
                                  </div>
                                </div>
                              </div>
                            </Radio>
                          ))}
                        </RadioGroup>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        {/* 空状態のアイコンは残しつつ、チャンク数の表示は元々なし */}
                        <p className="text-default-500">
                          {searchQuery.trim()
                            ? "検索条件に一致するカテゴリーが見つかりませんでした"
                            : "統合可能なカテゴリーがありません"}
                        </p>
                        {searchQuery.trim() && (
                          <p className="text-sm text-default-400 mt-1">
                            検索条件を変更してください
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === "confirm" && (
                <div className="space-y-4">
                  <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
                    <div className="flex items-start gap-3">
                      <InformationCircleIcon className="w-6 h-6 text-warning-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-warning-900 mb-2">
                          統合内容の確認
                        </h4>
                        <div className="space-y-2 text-sm text-warning-800">
                          <p>以下の統合を実行します：</p>
                          <div className="flex items-center gap-2 font-medium">
                            <span className="px-2 py-1 bg-warning-100 rounded">
                              {selectedCategory.categoryName}
                            </span>
                            <ArrowRightIcon className="w-4 h-4" />
                            <span className="px-2 py-1 bg-warning-100 rounded">
                              {/* target name is shown by parent */}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-danger-200 shadow-md">
                      <CardBody className="text-center">
                        <h5 className="font-semibold text-danger-700 mb-2">
                          削除されるカテゴリー
                        </h5>
                        <p className="font-medium">
                          {selectedCategory.categoryName}
                        </p>
                        {/* チャンク数の表示は非表示に変更 */}
                      </CardBody>
                    </Card>

                    <Card className="border border-success-200 shadow-md">
                      <CardBody className="text-center">
                        <h5 className="font-semibold text-success-700 mb-2">
                          統合先カテゴリー
                        </h5>
                        {/* 親で名称を表示することを想定 */}
                        {/* チャンク移動説明と数は非表示に変更 */}
                      </CardBody>
                    </Card>
                  </div>
                </div>
              )}

              {step === "processing" && (
                <div className="text-center py-8">
                  <Progress
                    size="lg"
                    isIndeterminate
                    className="max-w-md mx-auto"
                  />
                  <p className="text-lg font-medium mt-4">
                    カテゴリーを統合中...
                  </p>
                  <p className="text-sm text-default-500 mt-2">
                    チャンクの紐付けを移行しています
                  </p>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {step === "select" && (
            <>
              <Button variant="light" onPress={onClose}>
                キャンセル
              </Button>
              <Button
                color="primary"
                isDisabled={!selectedTargetCategoryId}
                onPress={onBackToSelect}
                className="gradient-primary hover:gradient-primary-hover shadow-md"
              >
                次へ
              </Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="light" onPress={onBackToSelect}>
                戻る
              </Button>
              <Button color="warning" onPress={onExecute} className="shadow-md">
                統合を実行
              </Button>
            </>
          )}
          {step === "processing" && (
            <Button variant="light" isDisabled>
              処理中...
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
