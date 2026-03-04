"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
} from "@heroui/react";
import {
  HashtagIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type MultiMergeModalProps = {
  isOpen: boolean;
  isMerging: boolean;
  selectedCategories: CategoryResponseSchemaType[];
  selectedTargetId: number | null;
  onChangeTargetId: (id: number) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function MultiMergeModal({
  isOpen,
  isMerging,
  selectedCategories,
  selectedTargetId,
  onChangeTargetId,
  onClose,
  onConfirm,
}: MultiMergeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>選択したカテゴリーを統合</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-6 h-6 text-warning-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-warning-900">
                    残すカテゴリーを1つ選んでください
                  </h4>
                  <p className="text-sm text-warning-800">
                    残したカテゴリーに、他の選択されたカテゴリーの紐付けを統合します。
                  </p>
                </div>
              </div>
            </div>
            <RadioGroup
              value={selectedTargetId?.toString()}
              onValueChange={(val) => onChangeTargetId(parseInt(val))}
            >
              {selectedCategories.map((category) => (
                <Radio
                  key={category.categoryId}
                  value={category.categoryId.toString()}
                  classNames={{
                    base: "inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between flex-row-reverse max-w-full cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent data-[selected=true]:border-warning",
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 gradient-primary-light rounded-full flex items-center justify-center shadow-sm">
                        <HashtagIcon className="w-4 h-4 text-primary-700" />
                      </div>
                      <div>
                        <p className="font-medium">{category.categoryName}</p>
                        {/* チャンク数の表示は削除 */}
                      </div>
                    </div>
                  </div>
                </Radio>
              ))}
            </RadioGroup>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isMerging}>
            キャンセル
          </Button>
          <Button
            color="warning"
            onPress={onConfirm}
            isLoading={isMerging}
            isDisabled={!selectedTargetId}
          >
            統合を実行
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
