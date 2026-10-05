import React, { useState } from 'react';
import { DocumentTypeItem, AgencySettings, DocumentAnalysisReport } from '../types';
import { generateDecree30A4Html } from '../services/decree30Formatter';
import { downloadWordDocument, copyFormattedDocument } from '../services/fileDownloader';
import { InteractiveDocumentEditor } from './InteractiveDocumentEditor';
import { 
  Download, Printer, Copy, CheckCircle, RotateCcw, 
  FileCheck, ShieldCheck, Sparkles, BookOpen, FileText,
  AlertCircle, ExternalLink, HelpCircle, Edit3, Eye, Columns,
  Check, ArrowRight
} from 'lucide-react';

interface Step4ExportProps {
  normalizedText: string;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  onReset: () => void;
  openGuidelines: () => void;
  onUpdateNormalizedText?: (text: string) => void;
  analysisReport?: DocumentAnalysisReport;
  originalText?: string;
}

export const Step4Export: React.FC<Step4ExportProps> = ({
  normalizedText,
  selectedType,
  agencySettings,
  onReset,
  openGuidelines,
  onUpdateNormalizedText,
  analysisReport,
  originalText
}) => {
  // Chế độ xem: 'edit' (Chỉnh sửa 3 hạng mục), 'split' (Xem song song), 'preview' (Xem trang A4)
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedWordFormat, setIsCopiedWordFormat] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  // Tạo HTML A4 real-time theo nội dung đã chỉnh sửa
  const a4PreviewHtml = generateDecree30A4Html(
    normalizedText, 
    agencySettings, 
    selectedType.category,
    selectedType.name
  );

  // Tải file Word với công nghệ đa tầng giải quyết triệt để lỗi "cần có quyền để tải xuống"
  const handleDownloadWord = async () => {
    const safeName = (selectedType.name || 'VanBan').replace(/\s+/g, '_');
    const fileName = `${safeName}_ChuanHoa_ND30.doc`;

    setDownloadNotice('Đang bắt đầu tải file Word về máy...');

    const res = await downloadWordDocument({
      htmlContent: a4PreviewHtml,
      fileName,
      plainText: normalizedText
    });

    if (res.success) {
      setDownloadNotice('Đã kích hoạt tải file Word (.doc) về máy thành công!');
      setTimeout(() => setDownloadNotice(null), 4000);
    } else {
      setShowPermissionHelp(true);
      setDownloadNotice(res.message || 'Trình duyệt đang chặn tải tự động. Vui lòng bấm "Sao chép sang Word" bên cạnh!');
    }
  };

  // Sao chép định dạng bảng 2 cột & căn lề thẳng vào Clipboard cho Microsoft Word
  const handleCopyWordFormat = async () => {
    const success = await copyFormattedDocument(a4PreviewHtml, normalizedText);
    if (success) {
      setIsCopiedWordFormat(true);
      setTimeout(() => setIsCopiedWordFormat(false), 2500);
    }
  };

  // Sao chép text thường
  const handleCopyPlainText = () => {
    navigator.clipboard.writeText(normalizedText).then(() => {
      setIsCopiedText(true);
      setTimeout(() => setIsCopiedText(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTextChange = (newText: string) => {
    if (onUpdateNormalizedText) {
      onUpdateNormalizedText(newText);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs border border-slate-200 font-sans space-y-6 animate-fade-in">
      
      {/* Top Banner: Tiêu đề & Thông báo trạng thái */}
      <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 rounded-2xl p-5 border border-red-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              👧
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100/90 px-2.5 py-0.5 rounded-full border border-red-200">
                  Bước 4: Chỉnh sửa và xuất file
                </span>
                <span className="text-xs font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200">
                  {selectedType.name} ({selectedType.category === 'dang' ? 'HD 05-HD/VPTW' : 'NĐ 30/2020/NĐ-CP'})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-serif">
                Chỉnh sửa trực tiếp 3 hạng mục & Tải file Word chuẩn
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                Đồng chí có thể sửa nhanh các ô nhập ở 3 hạng mục bên dưới, bấm vào chỗ <strong>tô vàng</strong> để sửa chính tả hoặc điền chỗ trống, sau đó tải file Word hoặc sao chép dán vào Word giữ nguyên 100% bố cục 2 cột.
              </p>
            </div>
          </div>

          <button
            onClick={openGuidelines}
            className="text-xs text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 self-start md:self-center transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <BookOpen className="w-4 h-4 text-rose-600" />
            <span>Tra cứu quy chuẩn NĐ 30</span>
          </button>
        </div>

        {downloadNotice && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold animate-fade-in flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
        )}
      </div>

      {/* Main Action Buttons Grid: Xuất file & Tải Word */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
        
        {/* 1. Download Word (.doc) */}
        <button
          onClick={handleDownloadWord}
          className="p-3.5 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white shadow-md flex items-center gap-3 group transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">Tải file Word (.doc)</div>
            <div className="text-[11px] text-blue-100">Bảng 2 cột & căn lề chuẩn NĐ 30</div>
          </div>
        </button>

        {/* 2. Copy Rich Format to Word */}
        <button
          onClick={handleCopyWordFormat}
          className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-900 text-white shadow-md flex items-center gap-3 group transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            {isCopiedWordFormat ? <CheckCircle className="w-5 h-5 text-emerald-300" /> : <FileCheck className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">
              {isCopiedWordFormat ? 'Đã sao chép Word!' : 'Sao chép sang Word'}
            </div>
            <div className="text-[11px] text-emerald-100">Dán Ctrl+V giữ 100% bố cục</div>
          </div>
        </button>

        {/* 3. Copy Plain Text */}
        <button
          onClick={handleCopyPlainText}
          className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white shadow-md flex items-center gap-3 group transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            {isCopiedText ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">
              {isCopiedText ? 'Đã sao chép Text!' : 'Sao chép văn bản'}
            </div>
            <div className="text-[11px] text-slate-300">Dán vào phần mềm quản lý</div>
          </div>
        </button>

        {/* 4. Print A4 */}
        <button
          onClick={handlePrint}
          className="p-3.5 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md flex items-center gap-3 group transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">In ấn / Xuất PDF</div>
            <div className="text-[11px] text-amber-100">Khổ A4 chuẩn công vụ</div>
          </div>
        </button>

      </div>

      {/* Helpful Permission Guide */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-800">Mẹo hữu ích khi làm việc với Word: </strong>
          Đồng chí có thể tải trực tiếp file <kbd className="px-1 py-0.5 bg-slate-200 rounded font-mono text-[10px]">.doc</kbd> về máy, hoặc bấm nút màu xanh lá <strong>"Sao chép sang Word"</strong> ở trên, rồi mở Microsoft Word nhấn <kbd className="px-1 py-0.5 bg-slate-200 rounded font-mono text-[10px]">Ctrl + V</kbd> — toàn bộ bảng 2 cột tiêu đề, đường kẻ ngang, trích yếu V/v, kính gửi, nội dung căn đều và nơi nhận/chữ ký sẽ được dán vào Word chuẩn xác 100%!
        </div>
      </div>

      {/* Mode View Tabs Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'edit'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-rose-600" />
            <span>Khung sửa 3 hạng mục văn bản</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer hidden md:flex ${
              viewMode === 'split'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-indigo-600" />
            <span>Xem song song (Sửa & Xem A4)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Xem toàn màn hình A4 chuẩn NĐ 30</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-sans hidden sm:block">
          Dữ liệu được cập nhật tự động khi đồng chí chỉnh sửa
        </div>
      </div>

      {/* Main Content Area based on viewMode */}
      {viewMode === 'edit' && (
        <div className="space-y-4">
          <InteractiveDocumentEditor
            normalizedText={normalizedText}
            selectedType={selectedType}
            agencySettings={agencySettings}
            onUpdateText={handleTextChange}
            analysisReport={analysisReport}
          />
        </div>
      )}

      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Khung sửa 3 hạng mục */}
          <div className="lg:col-span-7 space-y-4 max-h-[850px] overflow-y-auto pr-1">
            <InteractiveDocumentEditor
              normalizedText={normalizedText}
              selectedType={selectedType}
              agencySettings={agencySettings}
              onUpdateText={handleTextChange}
              analysisReport={analysisReport}
            />
          </div>

          {/* Cột phải: Xem trước trang in A4 */}
          <div className="lg:col-span-5 bg-slate-200/90 rounded-2xl p-4 border border-slate-300 max-h-[850px] overflow-y-auto shadow-inner flex flex-col items-center">
            <div className="w-full mb-2 flex items-center justify-between text-xs text-slate-700 font-bold">
              <span>Bản in A4 thực tế (Real-time):</span>
              <button
                onClick={() => setViewMode('preview')}
                className="text-blue-700 hover:underline cursor-pointer"
              >
                Phóng to →
              </button>
            </div>
            <div 
              className="w-full bg-white rounded-sm shadow-xl p-6 min-h-[700px] select-text text-xs"
              style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
            >
              <div dangerouslySetInnerHTML={{ __html: a4PreviewHtml }} />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'preview' && (
        <div className="p-4 md:p-8 bg-slate-200 rounded-xl border border-slate-300 max-h-[850px] overflow-y-auto shadow-inner flex justify-center">
          <div 
            className="w-full max-w-[820px] bg-white rounded-sm shadow-2xl p-8 md:p-14 min-h-[920px] select-text"
            style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
          >
            <div dangerouslySetInnerHTML={{ __html: a4PreviewHtml }} />
          </div>
        </div>
      )}

      {/* Bottom reset actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 font-sans">
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Soạn / Chuẩn hóa văn bản mới
        </button>

        <span className="text-xs text-slate-500 italic text-center font-serif">
          Văn bản được lưu cục bộ trên máy của đồng chí, bảo mật an toàn 100%.
        </span>
      </div>

    </div>
  );
};
