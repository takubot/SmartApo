"use client";

import { addToast } from "@heroui/react";
import {
  complete_mail_attachment_upload_v2_mail_attachment_complete_upload__group_id__post,
  create_mail_sender_config_v2_mail_sender__group_id__post,
  create_mail_template_v2_mail_template__group_id__post,
  delete_mail_sender_config_v2_mail_sender__group_id___sender_config_id__delete,
  get_mail_attachment_upload_url_v2_mail_attachment_upload_url__group_id__post,
  list_booking_menus_v2_booking_menu_list__group_id__get,
  list_external_users_for_mail_v2_user_manage_external_users__group_id__get,
  list_mail_sender_configs_v2_mail_sender__group_id__get,
  list_mail_templates_v2_mail_template__group_id__get,
  send_mail_to_external_users_v2_mail_send__group_id__post,
  update_mail_sender_config_v2_mail_sender__group_id___sender_config_id__patch,
} from "@repo/api-contracts/based_template/service";
import type {
  ExternalUserForMailListResponseType,
  BookingMenuResponseSchemaType,
  MailAttachmentUploadUrlResponseType,
  MailSenderConfigCreateRequestType,
  MailSenderConfigListResponseType,
  MailSenderConfigUpdateRequestType,
  MailTemplateCreateRequestType,
  MailTemplateListResponseType,
  SendExternalUserMailResponseType,
} from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

type ExternalUser = NonNullable<
  ExternalUserForMailListResponseType["userList"]
>[number];

export const normalizeExternalUserId = (
  externalUserId: string | number | null | undefined,
): string => String(externalUserId ?? "");

const parseEmailListInput = (rawValue: string): string[] => {
  const tokenList = rawValue
    .split(/[\n,;]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(tokenList));
};

const convertHtmlToPlainText = (htmlValue: string): string => {
  return htmlValue
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
};

export type UseExternalUserManageResult = ReturnType<
  typeof useExternalUserManage
>;

