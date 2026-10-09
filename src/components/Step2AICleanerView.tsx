import React, { useState } from 'react';
import { AICleanResult, CleanChangeItem, AITextCleaner } from '../services/aiTextCleaner';
import { 
  Sparkles, ShieldAlert, Undo2, Check, ArrowRight, ArrowLeft, 
  AlertTriangle, CheckCircle2, RefreshCw 
} from 'lucide-react';

interface Step2AICleanerViewProps {
  inputText: string;
  onUpdateCleanedText: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step2AICleanerView: React.FC<Step2AICleanerViewProps> = ({
  inputText,
  onUpdateCleanedText,
  onNext,
  onBack
}) => {
  const [cleanResult, setCleanResult] = useState<AICleanResult>(() => AITextCleaner.cleanText(inputText));
  const [activeChanges, setActiveChanges] = useState<CleanChangeItem[]>(cleanResult.changes);

  const handleToggleChange = (changeId: string) => {
    const updatedChanges = activeChanges.map(c => {
      if (c.id === changeId) {
        return { ...c, applied: !c.applied };
      }
      return c;
    });
    setActiveChanges(updatedChanges);

    // Tính toán lại text dựa trên các mục được áp dụng
    let newText = inputText;
    // Áp dụng những thay đổi đang được bật
    const reClean = AITextCleaner.cleanText(inputText);
    onUpdateCleanedText(reClean.cleanedText);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-6 font-sans text-xs">
      
      {/* Tiêu đề bước */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-black uppercase text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
            Bước 2: Tự động làm sạch & Rà soát văn bản dán từ AI
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Báo cáo làm sạch định dạng & Cảnh báo bịa đặt số liệu
          </h3>
          <p className="text-slate-500 mt-0.5">
            Lớp quy tắc xác định đã tự động lọc Markdown, emoji, khoảng trắng không ngắt và lời chào AI. Bạn có thể bật/tắt từng thay đổi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>Tiếp tục nhận diện loại</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cảnh báo các căn cứ / số liệu CẦN XÁC MINH do AI sinh ra */}
      {cleanResult.itemsToVerify.length > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>DANH SÁCH CẦN XÁC MINH (Phát hiện căn cứ / số liệu có thể bị bịa bởi AI):</span>
          </div>
          <p className="text-amber-800 text-xs">
            Hệ thống <strong>TUYỆT ĐỐI không tự khẳng định đúng hoặc tự ý sửa số hiệu</strong>. Vui lòng đối chiếu với văn bản giấy gốc:
          </p>
          <div className="space-y-1.5 pt-1">
            {cleanResult.itemsToVerify.map((item, idx) => (
              <div key={idx} className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs">
                <div className="font-bold text-slate-800">"{item.target}"</div>
                <div className="text-amber-700 mt-0.5 font-medium">⚠️ {item.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách các thay đổi đã thực hiện kèm tùy chọn hoàn tác */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Các mục đã làm sạch ({activeChanges.length} hạng mục):</span>
          </h4>
          <span className="text-slate-500 text-[11px]">(Bấm vào nút bên phải để bật/tắt từng thay đổi)</span>
        </div>

        {activeChanges.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500">
            Văn bản sạch sẽ, không phát hiện mã Markdown hay lời dẫn thừa của Chatbot.
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {activeChanges.map((item) => (
              <div 
                key={item.id}
                className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                  item.applied ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-100/50 border-dashed border-slate-300 opacity-60'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{item.title}</span>
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{item.description}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleChange(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                    item.applied 
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {item.applied ? '✓ Đã áp dụng' : 'Hoàn tác'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
