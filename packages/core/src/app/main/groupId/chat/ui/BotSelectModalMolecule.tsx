// app/(main)/chat/molecules/BotSelectModalMolecule.tsx
"use client";
import React from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Avatar,
} from "@heroui/react";

type BotData = {
  botId: number;
  botName: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  botList: BotData[];
  selectedBotId: number | null;
  setSelectedBotId: React.Dispatch<React.SetStateAction<number | null>>;
  iconMap?: Record<number, string>;
};

const BotSelectModalMolecule: React.FC<Props> = ({
  isOpen,
  onClose,
  botList,
  selectedBotId,
  setSelectedBotId,
  iconMap,
}) => {
  // デバッグ用ログ

  const handleSelectBot = (botId: number) => {
    setSelectedBotId(botId);
    onClose();
  };

  const handleClearSelection = () => {
    setSelectedBotId(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      backdrop="blur"
      size="lg"
      classNames={{
        base: "mx-3 sm:mx-0",
        wrapper: "px-3 sm:px-0",
      }}
    >
      <ModalContent className="w-full max-w-full sm:max-w-lg">
        <ModalHeader className="flex flex-col gap-1 p-4 sm:p-6">
          <div className="text-base sm:text-lg font-semibold truncate">
            Botを選択
          </div>
          <div className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            特定のBotに質問するには、下のリストから選択してください
          </div>
        </ModalHeader>
        <ModalBody className="py-3 px-4 sm:py-4 sm:px-6">
          <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto scrollbar-hide">
            {botList.length === 0 ? (
              <div className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm">
                利用可能なBotがありません
              </div>
            ) : (
              <>
                {botList.map((bot) => {
                  return (
                    <div
                      key={bot.botId}
                      className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition touch-friendly shadow-sm ${
                        selectedBotId === bot.botId
                          ? "border-primary-500 gradient-primary-light"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => handleSelectBot(bot.botId)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={iconMap?.[bot.botId] || "/botIcon/default.ico"}
                          size="sm"
                          className="rounded bg-white w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                        />
                        <div className="font-medium text-sm sm:text-base truncate">
                          {bot.botName || `Bot ${bot.botId}`}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div
                  className="p-3 sm:p-4 mt-3 sm:mt-4 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50 text-center text-gray-600 touch-friendly"
                  onClick={handleClearSelection}
                >
                  <span className="text-sm sm:text-base">
                    自動選択 (Bot指定なし)
                  </span>
                </div>
              </>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BotSelectModalMolecule;
