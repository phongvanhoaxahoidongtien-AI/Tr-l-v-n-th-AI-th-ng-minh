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
    { number: 1 as StepNumber, title: '1. Nhập văn bản', subtitle: 'Tải .docx hoặc chọn mẫu', icon: Upload },
    { number: 2 as StepNumber, title: '2. Làm sạch AI', subtitle: 'Lọc markdown, emoji', icon: BrainCircuit },
    { number: 3 as StepNumber, title: '3. Nhận diện thể loại', subtitle: 'Hành chính / Đảng / Học thuật', icon: FileType },
    { number: 4 as StepNumber, title: '4. Đối chiếu đơn vị', subtitle: 'Rà soát điểm chưa rõ', icon: FileType },
    { number: 5 as StepNumber, title: '5. Báo cáo thể thức', subtitle: 'Điểm 0-100 & Live Preview', icon: FileCheck },
    { number: 6 as StepNumber, title: '6. Xuất .docx', subtitle: '3 chế độ & Tải về', icon: FileCheck }
  ];

  return (
    <div className="bg-white rounded-2xl p-3 md:p-4 shadow-xs border border-slate-200 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 relative">
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
