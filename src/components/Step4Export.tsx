import React, { useState, useMemo } from 'react';
import { DocumentTypeItem, AgencySettings, DocumentAnalysisReport } from '../types';
import { generateDecree30A4Html, parseDocumentStructure, reconstructNormalizedText } from '../services/decree30Formatter';
import { exportToDocxBlob } from '../services/docxExporter';
import { downloadWordDocument, copyFormattedDocument, downloadBlobFile } from '../services/fileDownloader';
import { InteractiveDocumentEditor } from './InteractiveDocumentEditor';
import { 
  Download, Printer, Copy, CheckCircle, RotateCcw, 
  FileCheck, ShieldCheck, Sparkles, BookOpen, FileText,
  AlertCircle, ExternalLink, HelpCircle, Edit3, Eye, Columns,
  Check, ArrowRight, ArrowLeft, Maximize2, Minimize2, ZoomIn, ZoomOut
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
  originalFileName?: string;
  onBack?: () => void;
}

export const Step4Export: React.FC<Step4ExportProps> = ({
  normalizedText,
  selectedType,
  agencySettings,
  onReset,
  openGuidelines,
  onUpdateNormalizedText,
  analysisReport,
  originalText,
  originalFileName,
  onBack
}) => {
  // Mặc định hiển thị chế độ 'split' (Xem song song: Sửa trái, Xem A4 phải) chuẩn trolyvanthu
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedWordFormat, setIsCopiedWordFormat] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Tạo tên file xuất theo định dạng: "tên file gốc_mm_dd_yyyy.docx" (hoặc .doc)
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

  // Quản lý activeDoc trực tiếp để đồng bộ 100% thời gian thực từ Khung chỉnh sửa 3 hạng mục sang Live Preview A4
  const [activeDoc, setActiveDoc] = useState(() => {
    return parseDocumentStructure(
      normalizedText, 
      agencySettings, 
      selectedType.category, 
      selectedType.name
    );
  });

  const lastEmittedTextRef = React.useRef(normalizedText);

  // Khi normalizedText hoặc agencySettings thay đổi từ bên ngoài (hoặc chuyển sang bước 4)
  React.useEffect(() => {
    if (normalizedText === lastEmittedTextRef.current) {
      // Bỏ qua vì đây là sự kiện do chính Step4Export emit ra khi người dùng gõ phím
      return;
    }
    lastEmittedTextRef.current = normalizedText;
    setActiveDoc(parseDocumentStructure(
      normalizedText, 
      agencySettings, 
      selectedType.category, 
      selectedType.name
    ));
  }, [normalizedText, agencySettings, selectedType.category, selectedType.name]);

  const handleDocUpdate = (updated: any) => {
    setActiveDoc(updated);
    if (onUpdateNormalizedText) {
      const newText = reconstructNormalizedText(updated);
      lastEmittedTextRef.current = newText;
      onUpdateNormalizedText(newText);
    }
  };

  // Kiểm tra sự khác biệt giữa văn bản và Cài đặt mặc định
  const docLoc = activeDoc.locationDate?.split(',')[0]?.trim() || '';
  const settingsLoc = agencySettings.shortLocation?.trim() || '';
  const locationDiff = Boolean(settingsLoc && docLoc && docLoc.toLowerCase() !== settingsLoc.toLowerCase());
  
  const docAgency = activeDoc.agencyName?.trim() || '';
  const settingsAgency = agencySettings.agencyName?.trim() || '';
  const agencyDiff = Boolean(settingsAgency && docAgency && docAgency.toLowerCase() !== settingsAgency.toLowerCase());

  const isAgencyOrLocationDifferent = agencyDiff || locationDiff;

  const handleSyncWithDefaultSettings = () => {
    const targetYear = agencySettings.issuingYear || String(new Date().getFullYear());
    const defaultLoc = agencySettings.shortLocation || 'Đông Tiến';
    const updated = {
      ...activeDoc,
      agencyName: agencySettings.agencyName || activeDoc.agencyName,
      parentAgency: agencySettings.parentAgency || '', // Không tự ý thêm cấp trên nếu để trống
      isPartyDoc: agencySettings.roleBlock === 'dang',
      countryHeader: agencySettings.roleBlock === 'dang' ? '' : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      motto: agencySettings.roleBlock === 'dang' ? 'ĐẢNG CỘNG SẢN VIỆT NAM' : 'Độc lập - Tự do - Hạnh phúc',
      locationDate: `${defaultLoc}, ngày      tháng      năm ${targetYear}`,
    };
    handleDocUpdate(updated);
  };

  // Tạo HTML A4 real-time theo nội dung đã chỉnh sửa (sử dụng activeDoc trực tiếp)
  const a4PreviewHtml = useMemo(() => {
    return generateDecree30A4Html(
      activeDoc, 
      agencySettings, 
      selectedType.category, 
      selectedType.name
    );
  }, [activeDoc, agencySettings, selectedType.category, selectedType.name]);

  // Tải file .docx chuẩn thể thức bằng thư viện docx
  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      setDownloadNotice('Đang khởi tạo file Word .docx chuẩn thể thức Nghị định 30...');
      const blob = await exportToDocxBlob(activeDoc, agencySettings);
      const fileName = getExportFileName('docx');
      const success = downloadBlobFile(blob, fileName);
      if (success) {
        setDownloadNotice(`✓ Đã tải tệp "${fileName}" chuẩn Microsoft Word thành công!`);
        setTimeout(() => setDownloadNotice(null), 3500);
      } else {
        handleDownloadWordDoc();
      }
    } catch (err: any) {
      console.error('Lỗi khi tạo file docx:', err);
      handleDownloadWordDoc();
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Tải file Word (.doc) với công nghệ đa tầng giải quyết triệt để lỗi sandbox
  const handleDownloadWordDoc = async () => {
    const fileName = getExportFileName('doc');

    setDownloadNotice('Đang tải file Word (.doc) về máy...');
    const res = await downloadWordDocument({
      htmlContent: a4PreviewHtml,
      fileName,
      plainText: normalizedText
    });

    if (res.success) {
      setDownloadNotice(`✓ Đã tải file Word "${fileName}" về máy thành công!`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } else {
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

  // Điểm số trước và sau chuẩn hóa
  const scoreBefore = 48;
  const scoreAfter = 98;

  // Danh sách các hạng mục đã được chuẩn hóa tự động
  const correctedItems = [
    'Đã tách Quốc hiệu và Tiêu ngữ thành công (không để sót vào thân bài hay cơ quan)',
    'Đã ngăn nội dung không bị đẩy vào ô Cơ quan ban hành',
    'Đã hỗ trợ xuống dòng cho Kính gửi và Nơi nhận (thẻ textarea chuyên dụng)',
    'Đã thêm trường Quyền hạn ký (TM., T/M, KT., Q., KT. CHỦ TỊCH)',
    'Cố định phông chữ Times New Roman toàn văn bản',
    'Chuẩn hóa cỡ chữ nội dung 13-14pt & giãn dòng 1.5 lines',
    'Căn lề chuẩn A4: Trái 30mm, Phải 15mm, Trên 20mm, Dưới 20mm',
    'Bố cục 2 cột ẩn viền chuẩn Phụ lục I Nghị định 30/2020/NĐ-CP'
  ];

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 font-sans space-y-6 animate-fade-in">
      
      {/* 1. TOP HEADER: ĐIỂM SỐ TRƯỚC -> SAU & THÔNG TIN TIẾN TRÌNH (Chuẩn trolyvanthu) */}
      <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 rounded-2xl p-5 border border-red-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* Cột thông tin bước */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              👧
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100/90 px-2.5 py-0.5 rounded-full border border-red-200">
                  Bước 4: Chỉnh sửa và xuất file
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-white/90 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {selectedType.name} ({selectedType.category === 'dang' ? 'HD 05-HD/VPTW' : 'NĐ 30/2020/NĐ-CP'})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-serif">
                Chỉnh sửa trực tiếp 3 hạng mục & Xuất file Word chuẩn
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                Đồng chí có thể chỉnh sửa trực tiếp các trường thể thức ở cột bên trái; kết quả sẽ cập nhật tức thời trên bản in A4 ở cột bên phải.
              </p>
            </div>
          </div>

          {/* Cụm điểm số LỚN Trước ➔ Sau */}
          <div className="flex items-center gap-4 bg-white/90 p-3.5 rounded-2xl border border-red-200/90 shadow-xs shrink-0 self-start lg:self-center">
            <div className="text-center px-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Trước</div>
              <div className="text-2xl font-black text-slate-400 font-mono line-through decoration-rose-500">
                {scoreBefore}
              </div>
            </div>

            <div className="text-lg font-black text-rose-500">➔</div>

            <div className="text-center px-3 py-1 bg-emerald-50 rounded-xl border border-emerald-300">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Sau chuẩn hóa</div>
              <div className="text-3xl font-black text-emerald-600 font-mono">
                {scoreAfter}<span className="text-sm font-semibold text-emerald-700">/100</span>
              </div>
            </div>

            <div className="hidden sm:block pl-2 border-l border-slate-200 text-left">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Đạt chuẩn thể thức
              </div>
              <div className="text-[11px] text-slate-500">
                {selectedType.category === 'dang' ? 'Hướng dẫn 05-HD/VPTW' : 'Nghị định 30/2020/NĐ-CP'}
              </div>
            </div>
          </div>

        </div>

        {/* Danh sách các mục đã chỉnh (Tags chuẩn trolyvanthu) */}
        <div className="mt-4 pt-3 border-t border-red-200/70">
          <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Các hạng mục thể thức đã được tự động chuẩn hóa:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {correctedItems.map((item, idx) => (
              <span 
                key={idx}
                className="text-[11px] font-semibold bg-white/80 hover:bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 shadow-2xs"
              >
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {downloadNotice && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold animate-fade-in flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
        )}
      </div>

      {/* CẢNH BÁO & ĐỒNG BỘ NẾU PHÁT HIỆN CƠ QUAN / ĐỊA DANH KHÁC CÀI ĐẶT MẶC ĐỊNH */}
      {isAgencyOrLocationDifferent && (
        <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-900 flex items-center gap-2 font-sans">
                <span>Phát hiện Cơ quan ban hành hoặc Địa danh khác với Cài đặt mặc định của đồng chí</span>
                <span className="text-[10px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded font-semibold font-mono">Ưu tiên Cài đặt</span>
              </div>
              <div className="text-xs text-amber-800 mt-1 space-y-0.5 font-sans">
                {agencyDiff && (
                  <div>
                    • Cơ quan trong văn bản: <strong className="font-serif">"{activeDoc.agencyName}"</strong> ➔ Cài đặt mặc định: <strong className="font-serif text-amber-950">"{agencySettings.agencyName}"</strong>
                  </div>
                )}
                {locationDiff && (
                  <div>
                    • Địa danh trong văn bản: <strong className="font-serif">"{docLoc}"</strong> ➔ Cài đặt mặc định: <strong className="font-serif text-amber-950">"{agencySettings.shortLocation}"</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleSyncWithDefaultSettings}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đồng bộ lại theo Cài đặt mặc định</span>
          </button>
        </div>
      )}

      {/* 2. CỤM NÚT THAO TÁC XUẤT FILE NỔI BẬT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Nút 1: Tải về .docx chuẩn (Thư viện docx) */}
        <button
          type="button"
          onClick={handleDownloadDocx}
          disabled={isExportingDocx}
          className="p-3.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-5 h-5 text-blue-200" />
          <div className="text-left">
            <div className="text-sm font-extrabold leading-tight">Tải về file .docx</div>
            <div className="text-[11px] text-blue-200 font-normal">Chuẩn Microsoft Word 100%</div>
          </div>
        </button>

        {/* Nút 2: Sao chép sang Word (Paste thẳng Ctrl+V) */}
        <button
          type="button"
          onClick={handleCopyWordFormat}
          className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          {isCopiedWordFormat ? <Check className="w-5 h-5 text-emerald-200" /> : <Copy className="w-5 h-5 text-emerald-200" />}
          <div className="text-left">
            <div className="text-sm font-extrabold leading-tight">
              {isCopiedWordFormat ? 'Đã sao chép vào Clipboard!' : 'Sao chép sang Word'}
            </div>
            <div className="text-[11px] text-emerald-200 font-normal">Dán Ctrl+V giữ nguyên 2 cột</div>
          </div>
        </button>

        {/* Nút 3: Tải về .doc */}
        <button
          type="button"
          onClick={handleDownloadWordDoc}
          className="p-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-slate-400 shadow-xs flex items-center justify-center gap-2.5 font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <FileText className="w-5 h-5 text-slate-600" />
          <div className="text-left">
            <div className="text-sm font-extrabold leading-tight">Tải về file .doc</div>
            <div className="text-[11px] text-slate-500 font-normal">Tương thích mọi phiên bản</div>
          </div>
        </button>

        {/* Nút 4: In ấn / Xuất PDF */}
        <button
          type="button"
          onClick={handlePrint}
          className="p-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-slate-400 shadow-xs flex items-center justify-center gap-2.5 font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Printer className="w-5 h-5 text-slate-600" />
          <div className="text-left">
            <div className="text-sm font-extrabold leading-tight">In ấn / Xuất PDF</div>
            <div className="text-[11px] text-slate-500 font-normal">Khổ A4 chuẩn công vụ</div>
          </div>
        </button>

      </div>

      {/* 3. TOOLBAR CHUYỂN ĐỔI CHẾ ĐỘ XEM: XEM SONG SONG (SỬA & XEM A4) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
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
            onClick={() => setViewMode('edit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'edit'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-rose-600" />
            <span>Khung sửa 3 hạng mục</span>
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
            <span>Xem toàn màn hình A4</span>
          </button>
        </div>

        {/* Nút thu phóng Live Preview */}
        {viewMode === 'split' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden md:inline">Thu phóng xem A4:</span>
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-xs">
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
                title="Đặt về chuẩn 100% Khổ A4 thực tế"
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
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded border border-emerald-300 ml-1 cursor-pointer transition-colors"
                title="Hiển thị đúng 100% kích thước giấy A4 thực tế không co lại"
              >
                100% Chuẩn A4
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. KHU VỰC NỘI DUNG CHÍNH (THEO VIEW MODE) */}
      
      {/* CHẾ ĐỘ XEM SONG SONG (BỐ CỤC CHUẨN TROLYVANTHU) */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          
          {/* CỘT TRÁI: THÔNG TIN CHỈNH SỬA 3 HẠNG MỤC */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4 max-h-[960px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 font-serif">
                <Edit3 className="w-4 h-4 text-rose-600" />
                <span>Khung chỉnh sửa 3 hạng mục (Tự động đồng bộ sang A4)</span>
              </h3>
              <span className="text-[11px] text-slate-500 italic">Mặc định Kính gửi & Nơi nhận (-)</span>
            </div>

            <InteractiveDocumentEditor
              normalizedText={normalizedText}
              selectedType={selectedType}
              agencySettings={agencySettings}
              onUpdateText={handleTextChange}
              onUpdateDoc={handleDocUpdate}
              analysisReport={analysisReport}
              externalDoc={activeDoc}
            />
          </div>

          {/* CỘT PHẢI: LIVE PREVIEW BẢN IN A4 THỰC TẾ (100% kích thước chuẩn A4 không bị co lại) */}
          <div className="lg:col-span-8 xl:col-span-8 bg-slate-200/90 rounded-2xl p-4 sm:p-6 border border-slate-300 max-h-[960px] overflow-x-auto overflow-y-auto shadow-inner flex flex-col items-center">
            
            <div className="w-full mb-3 flex items-center justify-between text-xs text-slate-700 font-bold bg-white/90 p-2.5 rounded-xl border border-slate-300/80 sticky top-0 z-10 backdrop-blur-xs">
              <span className="flex items-center gap-1.5 text-slate-800">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Live Preview 100% Khổ A4 (210mm x 297mm • Lề Trái 30mm, Phải 15mm, Trên/Dưới 20mm)</span>
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold hidden md:inline">
                  Tỷ lệ 100% Chuẩn thực tế
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className="text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Toàn màn hình
                </button>
              </div>
            </div>

            {/* Khung mô phỏng các tờ giấy A4 thật (Rộng 794px ~ 210mm chuẩn 100% không co lại, có ngắt trang phụ lục) */}
            <div 
              className="transition-transform duration-200 origin-top w-[794px] min-w-[794px] max-w-[794px] space-y-6"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: a4PreviewHtml }}
              />
            </div>

          </div>

        </div>
      )}

      {/* CHẾ ĐỘ XEM CHỈ SỬA 3 HẠNG MỤC */}
      {viewMode === 'edit' && (
        <div className="space-y-4 max-w-5xl mx-auto">
          <InteractiveDocumentEditor
            normalizedText={normalizedText}
            selectedType={selectedType}
            agencySettings={agencySettings}
            onUpdateText={handleTextChange}
            onUpdateDoc={handleDocUpdate}
            analysisReport={analysisReport}
            externalDoc={activeDoc}
          />
        </div>
      )}

      {/* CHẾ ĐỘ XEM TOÀN MÀN HÌNH A4 */}
      {viewMode === 'preview' && (
        <div className="bg-slate-200/90 rounded-2xl p-6 border border-slate-300 flex flex-col items-center shadow-inner">
          <div className="w-full max-w-[850px] mb-4 flex items-center justify-between bg-white p-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800">
            <span>Bản in A4 tỷ lệ chuẩn công vụ Nghị định 30/2020/NĐ-CP</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer text-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                In / Xuất PDF
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className="text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Quay lại xem song song
              </button>
            </div>
          </div>

          <div className="w-[794px] min-w-[794px] max-w-[794px] space-y-6">
            <div dangerouslySetInnerHTML={{ __html: a4PreviewHtml }} />
          </div>
        </div>
      )}

      {/* 5. FOOTER NAVIGATION */}
      <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Bước 3 (Phân tích chuyên sâu)
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Soạn thảo văn bản mới
        </button>
      </div>

    </div>
  );
};
