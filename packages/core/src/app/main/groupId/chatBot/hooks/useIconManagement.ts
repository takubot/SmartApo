import { useCallback, useState } from "react";

export function useIconManagement() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // モーダルを開く/閉じるたびに状態をリセット
  const resetIconState = useCallback(() => {
    setSelectedFile(null);
    setImageSrc("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  // ファイル選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0] as File;

    // 拡張子チェック
    const validExt = /\.(ico|png|jpg|jpeg)$/i;
    if (!validExt.test(file.name)) {
      alert(
        "画像ファイルは .ico, .png, .jpg, .jpeg のいずれかを選択してください。",
      );
      return;
    }
    // サイズチェック
    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください。");
      return;
    }

    setSelectedFile(file);
    setImageSrc(URL.createObjectURL(file));
  };

  // Crop 完了
  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  // 切り取り実行
  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
    });
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: any) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const outputSize = Math.max(pixelCrop.width, pixelCrop.height);
    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputSize,
      outputSize,
    );

    return new Promise<File>((resolve, reject) => {
      // JPEG形式で高品質圧縮を試行（ファイルサイズを削減）
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error("Canvas is empty");
          }

          // ファイルサイズが5MBを超える場合は品質を下げて再試行
          if (blob.size > 5 * 1024 * 1024) {
            canvas.toBlob(
              (compressedBlob) => {
                if (!compressedBlob) {
                  reject(new Error("画像の圧縮に失敗しました"));
                  return;
                }

                const file = new File([compressedBlob], "cropped-image.jpg", {
                  type: "image/jpeg",
                });
                resolve(file);
              },
              "image/jpeg",
              0.7,
            ); // 品質70%で圧縮
          } else {
            const file = new File([blob], "cropped-image.jpg", {
              type: "image/jpeg",
            });
            resolve(file);
          }
        },
        "image/jpeg",
        0.8,
      ); // 最初は品質80%で試行
    });
  };

  // クロップ完了時の処理
  const handleCropComplete = async (onCropCompleted: (file: File) => void) => {
    if (!croppedAreaPixels || !imageSrc) {
      console.error("クロップ情報または画像が不足しています");
      return;
    }

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);

      // クロップ後のファイルサイズを再チェック
      if (croppedImage.size > 5 * 1024 * 1024) {
        alert(
          "画像の処理後、ファイルサイズが5MBを超えました。より小さな画像を選択してください。",
        );
        return;
      }

      onCropCompleted(croppedImage);
    } catch (error) {
      console.error("画像の切り取りに失敗しました:", error);
      throw new Error("画像の切り取りに失敗しました。");
    }
  };

  return {
    // 状態
    selectedFile,
    imageSrc,
    crop,
    zoom,
    croppedAreaPixels,

    // 操作
    resetIconState,
    handleFileChange,
    onCropComplete,
    handleCropComplete,
    setCrop,
    setZoom,
  };
}
