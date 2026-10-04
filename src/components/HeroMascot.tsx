import React, { useState } from 'react';
import { AgencySettings } from '../types';
import { ShieldCheck, MessageCircle, Sparkles, Building2, HelpCircle } from 'lucide-react';

interface HeroMascotProps {
  agencySettings: AgencySettings;
  openSettings: () => void;
  customMessage?: string;
}

export const HeroMascot: React.FC<HeroMascotProps> = ({
  agencySettings,
  openSettings,
  customMessage
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  const tips = [
    "Theo Nghị định 30/2020/NĐ-CP, Tiêu ngữ 'Độc lập - Tự do - Hạnh phúc' phải được đặt dưới Quốc hiệu và có đường kẻ ngang bằng độ dài của dòng chữ.",
    "Địa danh trong văn bản hành chính là tên gọi chính thức của đơn vị hành chính nơi cơ quan, tổ chức đóng trụ sở.",
    "Công văn hành chính bắt buộc phải có phần Kính gửi và phần trích yếu nội dung văn bản dưới số, ký hiệu.",
    "Chữ ký của người có thẩm quyền không được trùng lên dòng chữ ghi chức danh hoặc họ và tên.",
    "Hướng dẫn 05-HD/VPTW quy định văn bản Đảng sử dụng font chữ Unicode TCVN 6909:2001, cỡ chữ 13-14."
  ];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % tips.length);
  };

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-amber-50/40 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200/80 mb-8 relative overflow-hidden">
      {/* Background soft seal badge */}
      <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full border-12 border-red-500/5 flex items-center justify-center pointer-events-none select-none">
        <span className="text-7xl font-serif text-red-500/10 font-black">★</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
        
        {/* Mascot Avatar - Tiểu Bảo */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 p-1 shadow-md shadow-indigo-950/20 group-hover:scale-105 transition-transform flex items-center justify-center">
            {/* SVG Male Civil Servant Mascot "Tiểu Bảo" */}
            <div className="w-full h-full bg-white rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Background glow */}
                <circle cx="50" cy="50" r="48" fill="#e0f2fe" />
                {/* Hair */}
                <path d="M25 42 C 25 20, 75 20, 75 42 C 75 45, 80 32, 70 24 C 60 16, 40 16, 30 24 C 20 32, 25 45, 25 42 Z" fill="#1e293b" />
                {/* Ears */}
                <circle cx="26" cy="46" r="6" fill="#fbcfe8" />
                <circle cx="74" cy="46" r="6" fill="#fbcfe8" />
                {/* Face */}
                <ellipse cx="50" cy="48" rx="24" ry="26" fill="#fed7aa" />
                {/* Hair fringe */}
                <path d="M28 34 Q 40 38 52 30 Q 64 38 72 35 Q 60 22 50 22 Q 40 22 28 34" fill="#1e293b" />
                {/* Cheeks blush */}
                <circle cx="36" cy="54" r="4" fill="#fca5a5" opacity="0.6" />
                <circle cx="64" cy="54" r="4" fill="#fca5a5" opacity="0.6" />
                {/* Eyes with cheerful shine */}
                <circle cx="38" cy="46" r="3.5" fill="#0f172a" />
                <circle cx="62" cy="46" r="3.5" fill="#0f172a" />
                <circle cx="39.5" cy="44.5" r="1.2" fill="#ffffff" />
                <circle cx="63.5" cy="44.5" r="1.2" fill="#ffffff" />
                {/* Eyebrows */}
                <path d="M34 40 Q 38 38 42 41" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M66 40 Q 62 38 58 41" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                {/* Friendly Smile */}
                <path d="M44 56 Q 50 62 56 56" stroke="#991b1b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                {/* Neck & Shirt Collar */}
                <rect x="42" y="70" width="16" height="10" fill="#fed7aa" />
                <path d="M20 100 L 28 78 L 72 78 L 80 100 Z" fill="#1e40af" />
                <polygon points="50,78 40,92 50,88 60,92" fill="#ffffff" />
                {/* Red Tie */}
                <polygon points="48,84 52,84 54,98 50,100 46,98" fill="#dc2626" />
              </svg>
            </div>
          </div>
          {/* Status badge */}
          <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Speech Bubble */}
        <div className="flex-1 w-full text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <span className="font-bold text-slate-800 text-base md:text-lg flex items-center gap-1.5">
              Tiểu Bảo
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Trợ lý văn thư 1.0
              </span>
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Chuẩn Nghị định 30 & HD 05
            </span>
          </div>

          <div className="bg-white rounded-xl p-3.5 md:p-4 border border-slate-200/90 shadow-xs relative">
            <p className="text-sm md:text-[15px] text-slate-700 leading-relaxed font-normal">
              {customMessage || (
                <>
                  <span className="font-semibold text-red-700">Chào đồng chí!</span> Tôi là <strong>Tiểu Bảo</strong>. 
                  Hãy gửi văn bản của đồng chí lên hoặc chọn soạn từ mẫu có sẵn, tôi sẽ hỗ trợ kiểm tra thể thức, 
                  rà soát lỗi chính tả tiếng Việt và đối chiếu tên cơ quan chuẩn xác 100%!
                </>
              )}
            </p>

            {/* Configured Agency info chip & Tip toggle */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Đang áp dụng Cơ quan: <strong className="text-slate-900">{agencySettings.agencyName || 'Chưa cài đặt'}</strong> ({agencySettings.shortLocation || 'Chưa có địa danh'})
                </span>
                <button 
                  onClick={openSettings}
                  className="text-blue-600 hover:text-blue-800 font-medium underline ml-1 cursor-pointer"
                >
                  Thay đổi
                </button>
              </div>

              <button
                onClick={handleNextTip}
                className="text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Xem mẹo văn thư hữu ích tiếp theo"
              >
                <HelpCircle className="w-3 h-3 text-amber-600" />
                <span>Mẹo văn thư: <span className="font-semibold underline">Đổi mẹo</span></span>
              </button>
            </div>

            {/* Display current tip */}
            <div className="mt-2 text-xs text-amber-900 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60 flex items-start gap-1.5">
              <span className="font-bold text-amber-700 shrink-0">💡 Lưu ý:</span>
              <span className="italic">{tips[tipIndex]}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