export function useExternalUserManage(groupId: string) {
  const [activeTab, setActiveTab] = useState<"users" | "template" | "sender">(
    "users",
  );
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyFormat, setBodyFormat] = useState<"text" | "html">("text");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [showCcInput, setShowCcInput] = useState(false);
  const [showBccInput, setShowBccInput] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [bookingMenuFilter, setBookingMenuFilter] = useState("none");
  const [sendTargetFilter, setSendTargetFilter] = useState<
    "all" | "unsent" | "sent"
  >("all");
  const [allowResend, setAllowResend] = useState(false);
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedSenderConfigId, setSelectedSenderConfigId] =
    useState<string>("");
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [selectedUserIdSet, setSelectedUserIdSet] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAttachmentFileUrlList, setSelectedAttachmentFileUrlList] =
    useState<string[]>([]);
  const [attachmentMetaMap, setAttachmentMetaMap] = useState<
    Record<string, string>
  >({});
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [editingSenderConfigId, setEditingSenderConfigId] =
    useState<string>("");
  const [senderNameInput, setSenderNameInput] = useState("");
  const [senderEmailInput, setSenderEmailInput] = useState("");
  const [senderAppPasswordInput, setSenderAppPasswordInput] = useState("");
  const [isSavingSenderConfig, setIsSavingSenderConfig] = useState(false);
  const [deletingSenderConfigId, setDeletingSenderConfigId] =
    useState<string>("");
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const { data: externalUsersData, mutate: mutateExternalUsers } = useSWR(
    groupId ? `external-users-for-mail-${groupId}` : null,
    () =>
      list_external_users_for_mail_v2_user_manage_external_users__group_id__get(
        groupId,
      ),
  );
  const { data: mailTemplatesData, mutate: mutateMailTemplates } = useSWR(
    groupId ? `mail-template-list-${groupId}` : null,
    () => list_mail_templates_v2_mail_template__group_id__get(groupId),
  );
  const { data: bookingMenusData } = useSWR(
    groupId ? `booking-menu-list-${groupId}` : null,
    () => list_booking_menus_v2_booking_menu_list__group_id__get(groupId),
  );
  const { data: senderConfigsData, mutate: mutateSenderConfigs } = useSWR(
    groupId ? `mail-sender-config-list-${groupId}` : null,
    () => list_mail_sender_configs_v2_mail_sender__group_id__get(groupId),
  );

  const externalUsers = useMemo(() => {
    return (
      (externalUsersData as ExternalUserForMailListResponseType | undefined)
        ?.userList ?? []
    );
  }, [externalUsersData]);

  const mailTemplateList = useMemo(() => {
    return (
      (mailTemplatesData as MailTemplateListResponseType | undefined)
        ?.mailTemplateList ?? []
    );
  }, [mailTemplatesData]);

  const visibleTemplateList = useMemo(() => {
    const keyword = templateSearchTerm.trim().toLowerCase();
    if (!keyword) return mailTemplateList;
    return mailTemplateList.filter((template) => {
      const templateNameValue = template.templateName?.toLowerCase() ?? "";
      const subjectValue = template.subject?.toLowerCase() ?? "";
      return (
        templateNameValue.includes(keyword) || subjectValue.includes(keyword)
      );
    });
  }, [mailTemplateList, templateSearchTerm]);

  const senderConfigList = useMemo(() => {
    return (
      (senderConfigsData as MailSenderConfigListResponseType | undefined)
        ?.senderConfigList ?? []
    );
  }, [senderConfigsData]);

  const bookingMenuList = useMemo(() => {
    return (
      (bookingMenusData as BookingMenuResponseSchemaType[] | undefined) ?? []
    );
  }, [bookingMenusData]);

  const tagOptionList = useMemo(() => {
    const tagSet = new Set<string>();
    externalUsers.forEach((user) => {
      (user.externalUserTagList ?? []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "ja"));
  }, [externalUsers]);

  const bookingMenuOptionList = useMemo(() => {
    return bookingMenuList
      .map((menu) => ({
        key: String(menu.menuId),
        label: menu.title ?? `メニュー ${menu.menuId}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ja"));
  }, [bookingMenuList]);

  useEffect(() => {
    if (bookingMenuFilter === "none") return;
    const availableMenuIdSet = new Set(
      bookingMenuOptionList.map((menu) => menu.key),
    );
    if (!availableMenuIdSet.has(bookingMenuFilter)) {
      setBookingMenuFilter("none");
    }
  }, [bookingMenuFilter, bookingMenuOptionList]);

  const selectedTemplateIdNumber = useMemo(() => {
    if (!selectedTemplateId) return null;
    const parsed = Number(selectedTemplateId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [selectedTemplateId]);

  const filteredUsers = useMemo(() => {
    const bookingMenuId = Number(bookingMenuFilter);
    const hasValidBookingMenuFilter =
      bookingMenuFilter !== "none" && Number.isFinite(bookingMenuId);

    return externalUsers.filter((user) => {
      if (
        hasValidBookingMenuFilter &&
        !(user.bookingMenuIdList ?? []).includes(bookingMenuId)
      ) {
        return false;
      }
      if (
        selectedTag !== "all" &&
        !(user.externalUserTagList ?? []).includes(selectedTag)
      ) {
        return false;
      }
      if (selectedTemplateIdNumber !== null) {
        const isSent = (user.sentMailTemplateIdList ?? []).includes(
          selectedTemplateIdNumber,
        );
        if (sendTargetFilter === "unsent" && isSent) return false;
        if (sendTargetFilter === "sent" && !isSent) return false;
      }
      return true;
    });
  }, [
    bookingMenuFilter,
    externalUsers,
    selectedTag,
    selectedTemplateIdNumber,
    sendTargetFilter,
  ]);

  const searchedUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return filteredUsers;
    return filteredUsers.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? "";
      const email = user.email?.toLowerCase() ?? "";
      return name.includes(keyword) || email.includes(keyword);
    });
  }, [filteredUsers, searchTerm]);

  const selectableUserIdList = useMemo(() => {
    return searchedUsers
      .map((user) => normalizeExternalUserId(user.externalUserId))
      .filter((userId) => userId.length > 0);
  }, [searchedUsers]);

  useEffect(() => {
    const existingIdSet = new Set(
      externalUsers
        .map((user) => normalizeExternalUserId(user.externalUserId))
        .filter((userId) => userId.length > 0),
    );
    setSelectedUserIdSet((prev) => {
      const next = new Set(
        Array.from(prev).filter((userId) => existingIdSet.has(userId)),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [externalUsers]);

  const isAllFilteredUsersSelected =
    selectableUserIdList.length > 0 &&
    selectableUserIdList.every((userId) => selectedUserIdSet.has(userId));

  const isUserMailable = (user: ExternalUser) => Boolean(user.email);

  const handleToggleUser = (externalUserId: string, checked: boolean) => {
    if (!externalUserId) return;
    setSelectedUserIdSet((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(externalUserId);
      } else {
        next.delete(externalUserId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedUserIdSet((prev) => {
      const next = new Set(prev);
      selectableUserIdList.forEach((userId) => {
        if (checked) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
      });
      return next;
    });
  };

  const handleCreateTemplate = async () => {
    if (!groupId) return;
    const normalizedBodyText = bodyText.trim();
    const normalizedBodyHtml = bodyHtml.trim();
    const hasBody =
      bodyFormat === "text"
        ? normalizedBodyText.length > 0
        : normalizedBodyHtml.length > 0;

    if (!templateName.trim() || !subject.trim() || !hasBody) {
      addToast({
        title: "入力不足",
        description:
          "テンプレート名・件名・本文は必須です（本文形式に応じて入力してください）",
        color: "warning",
      });
      return;
    }

    const requestBodyText =
      normalizedBodyText ||
      (bodyFormat === "html" ? convertHtmlToPlainText(normalizedBodyHtml) : "");
    const requestBodyHtml = normalizedBodyHtml || null;

    const requestBody: MailTemplateCreateRequestType = {
      templateName: templateName.trim(),
      subject: subject.trim(),
      bodyText: requestBodyText,
      bodyHtml: requestBodyHtml,
      bodyFormat,
      ccList: parseEmailListInput(ccInput),
      bccList: parseEmailListInput(bccInput),
      attachmentFileUrlList: selectedAttachmentFileUrlList,
    };
    setIsCreatingTemplate(true);
    try {
      const createdTemplate =
        await create_mail_template_v2_mail_template__group_id__post(
          groupId,
          requestBody,
        );
      await mutateMailTemplates();
      setTemplateName("");
      setSubject("");
      setBodyText("");
      setBodyHtml("");
      setBodyFormat("text");
      setCcInput("");
      setBccInput("");
      setShowCcInput(false);
      setShowBccInput(false);
      setIsPreviewFullscreen(false);
      setSelectedAttachmentFileUrlList([]);
      setAttachmentMetaMap({});
      if (createdTemplate?.mailTemplateId) {
        setSelectedTemplateId(String(createdTemplate.mailTemplateId));
      }
      showSuccessToast("メールテンプレートを作成しました");
    } catch (error) {
      handleErrorWithUI(error, "メールテンプレート作成");
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const handleSendBulkMail = async () => {
    if (!groupId) return;
    if (!selectedTemplateId) {
      addToast({
        title: "テンプレート未選択",
        description: "送信するメールテンプレートを選択してください",
        color: "warning",
      });
      return;
    }
    if (selectedUserIdSet.size === 0) {
      addToast({
        title: "送信対象未選択",
        description: "送信対象の外部ユーザーを1件以上選択してください",
        color: "warning",
      });
      return;
    }

    const selectedUserList = externalUsers.filter((user) =>
      selectedUserIdSet.has(normalizeExternalUserId(user.externalUserId)),
    );
    const noEmailUserList = selectedUserList.filter((user) => !user.email);
    if (noEmailUserList.length > 0) {
      addToast({
        title: "送信対象にメール未登録ユーザーが含まれています",
        description: "メール未登録ユーザーを除外してから再実行してください",
        color: "warning",
      });
      return;
    }

    if (!allowResend && selectedTemplateIdNumber !== null) {
      const alreadySentUserCount = selectedUserList.filter((user) =>
        (user.sentMailTemplateIdList ?? []).includes(selectedTemplateIdNumber),
      ).length;
      if (alreadySentUserCount > 0) {
        addToast({
          title: "送信済みユーザーが含まれています",
          description:
            "再送を許可する場合は「送信済みにも再送する」をONにしてください",
          color: "warning",
        });
        return;
      }
    }

    setIsSendingMail(true);
    try {
      const response =
        (await send_mail_to_external_users_v2_mail_send__group_id__post(
          groupId,
          {
            externalUserIdList: Array.from(selectedUserIdSet),
            mailTemplateId: Number(selectedTemplateId),
            senderConfigId: selectedSenderConfigId
              ? Number(selectedSenderConfigId)
              : undefined,
            attachmentFileUrlList: selectedAttachmentFileUrlList,
          },
        )) as SendExternalUserMailResponseType;

      const resultList = response?.resultList ?? [];
      const successCount = resultList.filter((result) => result.success).length;
      addToast({
        title: "一斉送信が完了しました",
        description: `${successCount}/${resultList.length} 件送信成功`,
        color: successCount === resultList.length ? "success" : "warning",
      });
      setSelectedUserIdSet(new Set());
      await mutateExternalUsers();
    } catch (error) {
      handleErrorWithUI(error, "一斉メール送信");
    } finally {
      setIsSendingMail(false);
    }
  };

  const handleOpenAttachmentPicker = () => {
    attachmentInputRef.current?.click();
  };

  const handleAttachmentFileSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!groupId) return;
    const fileList = Array.from(event.target.files ?? []);
    if (fileList.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      const uploadedFileUrls: string[] = [];
      const nextMetaEntries: Record<string, string> = {};

      for (const file of fileList) {
        const uploadInfo =
          (await get_mail_attachment_upload_url_v2_mail_attachment_upload_url__group_id__post(
            groupId,
            {
              fileName: file.name,
              fileSizeBytes: file.size,
              contentType: file.type || "application/octet-stream",
            },
          )) as MailAttachmentUploadUrlResponseType;
        if (!uploadInfo?.signedUrl || !uploadInfo?.attachmentFileUrl) {
          throw new Error("添付アップロードURLの取得に失敗しました");
        }

        const uploadResponse = await fetch(uploadInfo.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });
        if (!uploadResponse.ok) {
          throw new Error(`${file.name} のアップロードに失敗しました`);
        }

        await complete_mail_attachment_upload_v2_mail_attachment_complete_upload__group_id__post(
          groupId,
          {
            attachmentFileUrl: uploadInfo.attachmentFileUrl,
          },
        );
        uploadedFileUrls.push(uploadInfo.attachmentFileUrl);
        nextMetaEntries[uploadInfo.attachmentFileUrl] = file.name;
      }

      setSelectedAttachmentFileUrlList((prev) =>
        Array.from(new Set([...prev, ...uploadedFileUrls])),
      );
      setAttachmentMetaMap((prev) => ({
        ...prev,
        ...nextMetaEntries,
      }));
      addToast({
        title: "添付ファイルをアップロードしました",
        description: `${uploadedFileUrls.length} 件`,
        color: "success",
      });
    } catch (error) {
      handleErrorWithUI(error, "添付ファイルアップロード");
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  };

  const handleRemoveAttachment = (attachmentFileUrl: string) => {
    setSelectedAttachmentFileUrlList((prev) =>
      prev.filter((fileUrl) => fileUrl !== attachmentFileUrl),
    );
  };

  const handleSelectTemplate = (templateId: string) => {
    const targetTemplate = mailTemplateList.find(
      (template) => String(template.mailTemplateId) === templateId,
    );
    if (!targetTemplate) return;
    setSelectedTemplateId(templateId);
    setTemplateName(targetTemplate.templateName ?? "");
    setSubject(targetTemplate.subject ?? "");
    setBodyText(targetTemplate.bodyText ?? "");
    setBodyHtml(targetTemplate.bodyHtml ?? "");
    setBodyFormat(
      targetTemplate.bodyFormat === "html" ||
        targetTemplate.bodyFormat === "text"
        ? targetTemplate.bodyFormat
        : targetTemplate.bodyHtml
          ? "html"
          : "text",
    );
    setCcInput((targetTemplate.ccList ?? []).join(", "));
    setBccInput((targetTemplate.bccList ?? []).join(", "));
    setShowCcInput((targetTemplate.ccList ?? []).length > 0);
    setShowBccInput((targetTemplate.bccList ?? []).length > 0);
    setIsPreviewFullscreen(false);
    setSelectedAttachmentFileUrlList(
      targetTemplate.attachmentFileUrlList ?? [],
    );
  };

  const resetSenderForm = () => {
    setEditingSenderConfigId("");
    setSenderNameInput("");
    setSenderEmailInput("");
    setSenderAppPasswordInput("");
  };

  const handleStartEditSenderConfig = (senderConfigId: string) => {
    const targetSenderConfig = senderConfigList.find(
      (senderConfig) => String(senderConfig.senderConfigId) === senderConfigId,
    );
    if (!targetSenderConfig) return;
    setEditingSenderConfigId(senderConfigId);
    setSenderNameInput(targetSenderConfig.senderName ?? "");
    setSenderEmailInput(targetSenderConfig.senderEmail ?? "");
    setSenderAppPasswordInput("");
  };

  const handleSaveSenderConfig = async () => {
    if (!groupId) return;
    const normalizedSenderEmail = senderEmailInput.trim();
    const normalizedSenderName = senderNameInput.trim();
    const normalizedAppPassword = senderAppPasswordInput.trim();

    if (!normalizedSenderEmail) {
      addToast({
        title: "入力不足",
        description: "送信元メールアドレスは必須です",
        color: "warning",
      });
      return;
    }

    if (!editingSenderConfigId && !normalizedAppPassword) {
      addToast({
        title: "入力不足",
        description: "新規追加時はアプリパスワードが必須です",
        color: "warning",
      });
      return;
    }

    setIsSavingSenderConfig(true);
    try {
      if (editingSenderConfigId) {
        const requestBody: MailSenderConfigUpdateRequestType = {
          senderName: normalizedSenderName || null,
          senderEmail: normalizedSenderEmail,
        };
        if (normalizedAppPassword) {
          requestBody.appPassword = normalizedAppPassword;
        }
        await update_mail_sender_config_v2_mail_sender__group_id___sender_config_id__patch(
          groupId,
          editingSenderConfigId,
          requestBody,
        );
        showSuccessToast("送信元設定を更新しました");
      } else {
        const requestBody: MailSenderConfigCreateRequestType = {
          senderName: normalizedSenderName || null,
          senderEmail: normalizedSenderEmail,
          appPassword: normalizedAppPassword,
        };
        const createdSenderConfig =
          await create_mail_sender_config_v2_mail_sender__group_id__post(
            groupId,
            requestBody,
          );
        if (createdSenderConfig?.senderConfigId) {
          setSelectedSenderConfigId(String(createdSenderConfig.senderConfigId));
        }
        showSuccessToast("送信元設定を追加しました");
      }

      await mutateSenderConfigs();
      resetSenderForm();
    } catch (error) {
      handleErrorWithUI(error, "送信元設定の保存");
    } finally {
      setIsSavingSenderConfig(false);
    }
  };

  const handleDeleteSenderConfig = async (senderConfigId: string) => {
    if (!groupId || !senderConfigId) return;
    setDeletingSenderConfigId(senderConfigId);
    try {
      await delete_mail_sender_config_v2_mail_sender__group_id___sender_config_id__delete(
        groupId,
        senderConfigId,
      );
      if (selectedSenderConfigId === senderConfigId) {
        setSelectedSenderConfigId("");
      }
      if (editingSenderConfigId === senderConfigId) {
        resetSenderForm();
      }
      await mutateSenderConfigs();
      showSuccessToast("送信元設定を削除しました");
    } catch (error) {
      handleErrorWithUI(error, "送信元設定の削除");
    } finally {
      setDeletingSenderConfigId("");
    }
  };

  const selectedCount = selectedUserIdSet.size;
  const totalCount = searchedUsers.length;
  const mailableCount = searchedUsers.filter((user) =>
    Boolean(user.email),
  ).length;
  const selectedAlreadySentCount =
    selectedTemplateIdNumber === null
      ? 0
      : externalUsers.filter(
          (user) =>
            selectedUserIdSet.has(
              normalizeExternalUserId(user.externalUserId),
            ) &&
            (user.sentMailTemplateIdList ?? []).includes(
              selectedTemplateIdNumber,
            ),
        ).length;

  return {
    activeTab,
    setActiveTab,
    templateName,
    setTemplateName,
    subject,
    setSubject,
    bodyText,
    setBodyText,
    bodyHtml,
    setBodyHtml,
    bodyFormat,
    setBodyFormat,
    ccInput,
    setCcInput,
    bccInput,
    setBccInput,
    showCcInput,
    setShowCcInput,
    showBccInput,
    setShowBccInput,
    isPreviewFullscreen,
    setIsPreviewFullscreen,
    searchTerm,
    setSearchTerm,
    bookingMenuFilter,
    setBookingMenuFilter,
    sendTargetFilter,
    setSendTargetFilter,
    allowResend,
    setAllowResend,
    selectedTag,
    setSelectedTag,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedSenderConfigId,
    setSelectedSenderConfigId,
    templateSearchTerm,
    setTemplateSearchTerm,
    selectedUserIdSet,
    selectedAttachmentFileUrlList,
    attachmentMetaMap,
    isCreatingTemplate,
    isSendingMail,
    isUploadingAttachment,
    editingSenderConfigId,
    senderNameInput,
    senderEmailInput,
    senderAppPasswordInput,
    isSavingSenderConfig,
    deletingSenderConfigId,
    attachmentInputRef,
    mailTemplateList,
    visibleTemplateList,
    senderConfigList,
    tagOptionList,
    bookingMenuOptionList,
    selectedTemplateIdNumber,
    searchedUsers,
    selectableUserIdList,
    isAllFilteredUsersSelected,
    selectedCount,
    totalCount,
    mailableCount,
    selectedAlreadySentCount,
    isUserMailable,
    handleToggleUser,
    handleToggleSelectAll,
    handleCreateTemplate,
    handleSendBulkMail,
    handleOpenAttachmentPicker,
    handleAttachmentFileSelected,
    handleRemoveAttachment,
    handleSelectTemplate,
    setSenderNameInput,
    setSenderEmailInput,
    setSenderAppPasswordInput,
    resetSenderForm,
    handleStartEditSenderConfig,
    handleSaveSenderConfig,
    handleDeleteSenderConfig,
  };
}
