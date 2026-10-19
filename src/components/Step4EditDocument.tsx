import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DocumentTypeItem, AgencySettings, DocumentAnalysisReport, SpellingProposal } from '../types';
import { 
  generateDecree30A4Html, 
  parseDocumentStructure, 
  reconstructNormalizedText,
  StructuredDoc,
  validateMandatoryDocumentElements,
  autoFillMissingMandatoryElements,
  MandatoryValidationStatus 
} from '../services/decree30Formatter';
import { detectAllDocumentProposals, fixSingleSpellingMatch } from '../utils/vietnameseSpellingChecker';
import { InteractiveDocumentEditor } from './InteractiveDocumentEditor';
import { 
  Eye, Columns, ArrowRight, ArrowLeft, Maximize2, 
  ZoomIn, ZoomOut, Home, Edit3, Sparkles, BookOpen, 
  CheckCircle2, AlertTriangle, FileCheck, ShieldAlert, Check, X, AlertCircle,
  Wand2, ChevronDown, ChevronUp
} from 'lucide-react';

interface Step4EditDocumentProps {
  normalizedText: string;
  initialStructuredDoc?: StructuredDoc | null;
  onUpdateStructuredDoc?: (doc: StructuredDoc) => void;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  analysisReport?: DocumentAnalysisReport;
  originalText?: string;
  originalFileName?: string;
  onNext: () => void;
  onBack: () => void;
  onGoHome: () => void;
  onUpdateNormalizedText?: (text: string) => void;
  openGuidelines?: () => void;
}

