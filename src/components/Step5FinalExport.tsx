import React, { useState, useMemo } from 'react';
import { DocumentTypeItem, AgencySettings, DocumentAnalysisReport } from '../types';
import { generateDecree30A4Html, parseDocumentStructure, reconstructNormalizedText, StructuredDoc } from '../services/decree30Formatter';
import { exportToDocxBlob } from '../services/docxExporter';
import { downloadWordDocument, copyFormattedDocument, downloadBlobFile } from '../services/fileDownloader';
import { 
  Download, Printer, Copy, CheckCircle, RotateCcw, 
  FileCheck, ShieldCheck, Sparkles, BookOpen, FileText,
  AlertCircle, ExternalLink, ArrowLeft, Maximize2, ZoomIn, ZoomOut, Home
} from 'lucide-react';

interface Step5FinalExportProps {
  normalizedText: string;
  structuredDoc?: StructuredDoc | null;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  onReset: () => void;
  openGuidelines: () => void;
  analysisReport?: DocumentAnalysisReport;
  originalText?: string;
  originalFileName?: string;
  onBack: () => void;
  onGoHome: () => void;
}

export const Step5FinalExport: React.FC<Step5FinalExportProps> = ({
  normalizedText,
  structuredDoc,
  selectedType,
  agencySettings,
  onReset,
  openGuidelines,
  analysisReport,
  originalFileName,
  onBack,
  onGoHome
}) => {
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedWordFormat, setIsCopiedWordFormat] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Parse tài liệu đã hoàn thiện: ƯU TIÊN SỐ 1 LÀ KẾT QUẢ CHỈNH SỬA TỪ "XEM VÀ SỬA SONG SONG" (BƯỚC 4)
  const doc = useMemo(() => {
    if (structuredDoc) {
      return structuredDoc;
    }
    return parseDocumentStructure(
      normalizedText, 
      agencySettings, 
      selectedType.category, 
      selectedType.name
    );
  }, [structuredDoc, normalizedText, agencySettings, selectedType.category, selectedType.name]);

  // Tên file xuất
  const getExportFileName = (extension: 'docx' | 'doc') => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const baseName = (originalFileName || selectedType.name || 'VanBan')
      .replace(/\.[^/.]+$/, '')
      .trim()
      .replace(/\s+/g, '_');
    return `${baseName}_${mm}_${dd}_${yyyy}.${extension}`;
  };

  // HTML bản in A4
  const a4PreviewHtml = useMemo(() => {
    return generateDecree30A4Html(
      doc, 
      agencySettings, 
      selectedType.category, 
      selectedType.name
    );
  }, [doc, agencySettings, selectedType.category, selectedType.name]);

  // 1. Tải file Word .docx chuẩn NĐ 30
  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      setDownloadNotice('Đang khởi tạo tệp Microsoft Word .docx chuẩn Nghị định 30...');
      const blob = await exportToDocxBlob(doc, agencySettings);
      const fileName = getExportFileName('docx');
      const success = downloadBlobFile(blob, fileName);
      if (success) {
        setDownloadNotice(`✓ Đã tải tệp "${fileName}" chuẩn Word .docx thành công!`);
        setTimeout(() => setDownloadNotice(null), 3500);
      } else {
        handleDownloadWordDoc();
      }
    } catch (err: any) {
      console.error('Lỗi khi xuất tệp docx:', err);
      handleDownloadWordDoc();
    } finally {
      setIsExportingDocx(false);
    }
  };

  // 2. Tải file Word .doc
  const handleDownloadWordDoc = async () => {
    const fileName = getExportFileName('doc');
    const res = await downloadWordDocument({
      htmlContent: a4PreviewHtml,
      fileName,
      plainText: normalizedText
    });
    if (res.success) {
      setDownloadNotice(`✓ Đã tải tệp "${fileName}" chuẩn Word .doc thành công!`);
      setTimeout(() => setDownloadNotice(null), 3500);
    } else {
      setDownloadNotice(res.message || 'Lỗi tải tệp. Đồng chí hãy sử dụng nút Sao chép sang Word!');
      setTimeout(() => setDownloadNotice(null), 4000);
    }
  };

  // 3. Sao chép định dạng sang Word
  const handleCopyFormattedWord = async () => {
    const success = await copyFormattedDocument(a4PreviewHtml, normalizedText);
    if (success) {
      setIsCopiedWordFormat(true);
      setDownloadNotice('✓ Đã sao chép toàn bộ định dạng chuẩn Word vào clipboard! Mở Microsoft Word và nhấn Ctrl + V để dán.');
      setTimeout(() => {
        setIsCopiedWordFormat(false);
        setDownloadNotice(null);
      }, 4000);
    } else {
      setDownloadNotice('Lỗi sao chép định dạng. Vui lòng thử tải file Word.');
      setTimeout(() => setDownloadNotice(null), 3500);
    }
  };

  // 4. In / Xuất PDF
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${doc.docTypeName || 'VanBan'} - Nghị định 30</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm 15mm 20mm 30mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              margin: 0;
              padding: 0;
              background: white;
            }
            .a4-page {
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${a4PreviewHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. THANH TIÊU ĐỀ BƯỚC 5 & NÚT HOME */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black shadow-xs text-lg">
            5
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                Bước 5: Xuất file cuối cùng (Hoàn tất văn bản)
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                100% Chuẩn NĐ 30 & HD 05
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Văn bản đã qua phân tích, nhận dạng và chỉnh sửa đồng bộ 4 phần thể thức. Sẵn sàng tải về hoặc in ấn.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              title="Quay về Trang chủ mặc định (HOME)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
            >
              <Home className="w-4 h-4 text-amber-700" />
              <span>HOME</span>
            </button>
          )}

          <button
            type="button"
            onClick={openGuidelines}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Cẩm nang NĐ 30</span>
          </button>
        </div>
      </div>

      {/* Thông báo tải tệp */}
      {downloadNotice && (
        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* 2. KHU VỰC THAO TÁC XUẤT FILE CHÍNH (CÁC NÚT TẢI BẬT NỔI) */}
      <div className="bg-gradient-to-r from-red-800 via-rose-800 to-red-900 rounded-2xl p-5 md:p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <h3 className="text-base sm:text-xl font-bold font-serif text-amber-100">
                Chúc mừng đồng chí! Văn bản đã được chuẩn hóa hoàn chỉnh
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-amber-200/90 mt-1">
              Đầy đủ 4 phần thể thức • Cơ quan: <strong>{doc.agencyName}</strong> • {doc.appendices?.length ? `${doc.appendices.length} Phụ lục A4 kèm theo` : 'Không có phụ lục'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/10 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-200">Đã kiểm tra lề trang & font Times New Roman</span>
          </div>
        </div>

        {/* 4 Nút hành động chính */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          
          {/* Nút 1: Tải Word (.docx) */}
          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="p-3.5 bg-white hover:bg-amber-50 text-slate-900 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300 group disabled:opacity-75"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-blue-900 font-extrabold">Tải file Word (.docx)</span>
            <span className="text-[10px] text-slate-500 font-normal">Chuẩn thể thức NĐ 30 có bảng biểu</span>
          </button>

          {/* Nút 2: Tải Word (.doc) */}
          <button
            type="button"
            onClick={handleDownloadWordDoc}
            className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <span className="text-white font-extrabold">Tải file Word (.doc)</span>
            <span className="text-[10px] text-amber-200 font-normal">Tương thích mọi máy tính cũ</span>
          </button>

          {/* Nút 3: Sao chép sang Word */}
          <button
            type="button"
            onClick={handleCopyFormattedWord}
            className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <Copy className="w-5 h-5 text-emerald-300" />
            </div>
            <span className="text-white font-extrabold">
              {isCopiedWordFormat ? '✓ Đã sao chép!' : 'Sao chép sang Word'}
            </span>
            <span className="text-[10px] text-emerald-200 font-normal">Giữ nguyên định dạng & bảng</span>
          </button>

          {/* Nút 4: In / Xuất PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <Printer className="w-5 h-5 text-sky-300" />
            </div>
            <span className="text-white font-extrabold">In / Xuất PDF</span>
            <span className="text-[10px] text-sky-200 font-normal">Mở hộp thoại in A4 chuẩn</span>
          </button>

        </div>
      </div>

      {/* 3. KHU VỰC LIVE PREVIEW BẢN IN A4 HOÀN THIỆN ĐỂ DUYỆT TRƯỚC KHI GỬI */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800 text-sm font-serif">
              Xem duyệt trước bản in A4 hoàn thiện (100% kích thước chuẩn 210mm x 297mm)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Thu phóng:</span>
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setZoomLevel(Math.max(60, zoomLevel - 10))}
                className="text-slate-600 hover:text-slate-900 px-1 cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="font-mono font-bold text-slate-800 hover:text-emerald-700 min-w-[45px] text-center cursor-pointer px-1 rounded hover:bg-white"
                title="Đặt về chuẩn 100% A4"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(Math.min(130, zoomLevel + 10))}
                className="text-slate-600 hover:text-slate-900 px-1 cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Khung chứa các trang A4 */}
        <div className="bg-slate-200/90 rounded-2xl p-4 sm:p-6 border border-slate-300 max-h-[850px] overflow-x-auto overflow-y-auto shadow-inner flex flex-col items-center">
          <div 
            className="transition-transform duration-200 origin-top w-[794px] min-w-[794px] max-w-[794px] space-y-6"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            <div dangerouslySetInnerHTML={{ __html: a4PreviewHtml }} />
          </div>
        </div>
      </div>

      {/* 4. FOOTER ĐIỀU HƯỚNG BƯỚC 5 */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Bước 4 (Chỉnh sửa văn bản)</span>
        </button>

        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-amber-700" />
            <span>Trang chủ (HOME)</span>
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Soạn thảo văn bản mới</span>
        </button>
      </div>

    </div>
  );
};
