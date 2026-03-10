// app/(dialer)/contacts/[id]/page.tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Divider,
  Chip,
} from "@heroui/react";
import { ArrowLeft, Phone, Mail, Building2 } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { useContact } from "@/hooks/dialer/useDialerSwr";

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: contact, isLoading } = useContact(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-20 text-gray-500">
        コンタクトが見つかりません
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${contact.lastName} ${contact.firstName}`}
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push("/contacts")}
          >
            一覧へ
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        <Card shadow="sm">
          <CardHeader className="flex justify-between">
            <h3 className="text-sm font-semibold">連絡先情報</h3>
            <Chip
              size="sm"
              variant="flat"
              color={contact.status === "active" ? "success" : "default"}
            >
              {contact.status}
            </Chip>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-gray-400" />
              <span className="text-sm">{contact.phonePrimary}</span>
            </div>
            {contact.phoneSecondary && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  {contact.phoneSecondary}
                </span>
              </div>
            )}
            {contact.phoneMobile && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  {contact.phoneMobile}
                </span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400" />
                <span className="text-sm">{contact.email}</span>
              </div>
            )}
            {contact.companyName && (
              <div className="flex items-center gap-3">
                <Building2 size={16} className="text-gray-400" />
                <span className="text-sm">
                  {contact.companyName}
                  {contact.department && ` / ${contact.department}`}
                  {contact.position && ` (${contact.position})`}
                </span>
              </div>
            )}
            {contact.notes && (
              <>
                <Divider />
                <div>
                  <p className="text-xs text-gray-500 mb-1">メモ</p>
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">統計</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">通話回数</dt>
                <dd className="font-medium">{contact.totalCalls}回</dd>
              </div>
              <div>
                <dt className="text-gray-500">最終通話</dt>
                <dd className="font-medium">
                  {contact.lastCalledAt
                    ? new Date(contact.lastCalledAt).toLocaleString("ja-JP")
                    : "なし"}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">通話履歴</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-400 text-center py-4">
              通話履歴はまだありません
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