export const Step4EditDocument: React.FC<Step4EditDocumentProps> = ({
  normalizedText,
  initialStructuredDoc,
  onUpdateStructuredDoc,
  selectedType,
  agencySettings,
  analysisReport,
  originalFileName,
  onNext,
  onBack,
  onGoHome,
  onUpdateNormalizedText,
  openGuidelines
}) => {
  // Mặc định chế độ 'split' (Xem song song: Sửa trái, Xem A4 phải) chuẩn trolyvanthu.isavn.edu.vn
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [showMissingModal, setShowMissingModal] = useState(false);

  // Quản lý activeDoc trực tiếp để đồng bộ 100% thời gian thực từ Khung chỉnh sửa sang Live Preview A4
  const [activeDoc, setActiveDoc] = useState<StructuredDoc>(() => {
    if (initialStructuredDoc) {
      return initialStructuredDoc;
    }
    return parseDocumentStructure(
      normalizedText, 
      agencySettings, 
      selectedType.category, 
      selectedType.name
    );
  });

  const lastEmittedTextRef = useRef(normalizedText);

  // Khi normalizedText thay đổi từ bên ngoài
  useEffect(() => {
    if (normalizedText === lastEmittedTextRef.current) {
      return;
    }
    lastEmittedTextRef.current = normalizedText;
    const parsed = parseDocumentStructure(
      normalizedText, 
      agencySettings, 
      selectedType.category, 
      selectedType.name
    );
    if (activeDoc.agencyName && (!parsed.agencyName || parsed.agencyName === agencySettings.agencyName)) {
      parsed.agencyName = activeDoc.agencyName;
    }
    if (activeDoc.parentAgency) {
      parsed.parentAgency = activeDoc.parentAgency;
    }
    setActiveDoc(parsed);
    if (onUpdateStructuredDoc) {
      onUpdateStructuredDoc(parsed);
    }
  }, [normalizedText, agencySettings, selectedType.category, selectedType.name]);

  // Đồng bộ lập tức sang Live Preview A4 khi người dùng chỉnh sửa ở khung bên trái
  const handleDocUpdate = (updated: StructuredDoc) => {
    setActiveDoc(updated);
    if (onUpdateStructuredDoc) {
      onUpdateStructuredDoc(updated);
    }
    if (onUpdateNormalizedText) {
      const newText = reconstructNormalizedText(updated);
      lastEmittedTextRef.current = newText;
      onUpdateNormalizedText(newText);
    }
  };

  const handleTextChange = (newText: string) => {
    if (onUpdateNormalizedText) {
      lastEmittedTextRef.current = newText;
      onUpdateNormalizedText(newText);
    }
    const parsed = parseDocumentStructure(
      newText, 
      agencySettings, 
      selectedType.category, 
      selectedType.name
    );
    if (activeDoc.agencyName && (!parsed.agencyName || parsed.agencyName === agencySettings.agencyName)) {
      parsed.agencyName = activeDoc.agencyName;
    }
    if (activeDoc.parentAgency) {
      parsed.parentAgency = activeDoc.parentAgency;
    }
    setActiveDoc(parsed);
    if (onUpdateStructuredDoc) {
      onUpdateStructuredDoc(parsed);
    }
  };

  // Kiểm tra tính đầy đủ của các thành phần thể thức bắt buộc theo Nghị định 30
  const validation: MandatoryValidationStatus = useMemo(() => {
    return validateMandatoryDocumentElements(activeDoc, agencySettings);
  }, [activeDoc, agencySettings]);

  // Ngăn chặn chuyển sang Bước 5 nếu chưa đủ các thành phần bắt buộc
  const handleAttemptProceedToStep5 = () => {
    if (!validation.isValid) {
      setShowMissingModal(true);
      return;
    }
    onNext();
  };

  // Tự động bổ sung các thành phần còn thiếu
  const handleAutoFillMissingElements = (proceedImmediately: boolean = false) => {
    const filledDoc = autoFillMissingMandatoryElements(activeDoc, agencySettings, selectedType.name);
    handleDocUpdate(filledDoc);
    setShowMissingModal(false);
    setSyncNotice('✓ Đã tự động bổ sung đầy đủ các thành phần thể thức bắt buộc theo Cài đặt & Mẫu chuẩn NĐ 30!');
    setTimeout(() => setSyncNotice(null), 3500);
    if (proceedImmediately) {
      onNext();
    }
  };

  // Cảnh báo sai lệch tên cơ quan hoặc địa danh so với Cài đặt
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
      parentAgency: agencySettings.parentAgency || '',
      isPartyDoc: agencySettings.roleBlock === 'dang',
      countryHeader: agencySettings.roleBlock === 'dang' ? '' : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      motto: agencySettings.roleBlock === 'dang' ? 'ĐẢNG CỘNG SẢN VIỆT NAM' : 'Độc lập - Tự do - Hạnh phúc',
      locationDate: `${defaultLoc}, ngày      tháng      năm ${targetYear}`,
    };
    handleDocUpdate(updated);
    setSyncNotice(`✓ Đã đồng bộ cơ quan: "${agencySettings.agencyName}" và địa danh: "${defaultLoc}" theo Cài đặt mặc định!`);
    setTimeout(() => setSyncNotice(null), 3500);
  };

  // Quản lý đề xuất sửa lỗi chính tả & đoạn không logic (NGUYÊN TẮC: TUYỆT ĐỐI KHÔNG TỰ ĐỘNG SỬA NỘI DUNG GỐC)
  const [dismissedProposalIds, setDismissedProposalIds] = useState<Set<string>>(new Set());
  const [selectedProposal, setSelectedProposal] = useState<SpellingProposal | null>(null);
  const [showProposalsPanel, setShowProposalsPanel] = useState<boolean>(true);

  // Phát hiện danh sách đề xuất sửa lỗi từ nội dung văn bản hiện tại
  const allProposals = useMemo(() => {
    return detectAllDocumentProposals(normalizedText, activeDoc.illogicalFindings);
  }, [normalizedText, activeDoc.illogicalFindings]);

  // Các đề xuất còn đang chờ người dùng quyết định (chưa bấm Bỏ qua và còn tồn tại trong text)
  const pendingProposals = useMemo(() => {
    return allProposals.filter(p => !dismissedProposalIds.has(p.id) && normalizedText.includes(p.wrong));
  }, [allProposals, dismissedProposalIds, normalizedText]);

  // Đồng ý sửa 1 lỗi cụ thể
  const handleAcceptProposal = (proposal: SpellingProposal) => {
    const newText = fixSingleSpellingMatch(normalizedText, proposal.wrong, proposal.right);
    handleTextChange(newText);
    setSelectedProposal(null);
    setSyncNotice(proposal.right ? `✓ Đã sửa "${proposal.wrong}" ➔ "${proposal.right}" thành công!` : `✓ Đã xóa bỏ đoạn thừa "${proposal.wrong}" khỏi văn bản!`);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  // Bỏ qua 1 lỗi cụ thể -> Giữ nguyên 100% nội dung gốc, bỏ vệt bôi vàng
  const handleDismissProposal = (proposal: SpellingProposal) => {
    setDismissedProposalIds(prev => new Set([...prev, proposal.id]));
    setSelectedProposal(null);
    setSyncNotice(`Đã giữ nguyên "${proposal.wrong}" theo văn bản gốc.`);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  // Đồng ý sửa tất cả các lỗi đang được phát hiện
  const handleAcceptAllProposals = () => {
    if (pendingProposals.length === 0) return;
    let updatedText = normalizedText;
    let count = 0;
    for (const p of pendingProposals) {
      if (updatedText.includes(p.wrong)) {
        updatedText = fixSingleSpellingMatch(updatedText, p.wrong, p.right);
        count++;
      }
    }
    handleTextChange(updatedText);
    setSelectedProposal(null);
    setSyncNotice(`✓ Đã đồng ý sửa toàn bộ ${count} lỗi chính tả & văn phong theo chuẩn!`);
    setTimeout(() => setSyncNotice(null), 3500);
  };

  // Bỏ qua tất cả các lỗi -> Giữ nguyên 100% toàn bộ văn bản gốc, xóa toàn bộ bôi vàng
  const handleDismissAllProposals = () => {
    if (pendingProposals.length === 0) return;
    const allIds = pendingProposals.map(p => p.id);
    setDismissedProposalIds(prev => new Set([...prev, ...allIds]));
    setSelectedProposal(null);
    setSyncNotice(`Đã bỏ qua tất cả đề xuất, bảo toàn 100% nội dung văn bản gốc.`);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  // Bắt sự kiện click vào từ bôi vàng trên Live Preview A4 để mở hộp thoại Đồng ý / Bỏ qua
  const handleLivePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const mark = (e.target as HTMLElement).closest('.decree30-spelling-highlight');
    if (mark) {
      const propId = mark.getAttribute('data-proposal-id');
      const wrong = decodeURIComponent(mark.getAttribute('data-proposal-wrong') || '');
      const right = decodeURIComponent(mark.getAttribute('data-proposal-right') || '');
      const reason = decodeURIComponent(mark.getAttribute('data-proposal-reason') || '');

      const found = pendingProposals.find(p => p.id === propId || p.wrong === wrong) || {
        id: propId || `sp_${Date.now()}`,
        wrong: wrong || (mark.textContent || ''),
        right: right || (mark.textContent || ''),
        reason: reason || 'Lỗi chính tả / không logic',
        category: 'chinh_ta',
        snippet: wrong || (mark.textContent || ''),
        index: 0
      };
      setSelectedProposal(found);
    }
  };

  // Tạo HTML Live Preview A4 chuẩn thời gian thực từ activeDoc và tự động bôi vàng các lỗi chờ duyệt
  const a4PreviewHtml = useMemo(() => {
    return generateDecree30A4Html(
      activeDoc, 
      agencySettings, 
      selectedType.category, 
      selectedType.name,
      pendingProposals
    );
  }, [activeDoc, agencySettings, selectedType.category, selectedType.name, pendingProposals]);

  return (
    <div className="space-y-5 font-sans">
      
      {/* 1. THANH TIÊU ĐỀ BƯỚC 4 & ĐIỀU HƯỚNG NHANH */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black shadow-xs text-lg">
            4
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                Bước 4: Chỉnh sửa văn bản (Toàn bộ chỉnh sửa thực hiện tại đây)
              </h2>
              <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                Sửa song song & Xem A4
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Chỉnh sửa đồng bộ 4 phần thể thức: Đầu văn bản • Nội dung • Cuối văn bản • Phụ lục ngắt trang A4. Sửa bên trái lập tức cập nhật Live Preview bên phải.
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

          {openGuidelines && (
            <button
              type="button"
              onClick={openGuidelines}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-600" />
              <span>Cẩm nang NĐ 30</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAttemptProceedToStep5}
            className={`font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-2 ${
              validation.isValid
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white ring-emerald-400/40'
                : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-800 text-white ring-rose-400/40'
            }`}
            title={validation.isValid ? 'Chuyển sang Bước 5 để tải file Word và hoàn tất' : `Còn thiếu ${validation.missingCount} mục bắt buộc - Bấm để xem và bổ sung`}
          >
            <span>
              {validation.isValid 
                ? 'Tiếp tục sang Bước 5: Xuất file cuối cùng' 
                : `⚠️ Thiếu ${validation.missingCount} mục bắt buộc (Bổ sung để xuất file)`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* THANH KIỂM SOÁT THỂ THỨC BẮT BUỘC (NĐ 30/2020/NĐ-CP) */}
      <div className={`p-4 rounded-2xl border transition-all ${
        validation.isValid 
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs' 
          : 'bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-rose-300 text-rose-950 shadow-xs'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            {validation.isValid ? (
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5 sm:mt-0">
                ✓
              </span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5 sm:mt-0 animate-pulse">
                !
              </span>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm">
                  {validation.isValid ? (
                    'Văn bản đạt 100% chuẩn thể thức bắt buộc (Đủ điều kiện xuất file Bước 5)'
                  ) : (
                    `Văn bản còn thiếu ${validation.missingCount} thành phần thể thức bắt buộc cần bổ sung`
                  )}
                </h4>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  validation.isValid ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-950'
                }`}>
                  {validation.totalCount - validation.missingCount}/{validation.totalCount} Thành phần
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {validation.isValid 
                  ? 'Đầu văn bản (Quốc hiệu, Tiêu ngữ, Cơ quan, Số hiệu, Tiêu đề), Thân văn bản và Cuối văn bản (Nơi nhận, Chữ ký) đều đầy đủ.' 
                  : 'Quy định Nghị định 30: Không thể xuất file cuối cùng nếu chưa có đầy đủ thông tin Đầu văn bản, Nội dung và Cuối văn bản.'}
              </p>
              {!validation.isValid && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {validation.missingItems.map(it => (
                    <span 
                      key={it.id} 
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                    >
                      <span className="text-rose-600">✗</span> {it.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!validation.isValid && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowMissingModal(true)}
                className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-800 font-bold text-xs rounded-xl border border-rose-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>Xem chi tiết thiếu</span>
              </button>
              <button
                type="button"
                onClick={() => handleAutoFillMissingElements(false)}
                className="px-3.5 py-2 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                <span>Tự động bổ sung thông tin còn thiếu</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thông báo đồng bộ */}
      {syncNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* 2. CẢNH BÁO SAI LỆCH CƠ QUAN / ĐỊA DANH SO VỚI CÀI ĐẶT */}
      {isAgencyOrLocationDifferent && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in font-sans">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-amber-950">
                Tiểu Bảo Bối lưu ý: Phát hiện dữ liệu trong văn bản khác với Cài đặt mặc định của cơ quan
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {agencyDiff && (
                  <span>
                    • Cơ quan văn bản: <strong>"{docAgency}"</strong> ≠ Cài đặt: <strong>"{settingsAgency}"</strong>.{' '}
                  </span>
                )}
                {locationDiff && (
                  <span>
                    • Địa danh văn bản: <strong>"{docLoc}"</strong> ≠ Cài đặt: <strong>"{settingsLoc}"</strong>.
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncWithDefaultSettings}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Đồng bộ theo Cài đặt mặc định</span>
          </button>
        </div>
      )}

      {/* 2.5. BẢNG SOÁT LỖI CHÍNH TẢ & ĐOẠN KHÔNG LOGIC (ĐỀ XUẤT CHỈNH SỬA) */}
      <div className={`p-4 md:p-5 rounded-2xl border transition-all ${
        pendingProposals.length > 0 
          ? 'bg-gradient-to-r from-amber-50/90 via-yellow-50/80 to-amber-50/90 border-2 border-amber-400 text-amber-950 shadow-sm' 
          : 'bg-emerald-50/90 border border-emerald-300 text-emerald-950 shadow-xs'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
              pendingProposals.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-emerald-600 text-white'
            }`}>
              {pendingProposals.length > 0 ? <Wand2 className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base font-serif">
                  {pendingProposals.length > 0 
                    ? `Phát hiện ${pendingProposals.length} đề xuất sửa lỗi chính tả & đoạn không logic` 
                    : '✓ Không có lỗi chính tả hoặc đoạn không logic nào chưa xử lý'}
                </h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  pendingProposals.length > 0 ? 'bg-amber-200 text-amber-900 border border-amber-300' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {pendingProposals.length > 0 ? `${pendingProposals.length} vị trí đã bôi vàng` : 'Văn bản chuẩn mực'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-4xl">
                {pendingProposals.length > 0
                  ? 'Quy tắc vàng: Hệ thống tuyệt đối KHÔNG tự động sửa nội dung gốc (đặc biệt là phần Kính gửi và nội dung chính). Tất cả lỗi được bôi vàng trực quan trên Khung chỉnh sửa và Live Preview A4. Đồng chí bấm [Đồng ý sửa] để áp dụng hoặc [Bỏ qua] để giữ nguyên văn bản gốc.'
                  : 'Nội dung văn bản sạch lỗi chính tả và các cặp từ nhầm lẫn thông dụng theo đúng Nghị định 30/2020/NĐ-CP.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pendingProposals.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleAcceptAllProposals}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  title="Đồng ý sửa tất cả các lỗi chính tả và đoạn không logic đang phát hiện"
                >
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Đồng ý sửa tất cả ({pendingProposals.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismissAllProposals}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Bỏ qua tất cả các đề xuất, bảo toàn nguyên vẹn 100% nội dung gốc"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>Bỏ qua tất cả</span>
                </button>
              </>
            )}

            {pendingProposals.length > 0 && (
              <button
                type="button"
                onClick={() => setShowProposalsPanel(!showProposalsPanel)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200 cursor-pointer transition-colors"
                title={showProposalsPanel ? 'Thu gọn danh sách đề xuất' : 'Mở rộng danh sách đề xuất'}
              >
                {showProposalsPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Danh sách chi tiết các đề xuất */}
        {showProposalsPanel && pendingProposals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-300/80 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingProposals.map((p) => (
                <div
                  key={p.id}
                  className="bg-white/95 rounded-xl p-3 border border-amber-300/90 shadow-2xs flex flex-col justify-between gap-2.5 transition-all hover:border-amber-500 hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.category === 'nham_tu' ? 'bg-orange-100 text-orange-800' :
                        p.category === 'logic' ? 'bg-rose-100 text-rose-800' :
                        p.category === 'lap_tu' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {p.category === 'nham_tu' ? 'Viết nhầm từ' :
                         p.category === 'logic' ? 'Đoạn không logic' :
                         p.category === 'lap_tu' ? 'Lặp từ bất thường' :
                         'Lỗi chính tả'}
                      </span>
                      <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                        {p.reason}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-500 text-[11px] shrink-0">Đoạn lỗi:</span>
                        <mark className="bg-yellow-200 text-yellow-950 font-bold px-1.5 py-0.5 rounded border border-yellow-400 font-serif line-through decoration-rose-500">
                          {p.wrong}
                        </mark>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-500 text-[11px] shrink-0">Đề xuất:</span>
                        <strong className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300 font-serif">
                          {p.right}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleAcceptProposal(p)}
                      className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title={`Đồng ý sửa "${p.wrong}" thành "${p.right}"`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Đồng ý sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDismissProposal(p)}
                      className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 cursor-pointer transition-colors"
                      title={`Bỏ qua, giữ nguyên "${p.wrong}"`}
                    >
                      <span>Bỏ qua</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL POPOVER KHI NGƯỜI DÙNG CLICK VÀO TỪ BÔI VÀNG TRÊN LIVE PREVIEW HOẶC EDITOR */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full border-2 border-amber-400 shadow-2xl p-5 space-y-4 animate-scale-up">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm sm:text-base font-serif">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs">
                  <Wand2 className="w-4 h-4" />
                </div>
                <span>Đề xuất sửa lỗi chính tả / đoạn không logic</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2">
              <p className="font-semibold text-amber-900">💡 Lý do nhận diện: {selectedProposal.reason}</p>
              <div className="space-y-1.5 pt-1">
                <div>
                  <span className="text-slate-600">Đoạn bị lỗi (đã bôi vàng): </span>
                  <mark className="bg-yellow-200 text-yellow-950 font-bold px-2 py-0.5 rounded border border-yellow-400 font-serif">
                    {selectedProposal.wrong}
                  </mark>
                </div>
                <div>
                  <span className="text-slate-600">Đề xuất cách viết đúng: </span>
                  <strong className="text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 font-serif text-sm">
                    {selectedProposal.right}
                  </strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Nội dung gốc chỉ được thay đổi khi bạn bấm [Đồng ý sửa]. Nếu bấm [Bỏ qua], nội dung gốc được giữ nguyên 100% và màu bôi vàng sẽ biến mất.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDismissProposal(selectedProposal)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer transition-colors"
              >
                Bỏ qua (Giữ nguyên)
              </button>
              <button
                type="button"
                onClick={() => handleAcceptProposal(selectedProposal)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Đồng ý sửa ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM & THU PHÓNG LIVE PREVIEW */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-rose-600" />
            <span>Xem song song (Sửa & Xem A4)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'edit'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Chỉ mở Khung chỉnh sửa</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Toàn màn hình A4</span>
          </button>
        </div>

        {/* Thu phóng Live Preview khi ở chế độ Split */}
        {viewMode === 'split' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden md:inline">Thu phóng Live Preview A4:</span>
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
                title="Chuẩn tỷ lệ 100% A4 thực tế"
              >
                100% Chuẩn A4
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. KHU VỰC NỘI DUNG CHÍNH (THEO VIEW MODE) */}

      {/* 4.1. CHẾ ĐỘ XEM SONG SONG (BỐ CỤC CHUẨN TROLYVANTHU.ISAVN.EDU.VN) */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          
          {/* CỘT TRÁI: KHUNG CHỈNH SỬA ĐỒNG BỘ 4 PHẦN THỂ THỨC */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4 max-h-[960px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 font-serif">
                <Edit3 className="w-4 h-4 text-rose-600" />
                <span>Khung chỉnh sửa 4 phần (Tự động đồng bộ Live A4)</span>
              </h3>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                ✓ Đồng bộ tức thì
              </span>
            </div>

            <InteractiveDocumentEditor
              normalizedText={normalizedText}
              selectedType={selectedType}
              agencySettings={agencySettings}
              onUpdateText={handleTextChange}
              onUpdateDoc={handleDocUpdate}
              analysisReport={analysisReport}
              externalDoc={activeDoc}
              onGoHome={onGoHome}
              activeProposals={pendingProposals}
              onAcceptProposal={handleAcceptProposal}
              onDismissProposal={handleDismissProposal}
              onAcceptAllProposals={handleAcceptAllProposals}
              onDismissAllProposals={handleDismissAllProposals}
            />
          </div>

          {/* CỘT PHẢI: LIVE PREVIEW BẢN IN A4 THỰC TẾ (100% KÍCH THƯỚC CHUẨN A4 210MM X 297MM) */}
          <div className="lg:col-span-7 xl:col-span-7 bg-slate-200/90 rounded-2xl p-4 sm:p-6 border border-slate-300 max-h-[960px] overflow-x-auto overflow-y-auto shadow-inner flex flex-col items-center">
            <div className="w-full mb-3 flex items-center justify-between text-xs text-slate-700 font-bold bg-white/90 p-2.5 rounded-xl border border-slate-300/80 sticky top-0 z-10 backdrop-blur-xs">
              <span className="flex items-center gap-1.5 text-slate-800">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Live Preview 100% Khổ A4 (Lề Trái 30mm, Phải 15mm, Trên/Dưới 20mm)</span>
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

            {/* THÔNG BÁO BẢO TOÀN BẢNG BIỂU & Ô GỘP */}
            {activeDoc.tableStats && activeDoc.tableStats.tableCount > 0 && (
              <div className="w-full mb-3 bg-emerald-50 border border-emerald-300 text-emerald-900 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
                <span className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <span>Đã bảo toàn nguyên vẹn 100% <strong>{activeDoc.tableStats.tableCount} bảng biểu</strong> (trong đó có <strong>{activeDoc.tableStats.mergedCellCount} ô gộp</strong> colSpan/rowSpan)</span>
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Giữ 100% cấu trúc
                </span>
              </div>
            )}

            {/* Giấy A4 thật (Rộng 794px ~ 210mm chuẩn 100%, có ngắt trang phụ lục độc lập) */}
            <div 
              className="transition-transform duration-200 origin-top w-[794px] min-w-[794px] max-w-[794px] space-y-6"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              <div onClick={handleLivePreviewClick} dangerouslySetInnerHTML={{ __html: a4PreviewHtml }} />
            </div>
          </div>

        </div>
      )}

      {/* 4.2. CHẾ ĐỘ CHỈ CHỈNH SỬA */}
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
            onGoHome={onGoHome}
            activeProposals={pendingProposals}
            onAcceptProposal={handleAcceptProposal}
            onDismissProposal={handleDismissProposal}
            onAcceptAllProposals={handleAcceptAllProposals}
            onDismissAllProposals={handleDismissAllProposals}
          />
        </div>
      )}

      {/* 4.3. CHẾ ĐỘ XEM TOÀN MÀN HÌNH A4 */}
      {viewMode === 'preview' && (
        <div className="bg-slate-200/90 rounded-2xl p-6 border border-slate-300 flex flex-col items-center shadow-inner">
          <div className="w-full max-w-[850px] mb-4 flex items-center justify-between bg-white p-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800">
            <span>Bản in A4 tỷ lệ chuẩn Nghị định 30/2020/NĐ-CP</span>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className="text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              Quay lại xem song song
            </button>
          </div>

          <div className="w-[794px] min-w-[794px] max-w-[794px] space-y-6">
            <div onClick={handleLivePreviewClick} dangerouslySetInnerHTML={{ __html: a4PreviewHtml }} />
          </div>
        </div>
      )}

      {/* 5. FOOTER NAVIGATION BƯỚC 4 */}
      <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Bước 3 (Nhận dạng thể thức)</span>
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
          onClick={handleAttemptProceedToStep5}
          className={`w-full sm:w-auto font-bold text-xs sm:text-sm px-7 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
            validation.isValid
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white'
              : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-800 text-white ring-2 ring-rose-400/50'
          }`}
          title={validation.isValid ? 'Tiến hành sang Bước 5 để xuất file' : `Còn thiếu ${validation.missingCount} mục bắt buộc - Bấm để xem và bổ sung`}
        >
          <span>
            {validation.isValid 
              ? 'Tiến hành Xuất file cuối cùng (Bước 5)' 
              : `⚠️ Thiếu ${validation.missingCount} mục bắt buộc (Bổ sung để sang Bước 5)`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* MODAL CẢNH BÁO BẮT BUỘC: CHƯA ĐỦ ĐIỀU KIỆN XUẤT FILE BƯỚC 5 */}
      {showMissingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl border border-rose-200 space-y-5 animate-scale-in">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                    Yêu cầu thể thức bắt buộc
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMissingModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1.5 font-serif">
                  Chưa đủ điều kiện xuất file: Còn thiếu {validation.missingCount} thành phần bắt buộc!
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Theo Nghị định 30/2020/NĐ-CP, văn bản hành chính không thể hoàn tất hoặc ban hành nếu chưa có đầy đủ thông tin ở các phần bắt buộc dưới đây:
                </p>
              </div>
            </div>

            {/* Danh sách các thành phần còn thiếu */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {validation.missingItems.map(item => (
                <div 
                  key={item.id}
                  className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-950"
                >
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ✗
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900">{item.name}</span>
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {item.sectionLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Các nút hành động xử lý */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowMissingModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng & Tự chỉnh sửa
              </button>

              <button
                type="button"
                onClick={() => handleAutoFillMissingElements(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Tự điền & Xem lại</span>
              </button>

              <button
                type="button"
                onClick={() => handleAutoFillMissingElements(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Bổ sung nhanh & Sang Bước 5</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

