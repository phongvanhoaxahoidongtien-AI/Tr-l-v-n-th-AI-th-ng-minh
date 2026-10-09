import React, { useState } from 'react';
import { AgencySettings } from '../types';
import { getOfficerSalutation } from '../utils/officerSalutation';
import { ShieldCheck, Sparkles, Building2, HelpCircle, Heart, MessageSquare } from 'lucide-react';

interface HeroMascotProps {
  agencySettings: AgencySettings;
  openSettings: () => void;
  customMessage?: string;
  onQuickAsk?: (question: string) => void;
}

export const HeroMascot: React.FC<HeroMascotProps> = ({
  agencySettings,
  openSettings,
  customMessage
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  const tips = [
    "Theo Nghị định 30/2020/NĐ-CP, Tiêu ngữ 'Độc lập - Tự do - Hạnh phúc' phải được đặt dưới Quốc hiệu và có đường kẻ ngang bằng độ dài của dòng chữ.",
    "Bố cục phần đầu văn bản bắt buộc trình bày 2 cột cân xứng: Cột trái (Tên cơ quan, Số ký hiệu), Cột phải (Quốc hiệu, Tiêu ngữ, Địa danh ngày tháng).",
    "Địa danh trong văn bản hành chính là tên gọi chính thức của đơn vị hành chính nơi cơ quan, tổ chức đóng trụ sở.",
    "Công văn hành chính bắt buộc phải có phần Kính gửi và phần trích yếu nội dung văn bản dưới số, ký hiệu.",
    "Chữ ký của người có thẩm quyền không được trùm lên dòng chữ ghi chức danh hoặc họ và tên.",
    "Hướng dẫn 05-HD/VPTW quy định văn bản Đảng sử dụng font chữ Unicode TCVN 6909:2001 (Times New Roman), cỡ chữ 13-14."
  ];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % tips.length);
  };

  return (
    <div className="bg-gradient-to-br from-white via-rose-50/30 to-amber-50/40 rounded-2xl p-5 md:p-6 shadow-sm border border-rose-200/70 mb-8 relative overflow-hidden font-serif">
      {/* Background soft seal badge */}
      <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full border-12 border-red-500/5 flex items-center justify-center pointer-events-none select-none">
        <span className="text-8xl text-red-500/10 font-black">★</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
        
        {/* Female Mascot Avatar - Tiểu Bảo Bối */}
        <div className="relative group shrink-0">
          <div className="w-22 h-22 md:w-26 md:h-26 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-1 shadow-lg shadow-rose-950/20 group-hover:scale-105 transition-transform flex items-center justify-center">
            {/* SVG Female Civil Servant Mascot "Tiểu Bảo Bối" */}
            <div className="w-full h-full bg-white rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Background glow */}
                <circle cx="50" cy="50" r="48" fill="#fff1f2" />
                
                {/* Long Hair Back */}
                <path d="M22 45 C 18 68, 20 85, 26 95 C 32 95, 34 85, 32 65 Z" fill="#2d1b2d" />
                <path d="M78 45 C 82 68, 80 85, 74 95 C 68 95, 66 85, 68 65 Z" fill="#2d1b2d" />
                
                {/* Hair Top Dome */}
                <path d="M22 45 C 22 20, 78 20, 78 45 C 78 50, 82 35, 74 24 C 64 14, 36 14, 26 24 C 18 35, 22 50, 22 45 Z" fill="#2d1b2d" />

                {/* Cute Hair Bow / Ribbon (Nơ đỏ công sở xinh xắn) */}
                <path d="M30 20 C 26 14, 20 18, 26 24 C 30 26, 32 23, 30 20 Z" fill="#e11d48" />
                <path d="M36 22 C 40 16, 44 22, 38 26 C 35 27, 33 24, 36 22 Z" fill="#e11d48" />
                <circle cx="33" cy="23" r="3" fill="#facc15" />

                {/* Ears */}
                <circle cx="26" cy="48" r="5" fill="#fed7aa" />
                <circle cx="74" cy="48" r="5" fill="#fed7aa" />
                {/* Pearl Earrings */}
                <circle cx="25" cy="52" r="1.8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
                <circle cx="75" cy="52" r="1.8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />

                {/* Face */}
                <ellipse cx="50" cy="49" rx="23" ry="24" fill="#ffedd5" />

                {/* Front Hair Bangs (Mái bằng uốn nhẹ nữ tính) */}
                <path d="M26 36 Q 38 43 50 35 Q 62 43 74 36 C 72 30, 65 24, 50 24 C 35 24, 28 30, 26 36 Z" fill="#2d1b2d" />

                {/* Soft Cheeks Blush */}
                <ellipse cx="36" cy="55" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />
                <ellipse cx="64" cy="55" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />

                {/* Big Sparkling Anime Eyes (Mắt to tròn long lanh) */}
                <circle cx="38" cy="47" r="4.5" fill="#1e1b4b" />
                <circle cx="62" cy="47" r="4.5" fill="#1e1b4b" />
                {/* Big Catchlight */}
                <circle cx="39.5" cy="45" r="1.8" fill="#ffffff" />
                <circle cx="63.5" cy="45" r="1.8" fill="#ffffff" />
                {/* Small Catchlight */}
                <circle cx="37" cy="48.5" r="0.9" fill="#ffffff" />
                <circle cx="61" cy="48.5" r="0.9" fill="#ffffff" />

                {/* Eyelashes */}
                <path d="M33 44 Q 38 41 43 44" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M31 43 L 29 41" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M57 44 Q 62 41 67 44" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M69 43 L 71 41" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />

                {/* Eyebrows (Cong nhẹ thanh tú) */}
                <path d="M34 40 Q 38 37 42 39" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                <path d="M66 40 Q 62 37 58 39" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" fill="none" />

                {/* Sweet Smile with pink lip */}
                <path d="M46 56 Q 50 61 54 56" stroke="#be123c" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M47 57 Q 50 62 53 57" fill="#fb7185" opacity="0.6" />

                {/* Neck */}
                <rect x="44" y="69" width="12" height="9" fill="#ffedd5" />

                {/* Elegant White Blouse with Collar & Ribbon */}
                <path d="M22 100 L 32 76 L 68 76 L 78 100 Z" fill="#e11d48" />
                {/* Shirt Chest */}
                <polygon points="50,76 42,90 50,86 58,90" fill="#ffffff" />
                {/* Yellow Star Lapel Badge (Huy hiệu sao vàng) */}
                <circle cx="36" cy="84" r="3.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
                <polygon points="36,82 36.8,83.8 38.8,83.8 37.2,85 37.8,86.8 36,85.6 34.2,86.8 34.8,85 33.2,83.8 35.2,83.8" fill="#b45309" />
              </svg>
            </div>
          </div>
          {/* Status online badge with heart */}
          <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full p-1 border-2 border-white shadow-xs animate-bounce-subtle">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
        </div>

        {/* Speech Bubble - Bong bóng chat nổi lên */}
        <div className="flex-1 w-full text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
            <span className="font-bold text-slate-900 text-base md:text-lg flex items-center gap-1.5 font-serif">
              Tiểu Bảo Bối
              <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Trợ lý văn thư thông minh 1.0
              </span>
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-sans font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Nghị định 30 & HD 05
            </span>
          </div>

          {/* Speech bubble card with speech pointer */}
          <div className="bg-white rounded-2xl p-4 md:p-4.5 border border-rose-200 shadow-sm relative text-slate-800 font-serif">
            {/* Pointer triangle */}
            <div className="hidden sm:block absolute -left-2.5 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-10 border-r-white border-b-8 border-b-transparent drop-shadow-[-1px_0_1px_rgba(0,0,0,0.05)]" />

            {(() => {
              const salutation = getOfficerSalutation(agencySettings);
              return (
                <p className="text-sm md:text-[15px] leading-relaxed">
                  {customMessage || (
                    <>
                      <span className="font-bold text-rose-700">{salutation.greetingIntro}</span> Em là <strong>Tiểu Bảo Bối</strong> – Trợ lý văn thư thông minh 1.0 của {salutation.pronoun} đây ạ! 
                      {salutation.shortName ? ` ${salutation.shortName}` : ' Đồng chí'} hãy gửi văn bản lên hoặc chọn mẫu có sẵn, em sẽ rà soát từng dấu chấm, nét gạch tiêu ngữ, thể thức 2 cột chuẩn Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW nhé!
                    </>
                  )}
                </p>
              );
            })()}

            {/* Configured Agency info chip & Tip toggle */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>
                  Đang gắn với cơ quan: <strong className="text-slate-900 font-serif">{agencySettings.agencyName || 'Chưa cài đặt'}</strong> ({agencySettings.shortLocation || 'Chưa có địa danh'})
                </span>
                <button 
                  onClick={openSettings}
                  className="text-rose-600 hover:text-rose-800 font-medium underline ml-1 cursor-pointer"
                >
                  Thay đổi
                </button>
              </div>

              <button
                onClick={handleNextTip}
                className="text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Bấm để xem mẹo nghiệp vụ văn thư tiếp theo"
              >
                <HelpCircle className="w-3 h-3 text-amber-600" />
                <span>Mẹo văn thư: <span className="font-semibold underline">Đổi mẹo</span></span>
              </button>
            </div>

            {/* Display current tip */}
            <div className="mt-2 text-xs text-amber-900 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 flex items-start gap-1.5 font-serif">
              <span className="font-bold text-amber-800 shrink-0">💡 Tiểu Bảo Bối nhắc nhỏ:</span>
              <span className="italic leading-relaxed">{tips[tipIndex]}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
