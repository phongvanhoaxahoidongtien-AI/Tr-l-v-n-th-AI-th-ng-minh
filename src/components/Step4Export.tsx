import React, { useState } from 'react';
import { DocumentTypeItem, AgencySettings } from '../types';
import { 
  Download, Printer, Copy, CheckCircle, RotateCcw, 
  FileCheck, ShieldCheck, Share2, Sparkles, BookOpen
} from 'lucide-react';

interface Step4ExportProps {
  normalizedText: string;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  onReset: () => void;
  openGuidelines: () => void;
}

export const Step4Export: React.FC<Step4ExportProps> = ({
  normalizedText,
  selectedType,
  agencySettings,
  onReset,
  openGuidelines
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // Tải file .doc chuẩn Unicode UTF-8 mở được 100% trên MS Word
  const handleDownloadWord = () => {
    // Tạo cấu trúc HTML cho MS Word để giữ đúng font Times New Roman, căn lề và định dạng A4
    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${selectedType.name}</title>
        <style>
          @page Section1 {
            size: 21.0cm 29.7cm; /* A4 */
            margin: 2.0cm 2.0cm 2.0cm 3.0cm; /* Lề trên, dưới, phải 2cm, trái 3cm chuẩn NĐ 30 */
            mso-header-margin: 36.0pt;
            mso-footer-margin: 36.0pt;
            mso-paper-source: 0;
          }
          div.Section1 { page: Section1; }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 14pt;
            line-height: 1.5;
            color: #000000;
          }
          p { margin: 0; padding: 0; margin-bottom: 6pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${normalizedText.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordHtml], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (selectedType.name || 'VanBan').replace(/\s+/g, '_');
    link.href = url;
    link.download = `${safeName}_ChuanHoa_ND30.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(normalizedText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xs border border-slate-200">
      
      {/* Success banner */}
      <div className="text-center max-w-xl mx-auto py-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce-short">
          <FileCheck className="w-9 h-9" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Bước 4: Hoàn tất chuẩn hóa
        </span>

        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mt-3 font-serif">
          Văn bản đã sẵn sàng phát hành!
        </h2>

        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Văn bản của đồng chí đã được Tiểu Bảo rà soát toàn diện thể thức, căn chỉnh lề, 
          chuẩn hóa chính tả và kiểm tra địa danh theo đúng quy định hiện hành.
        </p>
      </div>

      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-6">
        
        {/* Download Word */}
        <button
          onClick={handleDownloadWord}
          className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md flex flex-col items-center justify-center text-center gap-2 group transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-base">Tải tệp Word (.doc)</div>
            <div className="text-xs text-blue-100 mt-0.5">Mở chuẩn Microsoft Word</div>
          </div>
        </button>

        {/* Copy Text */}
        <button
          onClick={handleCopy}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white shadow-md flex flex-col items-center justify-center text-center gap-2 group transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
            {isCopied ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
          </div>
          <div>
            <div className="font-bold text-base">
              {isCopied ? 'Đã sao chép!' : 'Sao chép văn bản'}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">Dán vào phần mềm quản lý</div>
          </div>
        </button>

        {/* Print A4 */}
        <button
          onClick={handlePrint}
          className="p-5 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md flex flex-col items-center justify-center text-center gap-2 group transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-base">In ấn văn bản (A4)</div>
            <div className="text-xs text-amber-100 mt-0.5">Xem trước & in trực tiếp</div>
          </div>
        </button>

      </div>

      {/* Mini paper preview */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Bản xem trước văn bản chuẩn hóa hoàn chỉnh:
          </span>
          <button
            onClick={openGuidelines}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Tra cứu quy cách trình bày NĐ 30
          </button>
        </div>

        <div className="p-6 md:p-8 bg-slate-50 rounded-xl border border-slate-200 font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-h-72 overflow-y-auto">
          {normalizedText}
        </div>
      </div>

      {/* Bottom reset actions */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Soạn / Chuẩn hóa văn bản mới
        </button>

        <span className="text-xs text-slate-500 italic text-center">
          Văn bản được lưu tạm thời trên trình duyệt của đồng chí, bảo mật tuyệt đối.
        </span>
      </div>

    </div>
  );
};
