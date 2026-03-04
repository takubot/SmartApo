"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Switch,
  Textarea,
  Chip,
} from "@heroui/react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  GripVertical,
  Type,
  FileText,
  Link,
  List,
  CheckSquare,
  ToggleLeft,
  Copy,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import type {
  CustomFormField,
  CustomFormFieldType,
  CustomFormSection,
} from "./types";
import { FIELD_TYPE_LABEL, generateKeyFromLabel, newField } from "./types";

const PROFILE_SYNC_KEY_META: Record<string, { chipLabel: string }> = {
  external_user_display_name: { chipLabel: "名前同期" },
  external_user_email: { chipLabel: "メール同期" },
  external_user_phone: { chipLabel: "電話同期" },
};
const LEGACY_PROFILE_SYNC_KEYS = new Set(["name", "email", "phone"]);
const RESERVED_PROFILE_KEYS = new Set([
  ...Object.keys(PROFILE_SYNC_KEY_META),
  ...LEGACY_PROFILE_SYNC_KEYS,
]);

const FIELD_TYPE_ICON: Record<CustomFormFieldType, React.ReactNode> = {
  string: <Type className="w-4 h-4" />,
  text: <FileText className="w-4 h-4" />,
  url: <Link className="w-4 h-4" />,
  select: <List className="w-4 h-4" />,
  multiselect: <CheckSquare className="w-4 h-4" />,
  boolean: <ToggleLeft className="w-4 h-4" />,
};

export type ValidationError = {
  sectionIdx: number;
  fieldIdx?: number;
  message: string;
};

type Props = {
  sections: CustomFormSection[];
  expandedSections: Set<number>;
  onSectionsChange: (sections: CustomFormSection[]) => void;
  onExpandedSectionsChange: (expanded: Set<number>) => void;
  onAddSection: (afterIndex?: number) => void;
  validationErrors?: ValidationError[];
};

