import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Switch,
} from "@heroui/react";
import { Settings, CheckCircle2, Info } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  settings: any;
  handleConnectGoogle: () => void;
  handleSetupWebhook: () => void;
  handleUpdateSettings: (settings: any) => void;
}

export function SettingsModal({
  isOpen,
  onOpenChange,
  settings,
  handleConnectGoogle,
  handleSetupWebhook,
  handleUpdateSettings,
}: SettingsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      classNames={{
        base: "bg-white text-default-900 border border-divider rounded-2xl mx-2 sm:mx-0",
        header: "border-b border-divider",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              予約システム連携設定
            </ModalHeader>
            <ModalBody className="space-y-6 py-5 sm:py-8">
              <div className="p-5 bg-default-50 rounded-xl border border-divider shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="font-bold flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <img
                        src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
                        className="w-5 h-5"
                        alt="G"
                      />
                    </div>
                    <div>
                      <div className="text-default-900">
                        Google Calendar 連携
                      </div>
                      <div className="text-[10px] text-default-400 font-normal">
                        {settings?.isGoogleConnected ? (
                          <span className="text-success flex items-center gap-1">
                            <CheckCircle2 size={10} /> 連携済み
                          </span>
                        ) : (
                          "未連携"
                        )}
                      </div>
                    </div>
                  </div>
                  {settings?.isGoogleConnected ? (
                    <Switch
                      isSelected={settings?.calendarSyncEnabled}
                      onValueChange={(v) =>
                        handleUpdateSettings({ calendarSyncEnabled: v })
                      }
                      color="primary"
                    />
                  ) : (
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      onClick={handleConnectGoogle}
                    >
                      連携する
                    </Button>
                  )}
                </div>

                {settings?.isGoogleConnected && (
                  <div className="space-y-4">
                    <Input
                      label="カレンダーID"
                      placeholder="primary または メールアドレス"
                      value={settings?.calendarId || ""}
                      onValueChange={(v) =>
                        handleUpdateSettings({ calendarId: v })
                      }
                      variant="bordered"
                      size="sm"
                      labelPlacement="outside"
                      isDisabled={!settings?.calendarSyncEnabled}
                      classNames={{
                        inputWrapper: "bg-white border-divider",
                        label: "text-default-600 font-medium",
                      }}
                    />

                    {settings?.calendarSyncEnabled && (
                      <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="text-[10px] text-primary font-medium flex items-center gap-1">
                          <Info size={12} />
                          リアルタイム同期（Webhook）
                        </div>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          className="h-6 text-[10px]"
                          onClick={handleSetupWebhook}
                        >
                          {settings?.webhookExpiration
                            ? "同期を更新"
                            : "有効化"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-default-700">
                    管理者へ通知
                  </span>
                  <Switch defaultSelected size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-default-700">
                    予約者にリマインド
                  </span>
                  <Switch defaultSelected size="sm" />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="primary"
                variant="flat"
                onPress={onClose}
                className="w-full font-bold"
              >
                完了
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
