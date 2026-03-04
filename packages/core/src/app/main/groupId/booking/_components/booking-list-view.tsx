import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
} from "@heroui/react";
import { CheckCircle2, Edit3, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface BookingListViewProps {
  bookings: any;
  menuSlots: any;
}

export function BookingListView({ bookings, menuSlots }: BookingListViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-default-50">
      <Card className="bg-white border border-divider">
        <CardBody className="p-3 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 text-default-900">
            <CheckCircle2 className="text-success" />
            予約確定済みリスト
          </h3>
          {!bookings || bookings.bookingList.length === 0 ? (
            <div className="py-20 text-center text-default-400">
              予約はまだありません。
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {bookings.bookingList.map((b: any) => (
                  <div
                    key={b.bookingId}
                    className="border border-divider rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {b.guestName || b.externalUserId}
                        </p>
                        <p className="text-xs text-default-500 truncate">
                          {b.guestEmail || "-"}
                        </p>
                      </div>
                      <Chip
                        size="sm"
                        color={
                          b.bookingStatus === "CONFIRMED"
                            ? "success"
                            : b.bookingStatus === "CANCELLED"
                              ? "danger"
                              : b.bookingStatus === "COMPLETED"
                                ? "default"
                                : "warning"
                        }
                        variant="flat"
                      >
                        {b.bookingStatus === "CONFIRMED"
                          ? "確定"
                          : b.bookingStatus === "CANCELLED"
                            ? "キャンセル"
                            : b.bookingStatus === "COMPLETED"
                              ? "完了"
                              : b.bookingStatus === "PENDING"
                                ? "確認中"
                                : b.bookingStatus}
                      </Chip>
                    </div>
                    <p className="text-xs text-default-600">
                      {b.startAt
                        ? format(new Date(b.startAt), "yyyy/MM/dd HH:mm", {
                            locale: ja,
                          })
                        : "-"}
                    </p>
                    <div className="flex justify-end gap-1">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-default-400"
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table
                  aria-label="Bookings"
                  removeWrapper
                  classNames={{
                    base: "text-default-900",
                    th: "bg-default-100 text-default-600",
                    td: "border-b border-divider",
                  }}
                >
                  <TableHeader>
                    <TableColumn>名前</TableColumn>
                    <TableColumn>連絡先</TableColumn>
                    <TableColumn>予約日時</TableColumn>
                    <TableColumn>ステータス</TableColumn>
                    <TableColumn align="center">アクション</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {bookings.bookingList.map((b: any) => {
                      return (
                        <TableRow key={b.bookingId}>
                          <TableCell className="font-medium">
                            {b.guestName || b.externalUserId}
                          </TableCell>
                          <TableCell className="text-xs text-default-500">
                            {b.guestEmail || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {b.startAt
                              ? format(
                                  new Date(b.startAt),
                                  "yyyy/MM/dd HH:mm",
                                  {
                                    locale: ja,
                                  },
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="sm"
                              color={
                                b.bookingStatus === "CONFIRMED"
                                  ? "success"
                                  : b.bookingStatus === "CANCELLED"
                                    ? "danger"
                                    : b.bookingStatus === "COMPLETED"
                                      ? "default"
                                      : "warning"
                              }
                              variant="flat"
                            >
                              {b.bookingStatus === "CONFIRMED"
                                ? "確定"
                                : b.bookingStatus === "CANCELLED"
                                  ? "キャンセル"
                                  : b.bookingStatus === "COMPLETED"
                                    ? "完了"
                                    : b.bookingStatus === "PENDING"
                                      ? "確認中"
                                      : b.bookingStatus}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-2">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="text-default-400"
                              >
                                <Edit3 size={16} />
                              </Button>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
