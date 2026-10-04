import React, { useState } from 'react';
import { NormalizeResult, DocumentTypeItem, AgencySettings } from '../types';
import { 
  AlertTriangle, CheckCircle, ShieldCheck, ArrowRight, ArrowLeft, 
  Copy, FileCheck, Eye, GitCompare, Sparkles, Check, X, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Step3ExpertAnalysisProps {
  result: NormalizeResult;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  originalText: string;
  onApplyAgencyFix: () => void;
  onDismissAgencyFix: () => void;
  onNext: () => void;
  onBack: () => void;
  onUpdateNormalizedText: (text: string) => void;
}

export const Step3ExpertAnalysis: React.FC<Step3ExpertAnalysisProps> = ({
  result,
  selectedType,
  agencySettings,
  originalText,
  onApplyAgencyFix,
  onDismissAgencyFix,
  onNext,
  onBack,
  onUpdateNormalizedText
}) => {
  const [activeTab, setActiveTab] = useState<'paper' | 'diff' | 'errors'>('paper');
  const [isCopied, setIsCopied] = useState(false);

  // Trigger celebration confetti when entering step with high score
  React.useEffect(() => {
    if (result.diemSau >= 90) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#dc2626', '#f59e0b', '#10b981']
        });
      } catch (e) {
        // ignore
      }
    }
  }, [result.diemSau]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.noiDungChuanHoa).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Critical Agency & Location Difference Warning */}
      {result.canhBaoCoQuan && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-500 rounded-2xl p-5 shadow-md animate-pulse-subtle">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded">
                  Cảnh báo quan trọng từ Tiểu Bảo
                </span>
                <span className="text-xs font-semibold text-amber-800">
                  Phát hiện khác biệt tên Cơ quan / Địa danh
                </span>
              </div>

              <p className="text-sm md:text-[15px] font-bold text-amber-950 mt-1.5 leading-relaxed">
                {result.canhBaoCoQuan}
              </p>

              <div className="mt-2 text-xs text-amber-800 bg-white/80 p-2.5 rounded-lg border border-amber-300">
                <span>Cài đặt của đồng chí: </span>
                <strong className="text-amber-950">{agencySettings.agencyName || 'Chưa cài'}</strong>
                {agencySettings.shortLocation && (
                  <span> — Địa danh: <strong className="text-amber-950">{agencySettings.shortLocation}</strong></span>
                )}
              </div>

              {/* Confirmation Question & Actions */}
              <div className="mt-4 pt-3 border-t border-amber-300/80 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-amber-950">
                  Bạn có muốn Tiểu Bảo sửa thành tên cơ quan đã cài đặt không?
                </span>

                <button
                  onClick={onApplyAgencyFix}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Đồng ý sửa thành tên đã cài đặt
                </button>

                <button
                  onClick={onDismissAgencyFix}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  Giữ nguyên theo văn bản gốc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Scoreboard */}
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          
          {/* Score Before */}
          <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center font-black shadow-xs">
              <span className="text-xl leading-none">{result.diemTruoc}</span>
              <span className="text-[10px] text-red-200">/ 100</span>
            </div>
            <div>
              <div className="text-xs font-bold text-red-800 uppercase tracking-wide">
                Điểm thể thức ban đầu
              </div>
              <div className="text-xs text-red-600 mt-0.5">
                Còn tồn tại lỗi chính tả & chưa khớp thể thức
              </div>
            </div>
          </div>

          {/* Transformation Arrow */}
          <div className="text-center hidden md:block">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Tiểu Bảo đã chuẩn hóa
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Phát hiện & sửa: <strong className="text-slate-800">{result.soLoi} lỗi</strong>
            </div>
          </div>

          {/* Score After */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center font-black shadow-xs">
              <span className="text-xl leading-none">{result.diemSau}</span>
              <span className="text-[10px] text-emerald-200">/ 100</span>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1">
                Điểm sau chuẩn hóa
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Chuẩn Nghị định 30/2020 & Hướng dẫn 05
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Document View Tabs & Actions */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        
        {/* Tab Buttons Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('paper')}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'paper'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              Trang in A4 chuẩn thể thức
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              So sánh Trước - Sau
            </button>

            <button
              onClick={() => setActiveTab('errors')}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'errors'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              Danh sách {result.danhSachLoi.length} lỗi đã sửa
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {isCopied ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Sao chép văn bản
              </>
            )}
          </button>
        </div>

        {/* Tab 1: Paper Format A4 */}
        {activeTab === 'paper' && (
          <div className="p-4 md:p-8 bg-slate-100/70 flex justify-center">
            {/* Standard Vietnamese A4 Document simulation */}
            <div className="w-full max-w-[820px] bg-white rounded-lg shadow-lg border border-slate-300 p-8 md:p-14 font-serif text-[15px] leading-relaxed text-slate-900 min-h-[700px] select-text">
              <textarea
                value={result.noiDungChuanHoa}
                onChange={(e) => onUpdateNormalizedText(e.target.value)}
                rows={22}
                className="w-full h-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 font-serif text-[15px] leading-[1.65] text-slate-900"
                title="Đồng chí có thể chỉnh sửa trực tiếp nội dung văn bản tại đây nếu cần"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Diff view */}
        {activeTab === 'diff' && (
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50">
            <div>
              <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <span>🔴 Văn bản gốc ban đầu (Chưa sửa):</span>
              </div>
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[550px] overflow-y-auto">
                {originalText}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <span>🟢 Văn bản sau khi Tiểu Bảo chuẩn hóa:</span>
              </div>
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 font-serif text-sm leading-relaxed text-slate-900 whitespace-pre-wrap max-h-[550px] overflow-y-auto">
                {result.noiDungChuanHoa}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Errors and Recommendations */}
        {activeTab === 'errors' && (
          <div className="p-5 md:p-6 space-y-6">
            <div>
              <h4 className="font-bold text-slate-800 text-sm md:text-base mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Các điểm lỗi thể thức & chính tả đã được Tiểu Bảo rà soát:
              </h4>

              {result.danhSachLoi.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {result.danhSachLoi.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs md:text-sm text-slate-800"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Không phát hiện lỗi chính tả nghiêm trọng nào.
                </p>
              )}
            </div>

            {/* Suggestions */}
            {result.goiY && result.goiY.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm md:text-base mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Gợi ý nâng cao chất lượng văn bản từ chuyên gia:
                </h4>
                <div className="space-y-2">
                  {result.goiY.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs md:text-sm text-amber-950 flex items-start gap-2"
                    >
                      <span className="text-amber-600 font-bold shrink-0">•</span>
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Sửa lại văn bản gốc (Bước 2)
        </button>

        <button
          onClick={onNext}
          className="w-full sm:w-auto bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-bold px-7 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <span>Tiến hành Xuất file (Bước 4)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
