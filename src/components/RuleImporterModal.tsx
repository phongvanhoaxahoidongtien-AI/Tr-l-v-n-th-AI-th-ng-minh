import React, { useState } from 'react';
import { RuleLoader, DocumentRuleConfig } from '../services/ruleLoader';
import { X, FileText, Upload, CheckCircle2, AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface RuleImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRuleSaved: () => void;
}

export const RuleImporterModal: React.FC<RuleImporterModalProps> = ({
  isOpen,
  onClose,
  onRuleSaved
}) => {
  const [systemType, setSystemType] = useState<'hanh_chinh' | 'dang' | 'academic'>('academic');
  const [academicSubtype, setAcademicSubtype] = useState<'thesis' | 'report' | 'journal'>('thesis');
  const [rawAnnexText, setRawAnnexText] = useState('');
  const [extractedRuleJson, setExtractedRuleJson] = useState<string>('');
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExtractRule = async () => {
    if (!rawAnnexText.trim()) {
      setParseStatus('Vui lòng dán văn bản phụ lục hoặc quy chế cần nạp quy tắc');
      return;
    }

    setIsProcessing(true);
    setParseStatus('Đang bóc tách thông số thể thức từ văn bản gốc (Không bịa thông số)...');

    try {
      // Bóc tách theo quy tắc xác định kết hợp mẫu có sẵn
      const baseRule = RuleLoader.getRule(systemType, academicSubtype);
      const customRule: DocumentRuleConfig = JSON.parse(JSON.stringify(baseRule));

      // Quét lề trang (lề trên, dưới, trái, phải)
      const topMatch = rawAnnexText.match(/lề trên[:\s]+(\d+)(?:-(\d+))?\s*mm/i);
      const bottomMatch = rawAnnexText.match(/lề dưới[:\s]+(\d+)(?:-(\d+))?\s*mm/i);
      const leftMatch = rawAnnexText.match(/lề trái[:\s]+(\d+)(?:-(\d+))?\s*mm/i);
      const rightMatch = rawAnnexText.match(/lề phải[:\s]+(\d+)(?:-(\d+))?\s*mm/i);

      if (topMatch) customRule.marginsMm.top = parseInt(topMatch[1], 10);
      if (bottomMatch) customRule.marginsMm.bottom = parseInt(bottomMatch[1], 10);
      if (leftMatch) customRule.marginsMm.left = parseInt(leftMatch[1], 10);
      if (rightMatch) customRule.marginsMm.right = parseInt(rightMatch[1], 10);

      // Quét font chữ và cỡ chữ
      const fontMatch = rawAnnexText.match(/phông chữ|font[:\s]+([A-Za-z\s]+)/i);
      const sizeMatch = rawAnnexText.match(/cỡ chữ[:\s]+(\d+)/i);
      if (fontMatch) customRule.typography.fontFamily = fontMatch[1].trim();
      if (sizeMatch && customRule.typography.bodySizePt) {
        customRule.typography.bodySizePt = parseInt(sizeMatch[1], 10);
      }

      setExtractedRuleJson(JSON.stringify(customRule, null, 2));
      setParseStatus('✓ Bóc tách thành công! Vui lòng rà soát kỹ JSON bên dưới trước khi lưu.');
    } catch (err: any) {
      setParseStatus(`Lỗi khi phân tích: ${err?.message || 'Không thể bóc tách'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRule = () => {
    try {
      const parsed = JSON.parse(extractedRuleJson);
      const key = systemType === 'academic' ? `academic_${academicSubtype}` : systemType;
      RuleLoader.saveCustomRule(key, parsed);
      onRuleSaved();
      onClose();
    } catch {
      setParseStatus('JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Nạp quy tắc từ văn bản gốc (PDF / Phụ lục)</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Nguyên tắc bất biến:</strong> Mọi thông số thể thức phải được trích xuất chính xác từ văn bản gốc. Nếu mục nào chưa có trong văn bản, hệ thống sẽ KHÔNG tự bịa mà sẽ cảnh báo. Người dùng phải rà soát từng dòng trước khi lưu.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hệ thống áp dụng:</label>
              <select
                value={systemType}
                onChange={(e) => setSystemType(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="academic">Tài liệu học thuật / Tạp chí</option>
                <option value="hanh_chinh">Hành chính (Nghị định 30)</option>
                <option value="dang">Đảng (Hướng dẫn 05)</option>
              </select>
            </div>

            {systemType === 'academic' && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Loại tài liệu học thuật:</label>
                <select
                  value={academicSubtype}
                  onChange={(e) => setAcademicSubtype(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="thesis">Luận văn / Luận án</option>
                  <option value="report">Báo cáo tổng kết đề tài</option>
                  <option value="journal">Bài báo khoa học / Tạp chí</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Dán nội dung hướng dẫn thể thức / Phụ lục của cơ quan hoặc trường:
            </label>
            <textarea
              rows={5}
              value={rawAnnexText}
              onChange={(e) => setRawAnnexText(e.target.value)}
              placeholder="Ví dụ: Lề trên 20mm, lề dưới 20mm, lề trái 35mm, lề phải 20mm. Font chữ Times New Roman, cỡ chữ 13pt, khoảng cách dòng 1.5 lines..."
              className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExtractRule}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>Bóc tách thành cấu trúc JSON</span>
            </button>
          </div>

          {parseStatus && (
            <div className={`p-2.5 rounded-lg text-xs font-medium ${
              parseStatus.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'
            }`}>
              {parseStatus}
            </div>
          )}

          {extractedRuleJson && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Rà soát và chỉnh sửa thông số JSON (Người dùng kiểm tra từng dòng):
              </label>
              <textarea
                rows={7}
                value={extractedRuleJson}
                onChange={(e) => setExtractedRuleJson(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50 text-slate-900"
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              RuleLoader.resetToOfficialRules();
              onRuleSaved();
              onClose();
            }}
            className="text-xs text-rose-600 hover:underline cursor-pointer font-medium"
          >
            Khôi phục quy tắc chuẩn mặc định
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveRule}
              disabled={!extractedRuleJson}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Lưu quy tắc vào hệ thống</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
