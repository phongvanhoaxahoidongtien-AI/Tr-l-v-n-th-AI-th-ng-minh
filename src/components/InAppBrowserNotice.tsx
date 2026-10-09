import React, { useEffect, useState } from 'react';
import { ExternalLink, X, Smartphone } from 'lucide-react';

export const InAppBrowserNotice: React.FC = () => {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [browserName, setBrowserName] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';

    // Nhận diện Zalo, Facebook, Messenger, TikTok, Instagram
    if (/Zalo/i.test(ua)) {
      setIsInAppBrowser(true);
      setBrowserName('Zalo');
    } else if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
      setIsInAppBrowser(true);
      setBrowserName('Facebook');
    } else if (/Messenger/i.test(ua)) {
      setIsInAppBrowser(true);
      setBrowserName('Messenger');
    } else if (/TikTok/i.test(ua)) {
      setIsInAppBrowser(true);
      setBrowserName('TikTok');
    } else if (/Instagram/i.test(ua)) {
      setIsInAppBrowser(true);
      setBrowserName('Instagram');
    }
  }, []);

  if (!isInAppBrowser || dismissed) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-sans font-medium flex items-center justify-between shadow-sm sticky top-0 z-50 animate-fade-in border-b border-amber-600">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <Smartphone className="w-4 h-4 shrink-0 text-slate-900" />
        <span>
          Bạn đang mở bằng trình duyệt trong ứng dụng <strong>{browserName}</strong>. Để tải về tệp Word (.docx) và xem trước tốt nhất, vui lòng bấm vào nút <strong>•••</strong> ở góc trên và chọn <strong>"Mở bằng trình duyệt ngoài"</strong> (Chrome / Safari).
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-600 rounded-lg text-slate-900 cursor-pointer shrink-0 ml-2"
        title="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