export function CustomFormEditor({
  sections,
  expandedSections,
  onSectionsChange,
  onExpandedSectionsChange,
  onAddSection,
  validationErrors = [],
}: Props) {
  const [editingField, setEditingField] = useState<{
    sectionIdx: number;
    fieldIdx: number;
  } | null>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editingSectionDraft, setEditingSectionDraft] = useState("");
  const sectionCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // セクション編集モードの時に外側をクリックしたら編集モードを閉じる
  useEffect(() => {
    if (editingSection === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const cardElement = sectionCardRefs.current.get(editingSection);

      if (cardElement && !cardElement.contains(target)) {
        updateSection(editingSection, { title: editingSectionDraft });
        setEditingSection(null);
        setEditingSectionDraft("");
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingSection, editingSectionDraft, sections]);

  const errorSectionIndices = useMemo(
    () => new Set(validationErrors.map((e) => e.sectionIdx)),
    [validationErrors],
  );

  const errorFieldIndices = useMemo(() => {
    const map = new Map<number, Set<number>>();
    validationErrors.forEach((e) => {
      if (e.fieldIdx !== undefined) {
        if (!map.has(e.sectionIdx)) {
          map.set(e.sectionIdx, new Set());
        }
        map.get(e.sectionIdx)!.add(e.fieldIdx);
      }
    });
    return map;
  }, [validationErrors]);

  const updateSection = (idx: number, patch: Partial<CustomFormSection>) => {
    const next = sections.map((s, i) => {
      if (i === idx && s) {
        return { ...s, ...patch };
      }
      return s;
    });
    onSectionsChange(next);
  };

  const startSectionEditing = (sectionIdx: number) => {
    setEditingSection(sectionIdx);
    setEditingSectionDraft(sections[sectionIdx]?.title ?? "");
  };

  const finishSectionEditing = () => {
    if (editingSection === null) return;
    updateSection(editingSection, { title: editingSectionDraft });
    setEditingSection(null);
    setEditingSectionDraft("");
  };

  const updateField = (
    sectionIdx: number,
    fieldIdx: number,
    patch: Partial<CustomFormField>,
  ) => {
    const next = sections.map((s, si) => {
      if (si !== sectionIdx) return s;
      const fields = (s.fields ?? []).map((f, fi) =>
        fi === fieldIdx ? { ...f, ...patch } : f,
      );
      return { ...s, fields };
    });
    onSectionsChange(next);
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    if (item) {
      next.splice(to, 0, item);
    }
    onSectionsChange(next);

    const nextExpanded = new Set<number>();
    expandedSections.forEach((idx) => {
      if (idx === from) {
        nextExpanded.add(to);
        return;
      }
      if (from < to && idx > from && idx <= to) {
        nextExpanded.add(idx - 1);
        return;
      }
      if (to < from && idx >= to && idx < from) {
        nextExpanded.add(idx + 1);
        return;
      }
      nextExpanded.add(idx);
    });
    onExpandedSectionsChange(nextExpanded);
  };

  const moveField = (sectionIdx: number, from: number, to: number) => {
    const section = sections[sectionIdx];
    if (!section) return;
    if (to < 0 || to >= section.fields.length) return;
    const next = sections.map((s, si) => {
      if (si !== sectionIdx || !s) return s;
      const fields = [...s.fields];
      const [item] = fields.splice(from, 1);
      if (item) {
        fields.splice(to, 0, item);
      }
      return { ...s, fields };
    });
    onSectionsChange(next);
  };

  const removeSection = (idx: number) => {
    const next = sections.filter((_, i) => i !== idx);
    onSectionsChange(next);
    const nextExpanded = new Set<number>();
    expandedSections.forEach((i) => {
      if (i === idx) return;
      nextExpanded.add(i > idx ? i - 1 : i);
    });
    onExpandedSectionsChange(nextExpanded);
  };

  const addFieldToSection = (sectionIdx: number, afterIndex?: number) => {
    const next = sections.map((s, si) => {
      if (si !== sectionIdx) return s;
      const fields = [...(s.fields ?? [])];
      const newFieldObj = newField();
      if (afterIndex === undefined) {
        fields.push(newFieldObj);
      } else {
        fields.splice(afterIndex + 1, 0, newFieldObj);
      }
      return { ...s, fields };
    });
    onSectionsChange(next);
    if (afterIndex === undefined) {
      const targetSection = next[sectionIdx];
      if (targetSection) {
        setEditingField({
          sectionIdx,
          fieldIdx: targetSection.fields.length - 1,
        });
      }
    } else {
      setEditingField({
        sectionIdx,
        fieldIdx: afterIndex + 1,
      });
    }
  };

  const duplicateField = (sectionIdx: number, fieldIdx: number) => {
    const section = sections[sectionIdx];
    if (!section) return;
    const field = section.fields[fieldIdx];
    if (!field) return;
    const key = makeUniqueKey(generateKeyFromLabel(field.label || ""));
    const next = sections.map((s, si) => {
      if (si !== sectionIdx) return s;
      const fields = [...s.fields];
      fields.splice(fieldIdx + 1, 0, { ...field, key });
      return { ...s, fields };
    });
    onSectionsChange(next);
  };

  const removeFieldFromSection = (sectionIdx: number, fieldIdx: number) => {
    const next = sections.map((s, si) => {
      if (si !== sectionIdx) return s;
      const fields = (s.fields ?? []).filter((_, fi) => fi !== fieldIdx);
      return { ...s, fields: fields.length > 0 ? fields : [newField()] };
    });
    onSectionsChange(next);
    setEditingField(null);
  };

  function makeUniqueKey(
    baseKey: string,
    current?: { sectionIdx: number; fieldIdx: number },
  ): string {
    const base = baseKey.trim();
    if (!base) return "";

    const taken = new Set<string>();
    sections.forEach((s, si) => {
      (s.fields ?? []).forEach((f, fi) => {
        if (current && si === current.sectionIdx && fi === current.fieldIdx) {
          return;
        }
        const k = (f.key ?? "").trim();
        if (k) taken.add(k);
      });
    });

    if (!taken.has(base)) return base.substring(0, 50);

    for (let n = 2; n < 10000; n++) {
      const suffix = `_${n}`;
      const maxBaseLen = Math.max(0, 50 - suffix.length);
      const candidate = `${base.substring(0, maxBaseLen)}${suffix}`;
      if (!taken.has(candidate)) return candidate;
    }
    return base.substring(0, 50);
  }

  const handleLabelChange = (
    sectionIdx: number,
    fieldIdx: number,
    label: string,
  ) => {
    const currentKey = (sections[sectionIdx]?.fields[fieldIdx]?.key ?? "")
      .trim()
      .toLowerCase();
    const shouldPreserveKey = RESERVED_PROFILE_KEYS.has(currentKey);
    updateField(sectionIdx, fieldIdx, {
      label,
      key: shouldPreserveKey
        ? currentKey
        : makeUniqueKey(generateKeyFromLabel(label), { sectionIdx, fieldIdx }),
    });
  };

  const renderFieldPreview = (
    section: CustomFormSection,
    field: CustomFormField,
    sectionIdx: number,
    fieldIdx: number,
  ) => {
    const isEditing =
      editingField?.sectionIdx === sectionIdx &&
      editingField?.fieldIdx === fieldIdx;
    const normalizedKey = (field.key ?? "").trim().toLowerCase();
    const profileSyncMeta = PROFILE_SYNC_KEY_META[normalizedKey];

    if (isEditing) {
      return (
        <Card shadow="sm" className="border-2 border-primary bg-white">
          <CardBody className="p-1.5 space-y-1.5">
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 text-default-400 flex-shrink-0 mt-1.5" />
              <div className="flex-1 space-y-1.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Input
                      value={field.label ?? ""}
                      onValueChange={(v) =>
                        handleLabelChange(sectionIdx, fieldIdx, v)
                      }
                      placeholder="質問を入力（例：店舗名）"
                      variant="bordered"
                      size="sm"
                      isRequired
                      classNames={{
                        input: "text-xs font-medium",
                        inputWrapper:
                          "focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 bg-white",
                      }}
                    />
                  </div>
                  <div className="hidden md:block" />
                </div>
                {profileSyncMeta && (
                  <p className="text-[11px] text-primary-600 font-medium">
                    この項目は外部ユーザー情報に同期されます。
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      label="回答形式"
                      variant="bordered"
                      size="sm"
                      selectedKeys={new Set([field.type])}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as
                          | CustomFormFieldType
                          | undefined;
                        if (!selected) return;
                        updateField(sectionIdx, fieldIdx, {
                          type: selected,
                          options:
                            selected === "select" || selected === "multiselect"
                              ? (field.options ?? [])
                              : [],
                        });
                      }}
                    >
                      {(
                        Object.keys(FIELD_TYPE_LABEL) as CustomFormFieldType[]
                      ).map((t) => (
                        <SelectItem key={t} startContent={FIELD_TYPE_ICON[t]}>
                          {FIELD_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 p-1 bg-default-50 rounded-lg h-full">
                    <Switch
                      isSelected={Boolean(field.required)}
                      onValueChange={(v) =>
                        updateField(sectionIdx, fieldIdx, { required: v })
                      }
                      size="sm"
                    >
                      <span className="text-[11px] font-medium">必須項目</span>
                    </Switch>
                  </div>
                </div>

                {(field.type === "select" || field.type === "multiselect") && (
                  <div className="space-y-1.5">
                    <Textarea
                      label="選択肢（1行に1つずつ入力）"
                      placeholder={`選択肢1\n選択肢2\n選択肢3`}
                      value={(field.options ?? []).join("\n")}
                      onValueChange={(v) => {
                        const opts = v.split("\n");
                        updateField(sectionIdx, fieldIdx, { options: opts });
                      }}
                      onBlur={(e) => {
                        const v = e.target.value;
                        const opts = v
                          .split("\n")
                          .map((x) => x.trim())
                          .filter((x) => x.length > 0);
                        updateField(sectionIdx, fieldIdx, { options: opts });
                      }}
                      variant="bordered"
                      size="sm"
                      minRows={2}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    label="入力例（任意）"
                    placeholder="例：〇〇店"
                    value={field.placeholder ?? ""}
                    onValueChange={(v) =>
                      updateField(sectionIdx, fieldIdx, { placeholder: v })
                    }
                    variant="bordered"
                    size="sm"
                  />
                  <Input
                    label="補足説明（任意）"
                    placeholder="例：正式名称で入力"
                    value={field.description ?? ""}
                    onValueChange={(v) =>
                      updateField(sectionIdx, fieldIdx, { description: v })
                    }
                    variant="bordered"
                    size="sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-default-100">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={() => setEditingField(null)}
                    className="h-7"
                  >
                    完了
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={() => moveField(sectionIdx, fieldIdx, fieldIdx - 1)}
                  isDisabled={fieldIdx === 0}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={() => moveField(sectionIdx, fieldIdx, fieldIdx + 1)}
                  isDisabled={fieldIdx === (section.fields ?? []).length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={() => duplicateField(sectionIdx, fieldIdx)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  isIconOnly
                  color="danger"
                  variant="light"
                  size="sm"
                  onPress={() => removeFieldFromSection(sectionIdx, fieldIdx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      );
    }

    const handleFieldClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingField({ sectionIdx, fieldIdx });
    };

    const hasError = errorFieldIndices.get(sectionIdx)?.has(fieldIdx) ?? false;

    return (
      <div
        className={`group relative p-2 border rounded-lg transition-all cursor-pointer ${
          hasError
            ? "border-danger-400 bg-danger-50/30 hover:border-danger-500"
            : "border-default-200/80 bg-white hover:border-default-300 hover:bg-default-50/70"
        }`}
        onClick={handleFieldClick}
      >
        <div className="flex items-start gap-2">
          <GripVertical className="w-3.5 h-3.5 text-default-400 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-[12px] font-semibold cursor-pointer">
                {field.label || "（質問を入力）"}
              </label>
              {profileSyncMeta && (
                <Chip
                  size="sm"
                  color="primary"
                  variant="flat"
                  className="h-4 text-[10px] px-1"
                >
                  {profileSyncMeta.chipLabel}
                </Chip>
              )}
              {field.required && (
                <Chip
                  size="sm"
                  color="danger"
                  variant="flat"
                  className="h-4 text-[10px] px-1"
                >
                  必須
                </Chip>
              )}
            </div>
            {field.description && (
              <p className="text-[10px] text-default-500 cursor-pointer line-clamp-1">
                {field.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => moveField(sectionIdx, fieldIdx, fieldIdx - 1)}
              isDisabled={fieldIdx === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => moveField(sectionIdx, fieldIdx, fieldIdx + 1)}
              isDisabled={fieldIdx === (section.fields ?? []).length - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => duplicateField(sectionIdx, fieldIdx)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              isIconOnly
              color="danger"
              variant="light"
              size="sm"
              onPress={() => removeFieldFromSection(sectionIdx, fieldIdx)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {sections.map((section, si) => {
        const isExpanded = expandedSections.has(si);
        const isEditingSection = editingSection === si;
        const questionCount = (section.fields ?? []).length;

        return (
          <div
            key={si}
            className="space-y-3 group/section pb-3 border-b border-default-200/70 last:border-b-0"
            ref={(el) => {
              if (el) sectionCardRefs.current.set(si, el);
              else sectionCardRefs.current.delete(si);
            }}
          >
            <Card
              shadow="sm"
              className={`border ${
                errorSectionIndices.has(si)
                  ? "border-danger-400 bg-danger-50/30"
                  : "border-default-200"
              }`}
            >
              <CardBody className="p-0">
                <div className="px-2 py-1.5 bg-default-50 border-b border-default-200">
                  {isEditingSection ? (
                    <div className="flex items-center gap-3">
                      <Input
                        value={editingSectionDraft}
                        onValueChange={setEditingSectionDraft}
                        placeholder="セクション名"
                        variant="bordered"
                        size="sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            finishSectionEditing();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingSection(null);
                            setEditingSectionDraft("");
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={finishSectionEditing}
                      >
                        完了
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 min-w-0 flex items-center gap-2 text-left rounded-lg px-1 py-0.5 hover:bg-default-100 transition-colors"
                        onClick={() => {
                          const nextExpanded = new Set(expandedSections);
                          if (nextExpanded.has(si)) nextExpanded.delete(si);
                          else nextExpanded.add(si);
                          onExpandedSectionsChange(nextExpanded);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startSectionEditing(si);
                        }}
                      >
                        <span className="w-6 h-6 flex items-center justify-center -ml-1 text-default-600">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                        <h3 className="text-sm font-bold text-default-900 truncate">
                          {section.title || "（セクション名を入力）"}
                        </h3>
                        <span className="text-[10px] text-default-500 shrink-0">
                          {questionCount}件
                        </span>
                      </button>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => moveSection(si, si - 1)}
                          isDisabled={si === 0}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => moveSection(si, si + 1)}
                          isDisabled={si === sections.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          isIconOnly
                          color="danger"
                          variant="light"
                          size="sm"
                          onPress={() => removeSection(si)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => startSectionEditing(si)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-2 space-y-2 bg-white">
                    {section.fields.map((field, fi) => (
                      <div key={fi} className="group/field">
                        {renderFieldPreview(section, field, si, fi)}
                        <div className="h-0 -my-1 flex justify-center items-center opacity-0 group-hover/field:opacity-100 group-hover/field:h-6 transition-all z-10 relative overflow-hidden">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            color="primary"
                            onPress={() => addFieldToSection(si, fi)}
                            className="h-5 w-5 min-w-5"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
            <div className="h-0 -my-2 flex justify-center items-center opacity-0 group-hover/section:opacity-100 group-hover/section:h-8 transition-all z-10 relative overflow-hidden">
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                color="primary"
                onPress={() => onAddSection(si)}
                className="h-6 w-6 min-w-6"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {sections.length === 0 && (
        <Card
          shadow="sm"
          className="border-2 border-dashed border-default-300 bg-white"
        >
          <CardBody className="p-6 text-center">
            <Plus className="w-6 h-6 text-default-500 mx-auto mb-2" />
            <p className="text-sm text-default-500 mb-2">
              まだセクションがありません
            </p>
            <Button color="primary" onPress={() => onAddSection()}>
              セクションを追加
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
