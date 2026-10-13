import React from 'react';
import { StepNumber } from '../types';
import { Check, FileType, Upload, BrainCircuit, FileCheck, Home, Sparkles, Edit3 } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: StepNumber;
  setStep: (step: StepNumber) => void;
  maxAccessibleStep: StepNumber;
  onGoHome?: () => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  setStep,
  maxAccessibleStep,
  onGoHome
}) => {
  const steps = [
    { number: 1 as StepNumber, title: '1. Chọn loại văn bản', subtitle: 'NĐ 30 / HD 05 / Học thuật', icon: FileType },
    { number: 2 as StepNumber, title: '2. Nhập văn bản', subtitle: 'Tải .docx, .doc hoặc dán', icon: Upload },
    { number: 3 as StepNumber, title: '3. Nhận dạng thể thức', subtitle: 'Ý kiến chuyên gia & Chấm điểm', icon: Sparkles },
    { number: 4 as StepNumber, title: '4. Chỉnh sửa văn bản', subtitle: 'Sửa song song & Xem A4', icon: Edit3 },
    { number: 5 as StepNumber, title: '5. Xuất file cuối cùng', subtitle: 'Tải Word & Hoàn tất', icon: FileCheck }
  ];

  return (
    <div className="bg-white rounded-2xl p-3 md:p-4 shadow-xs border border-slate-200 mb-6 font-sans">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 justify-between">
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              title="Quay về Trang chủ mặc định (HOME)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs font-sans"
            >
              <Home className="w-4 h-4 text-amber-700" />
              <span>Trang chủ (HOME)</span>
            </button>
          )}
          <span className="text-xs font-bold text-slate-600 hidden sm:inline">
            Quy trình chuẩn hóa văn bản hành chính 5 bước (chuẩn Nghị định 30/2020/NĐ-CP)
          </span>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Bước <strong className="text-red-700 text-sm">{currentStep}</strong> / 5
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-2.5 relative">
        {steps.map((s) => {
          const isCompleted = currentStep > s.number;
          const isCurrent = currentStep === s.number;
          const isAccessible = s.number <= maxAccessibleStep;
          const Icon = s.icon;

          return (
            <button
              key={s.number}
              disabled={!isAccessible}
              onClick={() => isAccessible && setStep(s.number)}
              className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl transition-all text-left relative ${
                isCurrent
                  ? 'bg-red-50/90 border-2 border-red-600 shadow-xs ring-2 ring-red-400/20'
                  : isCompleted
                  ? 'bg-emerald-50/60 border border-emerald-200 hover:bg-emerald-50 cursor-pointer'
                  : isAccessible
                  ? 'border border-slate-200 hover:bg-slate-50 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed border border-dashed border-slate-200'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
              </div>

              <div className="overflow-hidden min-w-0">
                <div
                  className={`text-xs sm:text-[13px] font-bold truncate ${
                    isCurrent
                      ? 'text-red-800'
                      : isCompleted
                      ? 'text-emerald-800'
                      : 'text-slate-700'
                  }`}
                >
                  {s.title}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 truncate hidden md:block">
                  {s.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
