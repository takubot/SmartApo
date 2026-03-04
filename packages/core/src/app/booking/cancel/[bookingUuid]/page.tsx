"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  get_booking_by_uuid_v2_booking_external_booking__booking_uuid__get,
  cancel_booking_by_uuid_v2_booking_external_booking__booking_uuid__cancel_post,
} from "@repo/api-contracts/based_template/service";
import { Button, Card, CardBody, Spinner, Divider } from "@heroui/react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Calendar,
  Clock,
  User,
  Mail,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { showSuccessToast, handleErrorWithUI } from "@common/errorHandler";
import Image from "next/image";

// APIからの日付文字列を安全に Date に変換
const parseApiDate = (val: string | Date) => {
  if (val instanceof Date) return val;
  if (!val) return new Date();
  if (val.includes("Z") || val.includes("+")) return parseISO(val);
  return parseISO(val + "Z");
};

export default function BookingCancelPage() {
  const params = useParams();
  const router = useRouter();
  const bookingUuid = params.bookingUuid as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const {
    data: booking,
    isLoading,
    error,
  } = useSWR(bookingUuid ? `booking-${bookingUuid}` : null, () =>
    get_booking_by_uuid_v2_booking_external_booking__booking_uuid__get(
      bookingUuid,
    ),
  );

  const handleCancel = async () => {
    if (!bookingUuid) return;

    setIsSubmitting(true);
    try {
      await cancel_booking_by_uuid_v2_booking_external_booking__booking_uuid__cancel_post(
        bookingUuid,
      );
      showSuccessToast("予約をキャンセルしました");
      setIsCompleted(true);
    } catch (err) {
      handleErrorWithUI(err, "予約のキャンセル");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Spinner size="lg" label="読み込み中..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
        <Card className="max-w-md w-full shadow-lg border-0">
          <CardBody className="text-center p-12">
            <div className="bg-danger-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} className="text-danger" />
            </div>
            <h1 className="text-2xl font-bold text-default-900 mb-4">エラー</h1>
            <p className="text-default-500 leading-relaxed">
              予約情報が見つかりませんでした。
              <br />
              既にキャンセルされているか、URLが正しくない可能性があります。
            </p>
            <Button
              className="mt-8"
              variant="flat"
              onPress={() => router.push("/")}
            >
              トップへ戻る
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (isCompleted || booking.bookingStatus === "CANCELLED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardBody className="text-center p-12 space-y-8">
            <div className="flex justify-center">
              <div className="bg-success-50 w-20 h-20 rounded-full flex items-center justify-center">
                <CheckCircle2 size={48} className="text-success" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-default-900">
                キャンセル完了
              </h1>
              <p className="text-default-500 text-lg">
                予約のキャンセルが完了いたしました。
                <br />
                またのご利用をお待ちしております。
              </p>
            </div>
            <Button
              color="primary"
              size="lg"
              variant="flat"
              onPress={() => router.push("/")}
              className="w-full font-bold h-14 text-lg"
            >
              トップへ戻る
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans antialiased text-gray-900">
      <header className="h-14 bg-white border-b border-gray-100 flex-shrink-0 z-50">
        <div className="h-full px-6 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Image
              src="/themeIcon/doppel_logo.png"
              alt="logo"
              width={90}
              height={28}
              style={{ width: "auto", height: "24px" }}
              priority
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
              予約のキャンセル
            </h1>
            <p className="text-gray-500 font-medium">
              以下の内容の予約をキャンセルします。よろしいですか？
            </p>
          </div>

          <Card className="shadow-xl border-0 overflow-hidden">
            <CardBody className="p-0">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-lg shadow-md">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      Reservation Date
                    </div>
                    <div className="text-lg font-black text-primary">
                      {format(
                        parseApiDate(booking.startAt),
                        "yyyy年M月d日 (eee)",
                        { locale: ja },
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-gray-400">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Time
                      </div>
                      <div className="text-base font-bold text-gray-700">
                        {format(parseApiDate(booking.startAt), "HH:mm")} 〜{" "}
                        {format(parseApiDate(booking.endAt), "HH:mm")}
                      </div>
                    </div>
                  </div>

                  <Divider className="opacity-50" />

                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-gray-400">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Guest Name
                      </div>
                      <div className="text-base font-bold text-gray-700">
                        {booking.guestName} 様
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-gray-400">
                      <Mail size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Email
                      </div>
                      <div className="text-base font-bold text-gray-700">
                        {booking.guestEmail}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-3">
                  <Button
                    color="danger"
                    size="lg"
                    className="w-full font-black text-white h-14 text-base rounded-2xl shadow-xl shadow-danger/20 hover:shadow-danger/40 transition-all active:scale-[0.98]"
                    isLoading={isSubmitting}
                    onPress={handleCancel}
                  >
                    予約をキャンセルする
                  </Button>
                  <Button
                    variant="light"
                    className="w-full font-bold text-gray-400 hover:text-gray-600"
                    onPress={() => router.back()}
                  >
                    戻る
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest pb-8">
            <AlertTriangle size={14} className="text-warning" />
            <span>一度キャンセルすると元に戻せません</span>
          </div>
        </div>
      </main>
    </div>
  );
}
