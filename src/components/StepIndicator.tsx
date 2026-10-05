import React from 'react';
import { StepNumber } from '../types';
import { Check, FileType, Upload, BrainCircuit, FileCheck } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: StepNumber;
  setStep: (step: StepNumber) => void;
  maxAccessibleStep: StepNumber;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  setStep,
  maxAccessibleStep
}) => {
  const steps = [
    { number: 1 as StepNumber, title: '1. Loại văn bản', subtitle: '29 loại NĐ 30 & 15 loại HD 05', icon: FileType },
    { number: 2 as StepNumber, title: '2. Gửi văn bản', subtitle: 'Tải file Word / Dán', icon: Upload },
    { number: 3 as StepNumber, title: '3. Phân tích văn bản', subtitle: 'Báo cáo chuẩn hóa', icon: BrainCircuit },
    { number: 4 as StepNumber, title: '4. Chỉnh sửa & Xuất file', subtitle: 'Sửa 3 hạng mục & Tải Word', icon: FileCheck }
  ];

  return (
    <div className="bg-white rounded-2xl p-3 md:p-4 shadow-xs border border-slate-200 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 relative">
        {steps.map((s, idx) => {
          const isCompleted = currentStep > s.number;
          const isCurrent = currentStep === s.number;
          const isAccessible = s.number <= maxAccessibleStep;
          const Icon = s.icon;

          return (
            <button
              key={s.number}
              disabled={!isAccessible}
              onClick={() => isAccessible && setStep(s.number)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left relative ${
                isCurrent
                  ? 'bg-red-50/80 border-2 border-red-600 shadow-xs'
                  : isCompleted
                  ? 'bg-emerald-50/60 border border-emerald-200 hover:bg-emerald-50'
                  : isAccessible
                  ? 'border border-slate-200 hover:bg-slate-50'
                  : 'opacity-50 cursor-not-allowed border border-dashed border-slate-200'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
              </div>

              <div className="overflow-hidden">
                <div
                  className={`text-xs md:text-sm font-bold truncate ${
                    isCurrent
                      ? 'text-red-800'
                      : isCompleted
                      ? 'text-emerald-800'
                      : 'text-slate-700'
                  }`}
                >
                  {s.title}
                </div>
                <div className="text-[11px] text-slate-500 truncate hidden sm:block">
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
