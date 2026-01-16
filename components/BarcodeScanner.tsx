'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

type Props = {
  onDetected: (code: string) => void;
  onCancel: () => void;
};

export default function BarcodeScanner({ onDetected, onCancel }: Props) {
  const regionId = 'reader'; // カメラ表示用のdiv ID
  const [error, setError] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannedRef = useRef<boolean>(false); //　連打防止用
  const effectRan = useRef(false); // strictMode対策

  useEffect(() => {
    if(effectRan.current === true) {
      return;
    }
    effectRan.current = true;

    // 1. スキャナーのインスタンス作成
    const html5QrCode = new Html5Qrcode(regionId);
    scannerRef.current = html5QrCode;

    // 2. 設定（EAN-13に絞ることで精度向上）
    const config = {
      fps: 10,             // 1秒間のスキャン回数
      qrbox: { width: 250, height: 150 }, // 読み取り範囲（横長に設定）
      aspectRatio: 1.0,
    };

    // 3. カメラ起動
    html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        // --- 重要: 連続読み取り防止 ---
        if (isScannedRef.current) return;
        isScannedRef.current = true;

        console.log(`Scan result: ${decodedText}`);

        // 読み取ったら即座に停止（pause）し、コールバックを実行
        html5QrCode.pause(true); 
        onDetected(decodedText);
      },
      (errorMessage) => {
        // 読み取り失敗時は何もしない
      }
    ).catch((err) => {
      console.error("Camera start error:", err);
      setError('カメラの起動に失敗しました。権限を確認してください。');
    });

    // 3. クリーンアップ
    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
        }).catch(err => console.error("Failed to stop scanner", err));
      } else {
          html5QrCode.clear();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden">
        {error && <div className="absolute top-0 w-full bg-red-500 text-white p-2 text-center z-10">{error}</div>}
        
        {/* カメラ映像エリア */}
        <div id={regionId} className="w-full" style={{ minHeight: '300px' }}></div>

        <button 
            onClick={onCancel}
            className="absolute bottom-4 left-0 right-0 mx-auto w-32 bg-gray-800/80 text-white py-1 rounded-full text-sm z-10"
        >
            閉じる
        </button>
    </div>
  );
}