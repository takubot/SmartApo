import { useCallback, useRef } from "react";

/**
 * ダブルクリック検出の設定オプション
 */
export interface UseDoubleClickOptions {
  /**
   * ダブルクリックと判定する時間間隔（ミリ秒）
   * @default 300
   */
  timeout?: number;
  /**
   * シングルクリック時のコールバック（オプション）
   */
  onSingleClick?: () => void;
}

/**
 * ダブルクリック検出用のカスタムフック
 *
 * @param onDoubleClick - ダブルクリック時に実行するコールバック関数
 * @param options - 設定オプション
 * @returns クリックイベントハンドラー関数
 *
 * @example
 * ```tsx
 * const handleEdit = (item: Item) => {
 *   // 編集処理
 * };
 *
 * const handleClick = useDoubleClick(
 *   () => handleEdit(item),
 *   { timeout: 300 }
 * );
 *
 * return (
 *   <div onClick={handleClick}>
 *     {item.name}
 *   </div>
 * );
 * ```
 */
export function useDoubleClick<T = unknown>(
  onDoubleClick: (item?: T) => void,
  options: UseDoubleClickOptions = {},
): (item?: T) => void {
  const { timeout = 300, onSingleClick } = options;
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastItemRef = useRef<T | undefined>(undefined);

  return useCallback(
    (item?: T) => {
      const now = Date.now();
      const timeDiff = now - lastClickTimeRef.current;
      const isSameItem =
        item === undefined
          ? lastItemRef.current === undefined
          : item === lastItemRef.current;

      // 既存のタイムアウトをクリア
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      // 同じアイテムで、タイムアウト時間以内のクリック = ダブルクリック
      if (isSameItem && timeDiff < timeout && timeDiff > 0) {
        onDoubleClick(item);
        lastClickTimeRef.current = 0;
        lastItemRef.current = undefined;
      } else {
        // シングルクリックの可能性があるため、タイムアウトを設定
        lastClickTimeRef.current = now;
        lastItemRef.current = item;

        clickTimeoutRef.current = setTimeout(() => {
          // タイムアウト後にシングルクリックとして処理
          if (onSingleClick) {
            onSingleClick();
          }
          lastClickTimeRef.current = 0;
          lastItemRef.current = undefined;
          clickTimeoutRef.current = null;
        }, timeout);
      }
    },
    [onDoubleClick, timeout, onSingleClick],
  );
}

/**
 * IDベースのダブルクリック検出用のカスタムフック
 * 複数のアイテムを管理する場合に便利
 *
 * @param onDoubleClick - ダブルクリック時に実行するコールバック関数（IDを受け取る）
 * @param options - 設定オプション
 * @returns IDを受け取るクリックイベントハンドラー関数
 *
 * @example
 * ```tsx
 * const handleEdit = (id: number) => {
 *   // 編集処理
 * };
 *
 * const handleClick = useDoubleClickById(
 *   (id) => handleEdit(id),
 *   { timeout: 300 }
 * );
 *
 * return (
 *   <div onClick={() => handleClick(item.id)}>
 *     {item.name}
 *   </div>
 * );
 * ```
 */
export function useDoubleClickById(
  onDoubleClick: (id: string | number) => void,
  options: UseDoubleClickOptions = {},
): (id: string | number) => void {
  const { timeout = 300, onSingleClick } = options;
  const clickTimeoutsRef = useRef<Map<string | number, NodeJS.Timeout>>(
    new Map(),
  );
  const lastClickTimesRef = useRef<Map<string | number, number>>(new Map());

  return useCallback(
    (id: string | number) => {
      const now = Date.now();
      const lastClick = lastClickTimesRef.current.get(id) || 0;
      const timeDiff = now - lastClick;

      // 既存のタイムアウトをクリア
      const existingTimeout = clickTimeoutsRef.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        clickTimeoutsRef.current.delete(id);
      }

      // タイムアウト時間以内のクリック = ダブルクリック
      if (timeDiff < timeout && timeDiff > 0) {
        onDoubleClick(id);
        lastClickTimesRef.current.delete(id);
      } else {
        // シングルクリックの可能性があるため、タイムアウトを設定
        lastClickTimesRef.current.set(id, now);

        const timeoutId = setTimeout(() => {
          // タイムアウト後にシングルクリックとして処理
          if (onSingleClick) {
            onSingleClick();
          }
          lastClickTimesRef.current.delete(id);
          clickTimeoutsRef.current.delete(id);
        }, timeout);

        clickTimeoutsRef.current.set(id, timeoutId);
      }
    },
    [onDoubleClick, timeout, onSingleClick],
  );
}
