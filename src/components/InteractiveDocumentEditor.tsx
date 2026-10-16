import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DocumentTypeItem, AgencySettings, DocumentAnalysisReport, IllogicalSegment, DocumentAppendix, SpellingProposal } from '../types';
import { 
  parseDocumentStructure, 
  reconstructNormalizedText, 
  formatBulletLines, 
  boldBulletHeadings,
  unboldBulletHeadings,
  cleanAndDeduplicateRecipients,
  StructuredDoc 
} from '../services/decree30Formatter';
import { cleanAIText, formatHtmlTableToFitA4 } from '../utils/cleanAIText';
import { AGENCY_PRESETS } from '../utils/agencyPresets';
import { 
  checkVietnameseSpelling, 
  autoFixVietnameseSpelling, 
  fixSingleSpellingMatch, 
  getSpellingHighlightPatterns,
  detectAllDocumentProposals,
  createVnWordRegex,
  escapeRegex, 
  SpellingErrorMatch 
} from '../utils/vietnameseSpellingChecker';
import { 
  Building2, FileText, CheckCircle2, AlertTriangle, Sparkles, 
  HelpCircle, UserCheck, ChevronDown, ChevronUp, Edit3, Wand2,
  Check, X, Eye, Undo2, ArrowRight, Building, Bold, ListOrdered,
  Table as TableIcon, AlignCenter, Plus, Home, Trash2, Paperclip, FilePlus
} from 'lucide-react';

interface InteractiveDocumentEditorProps {
  normalizedText: string;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  onUpdateText: (text: string) => void;
  onUpdateDoc?: (doc: StructuredDoc) => void;
  analysisReport?: DocumentAnalysisReport;
  externalDoc?: StructuredDoc;
  onGoHome?: () => void;
  activeProposals?: SpellingProposal[];
  onAcceptProposal?: (proposal: SpellingProposal) => void;
  onDismissProposal?: (proposal: SpellingProposal) => void;
  onAcceptAllProposals?: () => void;
  onDismissAllProposals?: () => void;
}

export const InteractiveDocumentEditor: React.FC<InteractiveDocumentEditorProps> = ({
  normalizedText,
  selectedType,
  agencySettings,
  onUpdateText,
  onUpdateDoc,
  analysisReport,
  externalDoc,
  onGoHome,
  activeProposals,
  onAcceptProposal,
  onDismissProposal,
  onAcceptAllProposals,
  onDismissAllProposals
}) => {
  // Parse document into 3 structured sections
  const [doc, setDoc] = useState<StructuredDoc>(() => 
    externalDoc || parseDocumentStructure(normalizedText, agencySettings, selectedType.category, selectedType.name)
  );

  // Multiline string states cho Kính gửi và Nơi nhận (mặc định có dấu - ở đầu dòng)
  const [kinhGuiText, setKinhGuiText] = useState(() => {
    const raw = externalDoc?.recipientsHeader ?? doc.recipientsHeader ?? '';
    return raw ? formatBulletLines(raw).join('\n') : '';
  });
  const [noiNhanText, setNoiNhanText] = useState(() => {
    const raw = externalDoc?.recipients ?? doc.recipients ?? [];
    return formatBulletLines(raw).join('\n');
  });

  const isInternalUpdateRef = useRef(false);

  // Sync with externalDoc if provided from parent Step4Export
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    if (externalDoc) {
      setDoc(externalDoc);
      setKinhGuiText(externalDoc.recipientsHeader ? formatBulletLines(externalDoc.recipientsHeader).join('\n') : '');
      setNoiNhanText(formatBulletLines(externalDoc.recipients || []).join('\n'));
    }
  }, [externalDoc]);

  // Sync internal state if normalizedText changes externally
  useEffect(() => {
    if (externalDoc) return; // Nếu có externalDoc thì ưu tiên đồng bộ theo externalDoc
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const parsed = parseDocumentStructure(normalizedText, agencySettings, selectedType.category, selectedType.name);
    setDoc(parsed);
    setKinhGuiText(parsed.recipientsHeader ? formatBulletLines(parsed.recipientsHeader).join('\n') : '');
    setNoiNhanText(formatBulletLines(parsed.recipients || []).join('\n'));
  }, [normalizedText, agencySettings, selectedType.category, selectedType.name, externalDoc]);

  // Section toggle state (accordions)
  const [openSection1, setOpenSection1] = useState(true); // Đầu văn bản
  const [openSection2, setOpenSection2] = useState(true); // Nội dung văn bản
  const [openSection3, setOpenSection3] = useState(true); // Nơi nhận & Chữ ký
  const [openSection4, setOpenSection4] = useState(true); // Phụ lục văn bản (sau Nơi nhận & Chữ ký)

  // Tự động chèn bảng biểu chuẩn Nghị định 30 vào thân văn bản
  const handleInsertStandardTable = () => {
    const tableTemplate = `\n\n| STT | Nhiệm vụ / Nội dung công việc | Đơn vị chủ trì / thực hiện | Thời gian hoàn thành | Ghi chú |\n|:---:|:---|:---|:---:|:---|\n| 1 | Rà soát và hoàn thiện hồ sơ văn bản theo NĐ 30 | Văn phòng / Bộ phận chuyên môn | Quý IV/2026 | Theo kế hoạch |\n| 2 | Tổng hợp số liệu và báo cáo kết quả thực hiện | Đơn vị trực thuộc | Trước ngày 15/12/2026 | Báo cáo chính thức |\n\n`;
    const newText = (normalizedText + tableTemplate).normalize('NFC');
    onUpdateText(newText);
    setFixNotice('Đã tự động tạo bảng biểu chuẩn Word / Nghị định 30 vào văn bản!');
    setTimeout(() => setFixNotice(null), 3000);
  };

  // Căn chỉnh bảng biểu theo chuẩn Nghị định 30 (cả bảng Markdown lẫn HTML)
  const handleAlignTables = () => {
    let updatedText = normalizedText;
    let tableCount = 0;

    // 1. Chuẩn hóa bảng HTML (nếu có từ Mammoth hoặc copy từ Word)
    const htmlTableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
    if (htmlTableRegex.test(updatedText)) {
      updatedText = updatedText.replace(htmlTableRegex, (match) => {
        tableCount++;
        return formatHtmlTableToFitA4(match);
      });
    }

    // 2. Chuẩn hóa bảng Markdown (căn lề STT căn giữa, số căn phải, chữ căn trái, viền 100%)
    const mdTableRegex = /(?:^|\n)(\|[^\n]+\|\r?\n\|[\s:-|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g;
    updatedText = updatedText.replace(mdTableRegex, (tableBlock) => {
      tableCount++;
      const lines = tableBlock.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return tableBlock;

      const headers = lines[0].replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const newSeparators = headers.map((h, i) => {
        if (i === 0 && /^stt\b/i.test(h)) return ':---:';
        if (/ngày|thời gian|năm|số lượng|tỷ lệ|%/i.test(h)) return ':---:';
        if (/số tiền|kinh phí|đơn giá|thành tiền|kinh phí/i.test(h)) return '---:';
        return ':---';
      });

      const formattedHeader = `| ${headers.join(' | ')} |`;
      const formattedSep = `| ${newSeparators.join(' | ')} |`;
      const dataRows = lines.slice(2).map(r => {
        const cells = r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        return `| ${cells.join(' | ')} |`;
      });

      return `\n\n${formattedHeader}\n${formattedSep}\n${dataRows.join('\n')}\n\n`;
    });

    onUpdateText(updatedText.normalize('NFC'));
    setFixNotice(tableCount > 0 ? `Đã căn chỉnh ${tableCount} bảng biểu theo định dạng chuẩn NĐ 30!` : 'Đã chuẩn hóa định dạng toàn bộ bảng biểu vừa vặn khổ A4!');
    setTimeout(() => setFixNotice(null), 3000);
  };

  // Thêm phụ lục mới (ngắt trang A4 độc lập sau Nơi nhận & Chữ ký)
  const handleAddAppendix = () => {
    const currentApps = doc.appendices ? [...doc.appendices] : [];
    const newIdx = currentApps.length + 1;
    const newApp: DocumentAppendix = {
      id: `appendix_${Date.now()}`,
      header: `PHỤ LỤC ${newIdx}`,
      title: 'DANH MỤC CHI TIẾT KÈM THEO',
      referenceNote: `(Kèm theo ${doc.docTypeName || 'văn bản'} số ${doc.docCode || '...'} ngày ${doc.locationDate || '...'})`,
      paragraphs: [
        '| STT | Nội dung / Danh mục công việc | Đơn vị thực hiện | Thời gian | Ghi chú |',
        '|:---:|:---|:---|:---:|:---|',
        '| 1 | Rà soát và hoàn thiện hồ sơ | Bộ phận chuyên môn | Quý IV/2026 | Theo kế hoạch |',
        '| 2 | Báo cáo kết quả triển khai | Các đơn vị liên quan | Trước 15/12/2026 | Báo cáo chính thức |'
      ]
    };
    const updatedApps = [...currentApps, newApp];
    updateDocField('appendices', updatedApps);
    setFixNotice(`Đã thêm ${newApp.header} (phân tách trang A4 độc lập sau Nơi nhận & Chữ ký)!`);
    setTimeout(() => setFixNotice(null), 3000);
  };

  // Cập nhật phụ lục
  const handleUpdateAppendix = (index: number, updatedFields: Partial<DocumentAppendix>) => {
    if (!doc.appendices) return;
    const currentApps = [...doc.appendices];
    currentApps[index] = { ...currentApps[index], ...updatedFields };
    updateDocField('appendices', currentApps);
  };

  // Xóa phụ lục
  const handleDeleteAppendix = (index: number) => {
    if (!doc.appendices) return;
    const currentApps = doc.appendices.filter((_, i) => i !== index);
    updateDocField('appendices', currentApps);
    setFixNotice('Đã xóa phụ lục khỏi văn bản!');
    setTimeout(() => setFixNotice(null), 2500);
  };

  // Thêm bảng chuẩn Word vào phụ lục
  const handleInsertTableToAppendix = (index: number) => {
    if (!doc.appendices || !doc.appendices[index]) return;
    const app = doc.appendices[index];
    const tableTemplate = `\n| STT | Tên mục / Chỉ tiêu | Đơn vị tính | Số lượng | Ghi chú |\n|:---:|:---|:---:|:---:|:---|\n| 1 | Hạng mục thực hiện số 01 | Bộ | 10 | Đạt chuẩn NĐ 30 |\n| 2 | Hạng mục thực hiện số 02 | Chiếc | 25 | Hoàn thành |\n`;
    const updatedParas = [...app.paragraphs, tableTemplate];
    handleUpdateAppendix(index, { paragraphs: updatedParas });
    setFixNotice(`Đã tự động tạo bảng biểu chuẩn Word vào ${app.header}!`);
    setTimeout(() => setFixNotice(null), 3000);
  };

  // Căn chỉnh bảng biểu trong phụ lục theo chuẩn NĐ 30
  const handleAlignAppendixTables = (index: number) => {
    if (!doc.appendices || !doc.appendices[index]) return;
    const app = doc.appendices[index];
    let appText = app.paragraphs.join('\n');
    let count = 0;
    const mdTableRegex = /(?:^|\n)(\|[^\n]+\|\r?\n\|[\s:-|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g;
    appText = appText.replace(mdTableRegex, (tableBlock) => {
      count++;
      const lines = tableBlock.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return tableBlock;
      const headers = lines[0].replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const newSeparators = headers.map((h, i) => {
        if (i === 0 && /^stt\b/i.test(h)) return ':---:';
        if (/ngày|thời gian|năm|số lượng|tỷ lệ|%/i.test(h)) return ':---:';
        return ':---';
      });
      const formattedHeader = `| ${headers.join(' | ')} |`;
      const formattedSep = `| ${newSeparators.join(' | ')} |`;
      const dataRows = lines.slice(2).map(r => {
        const cells = r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        return `| ${cells.join(' | ')} |`;
      });
      return `\n\n${formattedHeader}\n${formattedSep}\n${dataRows.join('\n')}\n\n`;
    });
    const updatedParas = appText.split('\n').map(l => l.trim()).filter(Boolean);
    handleUpdateAppendix(index, { paragraphs: updatedParas });
    setFixNotice(`Đã căn chỉnh ${count > 0 ? `${count} ` : ''}bảng biểu chuẩn NĐ 30 trong ${app.header}!`);
    setTimeout(() => setFixNotice(null), 3000);
  };

  // Body editor mode: 'highlight' (tô vàng sửa ngay) vs 'raw' (soạn thảo tự do)
  const [bodyMode, setBodyMode] = useState<'highlight' | 'raw'>('highlight');
  
  // Interactive fix popover states
  const [activeFix, setActiveFix] = useState<{
    type: 'spelling' | 'blank' | 'abbr' | 'long' | 'illogical';
    target: string;
    suggestion?: string;
    reason?: string;
    category?: string;
    index?: number;
    proposal?: SpellingProposal;
  } | null>(null);

  const [blankInputVal, setBlankInputVal] = useState('');
  const [fixNotice, setFixNotice] = useState<string | null>(null);

  // Danh sách lỗi chính tả phát hiện trong văn bản
  const spellingErrors: SpellingErrorMatch[] = useMemo(() => {
    return checkVietnameseSpelling(normalizedText);
  }, [normalizedText]);

  // Tự động sửa tất cả lỗi chính tả
  const handleAutoFixAllSpelling = () => {
    const res = autoFixVietnameseSpelling(normalizedText);
    if (res.fixedCount > 0) {
      onUpdateText(res.fixedText);
      setFixNotice(`Đã tự động sửa triệt để ${res.fixedCount} lỗi chính tả & văn phong theo chuẩn NĐ 30!`);
      setTimeout(() => setFixNotice(null), 3000);
    } else {
      setFixNotice('Văn bản hiện không có lỗi chính tả nào cần sửa!');
      setTimeout(() => setFixNotice(null), 2500);
    }
  };

  // Update a single field in doc and trigger parent onUpdateDoc / onUpdateText
  const updateDocField = (field: keyof StructuredDoc, value: any) => {
    isInternalUpdateRef.current = true;
    let cleanParas = doc.bodyParagraphs;

    // Khi người dùng chỉnh sửa Cơ quan ban hành: loại bỏ triệt để dòng tên cơ quan khỏi thân bài (ngăn lệch xuống sau tiêu đề báo cáo)
    if (field === 'agencyName' || field === 'parentAgency') {
      const valStr = String(value || '').trim();
      const oldValStr = String(doc[field] || '').trim();
      cleanParas = cleanParas.filter(p => {
        const pTrim = p.trim();
        if (!pTrim) return true;
        if (valStr && (pTrim.toUpperCase() === valStr.toUpperCase() || (pTrim.length <= 80 && !pTrim.endsWith('.') && valStr.toUpperCase().includes(pTrim.toUpperCase())))) return false;
        if (oldValStr && (pTrim.toUpperCase() === oldValStr.toUpperCase() || (pTrim.length <= 80 && !pTrim.endsWith('.') && oldValStr.toUpperCase().includes(pTrim.toUpperCase())))) return false;
        return true;
      });
    }

    const updated = { ...doc, [field]: value, bodyParagraphs: cleanParas };
    setDoc(updated);
    if (onUpdateDoc) {
      onUpdateDoc(updated);
    } else {
      const newText = reconstructNormalizedText(updated);
      onUpdateText(newText);
    }
  };

  // Re-sync all fields
  const commitDocChanges = (updatedDoc: StructuredDoc) => {
    isInternalUpdateRef.current = true;
    setDoc(updatedDoc);
    if (onUpdateDoc) {
      onUpdateDoc(updatedDoc);
    } else {
      const newText = reconstructNormalizedText(updatedDoc);
      onUpdateText(newText);
    }
  };

  // Sửa lỗi chính tả từ chỗ tô vàng (dùng ranh giới từ tiếng Việt an toàn)
  const handleApplySpellingFix = (wrong: string, right: string) => {
    const newText = fixSingleSpellingMatch(normalizedText, wrong, right);
    onUpdateText(newText);
    setActiveFix(null);
    setFixNotice(`Đã sửa "${wrong}" ➔ "${right}" thành công!`);
    setTimeout(() => setFixNotice(null), 2500);
  };

  // Xóa bỏ đoạn văn bản thiếu tính logic
  const handleDeleteIllogicalSnippet = (target: string) => {
    const currentFullText = normalizedText;
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:\\r?\\n)?\\s*${escaped}\\s*(?:\\r?\\n)?`, 'gi');
    const newText = currentFullText.replace(regex, '\n').replace(/\n{3,}/g, '\n\n').trim();
    onUpdateText(newText);
    setActiveFix(null);
    setFixNotice(`Đã xóa bỏ đoạn thiếu tính logic: "${target.substring(0, 30)}..."!`);
    setTimeout(() => setFixNotice(null), 2500);
  };

  // Điều chỉnh / Sửa đoạn văn bản thiếu tính logic
  const handleApplyIllogicalFix = (target: string, suggestion?: string) => {
    if (!suggestion) return;
    let replacement = suggestion;
    const matchQuotes = suggestion.match(/["“](.*?)["”]/);
    if (matchQuotes) {
      replacement = matchQuotes[1];
    } else if (suggestion.startsWith('Sửa thành: ')) {
      replacement = suggestion.replace(/^Sửa thành:\s*/i, '');
    } else if (suggestion.startsWith('Sửa thành ')) {
      replacement = suggestion.replace(/^Sửa thành\s+/i, '');
    } else if (suggestion.startsWith('Đổi thành ')) {
      replacement = suggestion.replace(/^Đổi thành\s+/i, '');
    }

    if (replacement.toLowerCase().includes('xóa bỏ') || replacement.toLowerCase().includes('xóa căn cứ')) {
      handleDeleteIllogicalSnippet(target);
      return;
    }

    const currentFullText = normalizedText;
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const newText = currentFullText.replace(regex, replacement);
    onUpdateText(newText);
    setActiveFix(null);
    setFixNotice(`Đã điều chỉnh đoạn thiếu logic thành: "${replacement.substring(0, 30)}..."!`);
    setTimeout(() => setFixNotice(null), 2500);
  };

  // Điền vào chỗ trống từ chỗ tô vàng
  const handleFillBlank = (target: string, value: string) => {
    if (!value.trim()) return;
    const currentFullText = normalizedText;
    const newText = currentFullText.replace(target, value.trim());
    onUpdateText(newText);
    setActiveFix(null);
    setBlankInputVal('');
    setFixNotice(`Đã điền "${value.trim()}" vào chỗ trống!`);
    setTimeout(() => setFixNotice(null), 2500);
  };

  // NÂNG CẤP TÍNH NĂNG TÔ ĐẬM CÁC ĐẦU DÒNG BULLET 1 2 3.... (Khoản, Điều, Điểm, Số La Mã)
  const [autoBoldBullets, setAutoBoldBullets] = useState(true);

  const handleBoldBullets = () => {
    // 1. Tô đậm trong bodyParagraphs của doc
    const updatedParas = doc.bodyParagraphs.map(p => {
      const res = boldBulletHeadings(p);
      return res.text;
    });

    // 2. Tô đậm trong toàn văn normalizedText
    const resFull = boldBulletHeadings(normalizedText);

    const updatedDoc = { ...doc, bodyParagraphs: updatedParas };
    isInternalUpdateRef.current = true;
    setDoc(updatedDoc);
    if (onUpdateDoc) onUpdateDoc(updatedDoc);
    onUpdateText(resFull.text);

    setFixNotice(`✓ Đã tô đậm ${resFull.count} đầu dòng Bullet (1, 2, 3...) thành công!`);
    setTimeout(() => setFixNotice(null), 3000);
  };

  const handleUnboldBullets = () => {
    const updatedParas = doc.bodyParagraphs.map(p => {
      const res = unboldBulletHeadings(p);
      return res.text;
    });
    const resFull = unboldBulletHeadings(normalizedText);

    const updatedDoc = { ...doc, bodyParagraphs: updatedParas };
    isInternalUpdateRef.current = true;
    setDoc(updatedDoc);
    if (onUpdateDoc) onUpdateDoc(updatedDoc);
    onUpdateText(resFull.text);

    setFixNotice(`✓ Đã hoàn tác / bỏ tô đậm đầu dòng Bullet!`);
    setTimeout(() => setFixNotice(null), 2500);
  };

  const isCongVan = selectedType.id === 'cong-van' || doc.docTypeName === 'CÔNG VĂN';

  return (
    <div className="space-y-5 font-sans">
      
      {/* Toast Notice */}
      {fixNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{fixNotice}</span>
        </div>
      )}

      {/* Top Action Toolbar: Nút HOME hình ngôi nhà & Tự động tạo / Căn chỉnh bảng biểu chuẩn Word */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs font-sans">
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              title="Quay về Trang chủ mặc định (HOME)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
            >
              <Home className="w-4 h-4 text-amber-700" />
              <span>Trang chủ (HOME)</span>
            </button>
          )}
          <span className="text-xs font-bold text-slate-700 hidden sm:inline">
            Khung chuẩn hóa 4 phần thể thức (Kèm ngắt trang Phụ lục A4 sau Nơi nhận & Chữ ký)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleInsertStandardTable}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
            title="Tự động tạo bảng biểu chuẩn Word / Nghị định 30"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>+ Tạo bảng Word NĐ 30</span>
          </button>
          <button
            type="button"
            onClick={handleAlignTables}
            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
            title="Căn chỉnh toàn bộ bảng biểu (Markdown/HTML) theo chuẩn NĐ 30 vừa vặn trang A4"
          >
            <AlignCenter className="w-3.5 h-3.5" />
            <span>Căn chỉnh bảng chuẩn</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          HẠNG MỤC 1: ĐẦU VĂN BẢN (Quốc hiệu, Tiêu ngữ, Cơ quan, Số, Trích yếu, Kính gửi)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection1(!openSection1)}
          className="w-full p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              1
            </span>
            <div className="text-left">
              <h4 className="font-bold text-slate-800 text-sm md:text-base font-serif">
                Đầu văn bản (Quốc hiệu, Tiêu ngữ, Cơ quan, Số hiệu, Trích yếu, Kính gửi)
              </h4>
              <p className="text-xs text-slate-500">
                Chỉnh sửa trực tiếp cơ quan ban hành, địa danh ngày tháng, số văn bản và tiêu đề
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-700 font-bold hidden sm:inline">
              {openSection1 ? 'Thu gọn' : 'Mở rộng chỉnh sửa'}
            </span>
            {openSection1 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </button>

        {openSection1 && (
          <div className="p-4 md:p-6 space-y-4 bg-white animate-fade-in text-xs">
            
            {/* CẢNH BÁO SAI LỆCH CƠ QUAN BAN HÀNH (YÊU CẦU 2) */}
            {agencySettings.agencyName && doc.agencyName && !doc.agencyName.toLowerCase().includes(agencySettings.agencyName.toLowerCase()) && !agencySettings.agencyName.toLowerCase().includes(doc.agencyName.toLowerCase()) && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 font-sans shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Cơ quan trong văn bản: <strong className="text-rose-800">"{doc.agencyName}"</strong> khác với Cài đặt người dùng: <strong className="text-blue-800">"{agencySettings.agencyName}"</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...doc,
                      agencyName: agencySettings.agencyName || doc.agencyName,
                      parentAgency: agencySettings.parentAgency || doc.parentAgency,
                      locationDate: agencySettings.shortLocation && doc.locationDate.includes(',') 
                        ? `${agencySettings.shortLocation}${doc.locationDate.substring(doc.locationDate.indexOf(','))}` 
                        : doc.locationDate
                    };
                    commitDocChanges(updated);
                    setFixNotice(`Đã đồng bộ cơ quan theo Cài đặt: "${agencySettings.agencyName}"!`);
                    setTimeout(() => setFixNotice(null), 2500);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  Đồng bộ theo Cài đặt
                </button>
              </div>
            )}

            {/* BỘ CHỌN NHANH VAI TRÒ CƠ QUAN / PHÒNG BAN BAN HÀNH (ĐỒNG BỘ TIÊU ĐỀ QUỐC NGỮ) */}
            <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5 font-sans">
                  <Building className="w-3.5 h-3.5 text-blue-700" />
                  <span>Chọn vai trò cơ quan / phòng ban ban hành (Tự động chọn Tiêu đề Quốc ngữ):</span>
                </label>
                <span className="text-[10px] text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-semibold font-sans">
                  Đồng bộ chuẩn 100%
                </span>
              </div>
              <select
                onChange={(e) => {
                  const presetId = e.target.value;
                  if (!presetId) return;
                  const preset = AGENCY_PRESETS.find(p => p.id === presetId);
                  if (preset) {
                    const isParty = preset.roleBlock === 'dang';
                    const updated = {
                      ...doc,
                      agencyName: preset.agencyName,
                      parentAgency: '', // Tuyệt đối không tự ý thêm cấp trên
                      isPartyDoc: isParty,
                      countryHeader: preset.countryHeader,
                      motto: preset.motto
                    };
                    commitDocChanges(updated);
                    setFixNotice(`Đã chọn ban hành với vai trò: "${preset.name}"!`);
                    setTimeout(() => setFixNotice(null), 2500);
                  }
                }}
                defaultValue=""
                className="w-full p-2.5 bg-white rounded-lg border border-blue-300 text-xs font-sans text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="" disabled>-- Bấm để chọn cơ quan / phòng ban ban hành văn bản --</option>
                <optgroup label="🏛️ Khối UBND & Bộ phận chuyên môn (Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM)">
                  {AGENCY_PRESETS.filter(p => p.group === 'ubnd').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="☭ Khối Đảng ủy (Tiêu đề Đảng: ĐẢNG CỘNG SẢN VIỆT NAM)">
                  {AGENCY_PRESETS.filter(p => p.group === 'dang').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🤝 Khối MTTQ & Đoàn thể (Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM)">
                  {AGENCY_PRESETS.filter(p => p.group === 'mttq_doanthe').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-[10px] text-slate-500 italic">
                Khi chọn cơ quan ban hành, hệ thống sẽ tự động gán Tiêu đề Quốc ngữ tương ứng và để trống cơ quan cấp trên (người dùng tự nhập nếu có).
              </p>
            </div>

            {/* Hiển thị Tiêu đề Quốc ngữ / Tiêu đề Đảng cố định theo Cài đặt khối cơ quan */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs font-serif flex items-center gap-1.5">
                  <span>Tiêu đề Quốc ngữ / Thể thức (Cố định theo Cài đặt mặc định):</span>
                </label>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {agencySettings.roleBlock === 'dang' 
                    ? 'Khối Đảng ủy (HD 05)' 
                    : agencySettings.roleBlock === 'mttq_doanthe' 
                    ? 'Khối MTTQ & Đoàn thể (NĐ 30)' 
                    : 'Khối UBND / Chính quyền (NĐ 30)'}
                </span>
              </div>

              {agencySettings.roleBlock === 'dang' ? (
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/70 text-amber-950 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-amber-900 tracking-wide font-serif">
                      <span className="inline-block border-b-[1.2px] border-amber-900 pb-0.5">
                        ĐẢNG CỘNG SẢN VIỆT NAM
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      ✓ Chuẩn Hướng dẫn 05-HD/VPTW • Tiêu đề Đảng (gạch chân nét liền 1/3 - 1/2 độ dài)
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300">
                    Mặc định theo Cài đặt
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-blue-300 bg-blue-50/70 text-blue-950 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs uppercase text-blue-950 font-serif">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div className="font-bold text-xs text-blue-900 mt-1 font-serif">
                      <span className="inline-block border-b-[1.2px] border-blue-900 pb-0.5">
                        Độc lập - Tự do - Hạnh phúc
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-700 mt-1">
                      ✓ Chuẩn Nghị định 30/2020/NĐ-CP • Gạch chân bằng đúng 100% độ dài dòng chữ Tiêu ngữ
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-300">
                    Mặc định theo Cài đặt
                  </span>
                </div>
              )}
            </div>

            {/* Grid 2 cột cho Cơ quan và Địa danh / Số ký hiệu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Cột 1: Cơ quan ban hành */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cơ quan cấp trên (tùy chọn - để trống nếu không có):
                  </label>
                  <input
                    type="text"
                    value={doc.parentAgency}
                    onChange={(e) => updateDocField('parentAgency', e.target.value)}
                    placeholder="Mặc định để trống (Không tự ý thêm cấp trên, tự nhập nếu có)..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5 italic">
                    Chỉ áp dụng đối với các phòng, ban, trung tâm chuyên môn trực thuộc. Nếu ban hành với tư cách UBND, để trống dòng này.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cơ quan ban hành văn bản (*) (Mặc định như Cài đặt):
                  </label>
                  <input
                    type="text"
                    value={doc.agencyName}
                    onChange={(e) => updateDocField('agencyName', e.target.value)}
                    placeholder="Ví dụ: ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN hoặc CHI BỘ..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5 italic">
                    Nếu là UBND các cấp, tiêu đề sẽ hiển thị 2 dòng: Dòng 1: ỦY BAN NHÂN DÂN, Dòng 2: PHƯỜNG ĐÔNG TIẾN (in đậm).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block text-xs">
                      Số ký hiệu văn bản (*):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = doc.docCode || 'Số: /UBND-VP';
                        // Thay thế dấu ... hoặc khoảng hẹp trước / bằng khoảng trống rộng ~1cm (10 dấu cách)
                        const formatted = current.replace(/Số:?\s*[\.…_\s]*\//i, 'Số:          /');
                        updateDocField('docCode', formatted);
                      }}
                      className="text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                      title="Mở rộng khoảng trắng ~1cm trước dấu gạch chéo /, không dùng dấu ..."
                    >
                      Để trắng 1cm (không dùng ...)
                    </button>
                  </div>
                  <input
                    type="text"
                    value={doc.docCode}
                    onChange={(e) => updateDocField('docCode', e.target.value)}
                    placeholder="Ví dụ: Số:          /UBND-VHXH hoặc Số: 45/UBND-VP"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5 italic">
                    Khoảng trống giữa "Số:" và "/" rộng khoảng 1cm, để trắng không dùng dấu ...
                  </p>
                </div>
              </div>

              {/* Cột 2: Địa danh, Ngày tháng & Tên loại */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Địa danh, ngày tháng năm (*):
                  </label>
                  <input
                    type="text"
                    value={doc.locationDate}
                    onChange={(e) => updateDocField('locationDate', e.target.value)}
                    placeholder="Ví dụ: Đông Tiến, ngày 15 tháng 10 năm 2026"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Loại văn bản:
                  </label>
                  <input
                    type="text"
                    value={doc.docTypeName}
                    onChange={(e) => updateDocField('docTypeName', e.target.value.toUpperCase())}
                    placeholder="Ví dụ: CÔNG VĂN, QUYẾT ĐỊNH, TỜ TRÌNH, BÁO CÁO..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {doc.docTypeName === 'BÁO CÁO' ? 'Tiêu đề Báo cáo (Chuẩn NĐ 30):' : 'Trích yếu nội dung (V/v hoặc Về việc):'}
                  </label>
                  <input
                    type="text"
                    value={doc.docSubjectShort || doc.docTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isCongVan || val.startsWith('V/v')) {
                        updateDocField('docSubjectShort', val);
                      } else {
                        updateDocField('docTitle', val);
                      }
                    }}
                    placeholder={doc.docTypeName === 'BÁO CÁO' ? 'Ví dụ: Kết quả thực hiện nhiệm vụ công tác năm 2026...' : 'Ví dụ: V/v tăng cường an toàn PCCC hoặc Về việc ban hành...'}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {(doc.docTypeName === 'BÁO CÁO' || selectedType.name === 'Báo cáo') && (
                    <div className="mt-2 p-2.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-1.5 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Gợi ý nhanh tiêu đề Báo cáo chuẩn Nghị định 30:
                        </span>
                        <span className="text-[10px] text-blue-700 italic">In thường, cỡ 13-14, chữ đứng hoặc đậm, căn giữa</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          'Kết quả thực hiện nhiệm vụ công tác',
                          'Tình hình kinh tế - xã hội và nhiệm vụ trọng tâm',
                          'Đánh giá tiến độ triển khai thực hiện',
                          'Tổng kết công tác thi đua, khen thưởng năm'
                        ].map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => {
                              updateDocField('docTitle', sug);
                            }}
                            className="text-[10px] bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs font-sans"
                          >
                            + {sug}...
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Ô nhập Kính gửi (HỖ TRỢ NHIỀU DÒNG VỚI \n, THẺ TEXTAREA) */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <label className="font-bold text-slate-700 text-xs">
                  Kính gửi (hỗ trợ nhiều dòng, xuống dòng bằng phím Enter):
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-blue-700 font-medium">
                    (Mặc định đã có nhãn "Kính gửi:")
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const formatted = formatBulletLines(kinhGuiText).join('\n');
                      setKinhGuiText(formatted);
                      updateDocField('recipientsHeader', formatted);
                    }}
                    className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 cursor-pointer"
                  >
                    Thêm (-) đầu dòng
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                value={kinhGuiText}
                onChange={(e) => {
                  const val = e.target.value.normalize('NFC');
                  setKinhGuiText(val);
                  updateDocField('recipientsHeader', val);
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
                  if (!text) return;
                  e.preventDefault();
                  const cleaned = cleanAIText(text, { preserveTables: true, stripNationalHeader: false });
                  const target = e.currentTarget;
                  const start = target.selectionStart ?? 0;
                  const end = target.selectionEnd ?? 0;
                  const val = target.value;
                  const next = (val.substring(0, start) + cleaned + val.substring(end)).normalize('NFC');
                  setKinhGuiText(next);
                  updateDocField('recipientsHeader', next);
                }}
                placeholder="- Các ban ngành, đoàn thể phường;&#10;- Ban cán sự các tổ dân phố trên địa bàn."
                className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 italic mt-0.5 block">
                Cho phép xuống dòng tùy ý bằng \n. Áp dụng cho Công văn, Tờ trình, Báo cáo, Giấy mời.
              </span>
            </div>

          </div>
        )}
      </div>

      {/* =========================================================================
          HẠNG MỤC 2: NỘI DUNG VĂN BẢN & CHỖ TÔ VÀNG SỬA NGAY (Chuẩn trolyvanthu)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              2
            </span>
            <div>
              <h4 className="font-bold text-slate-800 text-sm md:text-base font-serif">
                Nội dung văn bản (Thân văn bản & Chỗ tô vàng sửa ngay)
              </h4>
              <p className="text-xs text-slate-500">
                Bấm vào các chỗ tô vàng để sửa nhanh chính tả, điền chỗ trống, giải thích từ viết tắt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút thao tác Tô đậm Bullet (1, 2, 3...) chuẩn NĐ 30 */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={handleBoldBullets}
                className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                title="Tô đậm các đầu dòng Bullet 1, 2, 3... (Khoản, Điều, Điểm, Số La Mã)"
              >
                <Bold className="w-3.5 h-3.5" />
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Tô đậm Bullet (1, 2, 3...)</span>
              </button>

              <button
                type="button"
                onClick={handleUnboldBullets}
                className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                title="Hoàn tác / Bỏ tô đậm đầu dòng Bullet"
              >
                <Undo2 className="w-3 h-3 inline mr-0.5" />
                Bỏ đậm
              </button>
            </div>

            {/* Chuyển đổi chế độ Tô vàng sửa ngay vs Soạn thảo tự do */}
            <div className="bg-white p-1 rounded-lg border border-slate-300 flex items-center gap-1 shadow-xs">
              <button
                type="button"
                onClick={() => setBodyMode('highlight')}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  bodyMode === 'highlight'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Chỗ tô vàng sửa ngay</span>
              </button>

              <button
                type="button"
                onClick={() => setBodyMode('raw')}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  bodyMode === 'raw'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Soạn thảo tự do</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOpenSection2(!openSection2)}
              className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              {openSection2 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {openSection2 && (
          <div className="p-4 md:p-6 bg-white animate-fade-in text-xs font-sans">
            
            {/* Băng thông báo tính năng chuẩn NĐ 30: Tô đậm đầu dòng Bullet 1, 2, 3... */}
            <div className="mb-4 p-3 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-amber-950 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>
                  <strong>Chuẩn thể thức NĐ 30:</strong> Các đầu dòng <strong>1., 2., 3...</strong>, <strong>I., II...</strong>, <strong>a), b)...</strong> được <strong>tự động in đậm</strong> trên bản in A4 & file Word!
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {activeProposals && activeProposals.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={onAcceptAllProposals ? onAcceptAllProposals : handleAutoFixAllSpelling}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Đồng ý sửa toàn bộ lỗi chính tả & văn phong đang được phát hiện"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Đồng ý sửa tất cả ({activeProposals.length})</span>
                    </button>
                    {onDismissAllProposals && (
                      <button
                        type="button"
                        onClick={onDismissAllProposals}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Bỏ qua tất cả các đề xuất, bảo toàn 100% nội dung gốc"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Bỏ qua tất cả</span>
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>0 lỗi chờ duyệt</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleInsertStandardTable}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Tự động tạo bảng biểu phân công/thống kê chuẩn thể thức Nghị định 30"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>+ Chèn bảng biểu NĐ 30</span>
                </button>
                <button
                  type="button"
                  onClick={handleAlignTables}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Căn chỉnh toàn bộ bảng biểu theo chuẩn thể thức: vừa khít trang A4, viền đơn rõ nét, căn đều"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                  <span>Căn chỉnh bảng chuẩn</span>
                </button>
                <button
                  type="button"
                  onClick={handleBoldBullets}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Tô đậm số thứ tự</span>
                </button>
                <button
                  type="button"
                  onClick={handleUnboldBullets}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs cursor-pointer"
                >
                  Bỏ đậm
                </button>
              </div>
            </div>
            
            {/* CHẾ ĐỘ 1: TÔ VÀNG SỬA NGAY (Interactive Click-to-Fix) */}
            {bodyMode === 'highlight' ? (
              <div className="space-y-4">
                
                {/* Thanh trợ giúp */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <strong>Gợi ý thông minh: </strong>
                    Bấm vào các từ <span className="bg-yellow-200 px-1.5 py-0.5 rounded font-bold border border-yellow-400">tô vàng</span> để sửa chính tả; bấm vào chỗ <span className="bg-amber-200 px-1.5 py-0.5 rounded font-bold border border-amber-400 animate-pulse">…… trống</span> để điền thông tin ngay!
                  </span>

                  <button
                    type="button"
                    onClick={() => setBodyMode('raw')}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Chuyển sang gõ văn bản
                  </button>
                </div>

                {/* Popover xử lý tương tác khi bấm vào từ tô vàng */}
                {activeFix && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border-2 border-amber-400 shadow-md animate-fade-in">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm text-amber-950 font-serif flex items-center gap-1.5">
                          <Wand2 className="w-4 h-4 text-amber-700" />
                          {activeFix.type === 'spelling' && 'Khắc phục lỗi chính tả / văn phong'}
                          {activeFix.type === 'blank' && 'Điền thông tin vào chỗ trống'}
                          {activeFix.type === 'illogical' && 'Rà soát văn bản thiếu tính logic'}
                          {activeFix.type === 'abbr' && 'Bổ sung tên đầy đủ cho từ viết tắt'}
                          {activeFix.type === 'long' && 'Gợi ý tách câu dài'}
                        </div>

                        {/* Rà soát thiếu tính logic */}
                        {activeFix.type === 'illogical' && (
                          <div className="mt-2 text-xs text-slate-800 space-y-2">
                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-amber-950">
                              <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                                <span>⚠️ Phát hiện đoạn thiếu tính logic / không phù hợp thể thức:</span>
                              </div>
                              <p className="leading-relaxed font-sans">{activeFix.reason}</p>
                            </div>

                            <div className="text-xs">
                              <span className="text-slate-600">Đoạn văn bị cảnh báo: </span>
                              <span className="line-through text-rose-700 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                                {activeFix.target}
                              </span>
                            </div>

                            {activeFix.suggestion && (
                              <div className="text-xs">
                                <span className="text-slate-600">Gợi ý điều chỉnh: </span>
                                <strong className="text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300 font-serif">
                                  {activeFix.suggestion}
                                </strong>
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-amber-300">
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeFix.proposal && onAcceptProposal) {
                                    onAcceptProposal(activeFix.proposal);
                                  } else if (activeFix.suggestion && !activeFix.suggestion.toLowerCase().includes('xóa bỏ') && !activeFix.suggestion.toLowerCase().includes('xóa căn cứ')) {
                                    handleApplyIllogicalFix(activeFix.target, activeFix.suggestion);
                                  } else {
                                    handleDeleteIllogicalSnippet(activeFix.target);
                                  }
                                  setActiveFix(null);
                                }}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Đồng ý sửa đoạn này theo đề xuất chuẩn mực"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Đồng ý sửa</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (activeFix.proposal && onDismissProposal) {
                                    onDismissProposal(activeFix.proposal);
                                  } else if (onDismissProposal && activeProposals) {
                                    const found = activeProposals.find(p => p.wrong === activeFix.target);
                                    if (found) onDismissProposal(found);
                                  }
                                  setActiveFix(null);
                                }}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg cursor-pointer"
                              >
                                Bỏ qua
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Sửa chính tả */}
                        {activeFix.type === 'spelling' && activeFix.suggestion && (
                          <div className="mt-2 text-xs text-slate-800 space-y-1.5">
                            {activeFix.reason && (
                              <div className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                💡 {activeFix.reason}
                              </div>
                            )}
                            <div className="space-y-1">
                              <div>
                                <span className="text-slate-600">Đoạn bị lỗi (đã bôi vàng): </span>
                                <mark className="bg-yellow-200 text-yellow-950 font-bold px-1.5 py-0.5 rounded border border-yellow-400 font-serif line-through decoration-rose-500 mr-2">
                                  {activeFix.target}
                                </mark>
                              </div>
                              <div>
                                <span className="text-slate-600">Đề xuất cách viết đúng: </span>
                                <strong className="text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300 text-sm font-serif">
                                  {activeFix.suggestion}
                                </strong>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeFix.proposal && onAcceptProposal) {
                                    onAcceptProposal(activeFix.proposal);
                                  } else {
                                    handleApplySpellingFix(activeFix.target, activeFix.suggestion!);
                                  }
                                  setActiveFix(null);
                                }}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Đồng ý sửa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeFix.proposal && onDismissProposal) {
                                    onDismissProposal(activeFix.proposal);
                                  } else if (onDismissProposal && activeProposals) {
                                    const found = activeProposals.find(p => p.wrong === activeFix.target);
                                    if (found) onDismissProposal(found);
                                  }
                                  setActiveFix(null);
                                }}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg cursor-pointer"
                              >
                                Bỏ qua
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Điền chỗ trống */}
                        {activeFix.type === 'blank' && (
                          <div className="mt-2 text-xs text-slate-800">
                            <p className="mb-2">Nhập nội dung cần điền (họ tên, ngày tháng, chức vụ, số hiệu...):</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={blankInputVal}
                                onChange={(e) => setBlankInputVal(e.target.value)}
                                placeholder="Nhập thông tin điền vào chỗ trống..."
                                className="p-2 rounded-lg border border-amber-400 bg-white text-xs font-serif min-w-[260px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleFillBlank(activeFix.target, blankInputVal);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleFillBlank(activeFix.target, blankInputVal)}
                                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Điền ngay</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFix(null)}
                                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}

                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveFix(null)}
                        className="p-1 rounded-md text-amber-800 hover:bg-amber-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Khung hiển thị văn bản với các vị trí tô vàng */}
                <div 
                  className="p-5 md:p-8 bg-slate-50 rounded-xl border border-slate-300 leading-relaxed font-serif text-[15px] max-h-[500px] overflow-y-auto space-y-3"
                  style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
                >
                  {normalizedText.split('\n').map((paragraph, pIdx) => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return <div key={pIdx} className="h-2" />;

                    // Căn giữa chỉ thị hành động QUYẾT ĐỊNH:
                    if (/^(QUYẾT ĐỊNH|QUYẾT NGHỊ|CHỈ THỊ|KẾT LUẬN|YÊU CẦU)\s*[:\.]?$/i.test(trimmed)) {
                      return (
                        <p key={pIdx} className="text-center font-bold text-[16px] my-3 uppercase tracking-wider text-slate-900">
                          {trimmed.toUpperCase().endsWith(':') ? trimmed.toUpperCase() : trimmed.toUpperCase() + ':'}
                        </p>
                      );
                    }

                    // Tiêu đề Điều khoản
                    if (/^Điều\s+\d+/i.test(trimmed)) {
                      return (
                        <p key={pIdx} className="text-justify font-bold indent-6 text-slate-900">
                          {trimmed}
                        </p>
                      );
                    }

                    // Tô vàng các lỗi chính tả và chỗ trống trong đoạn từ bộ từ điển chuyên sâu NĐ 30
                    const highlightKeywords = getSpellingHighlightPatterns();

                    return (
                      <p key={pIdx} className="text-justify indent-6 text-slate-800 leading-relaxed">
                        {renderParagraphWithHighlights(
                          trimmed,
                          activeProposals,
                          highlightKeywords,
                          doc.illogicalFindings || [],
                          (wrong, right, reason, prop) => {
                            setActiveFix({ type: 'spelling', target: wrong, suggestion: right, reason, proposal: prop });
                          },
                          (blankStr) => {
                            setActiveFix({ type: 'blank', target: blankStr });
                          },
                          (illogicalSeg) => {
                            setActiveFix({
                              type: 'illogical',
                              target: illogicalSeg.target,
                              suggestion: illogicalSeg.suggestion,
                              reason: illogicalSeg.reason,
                              category: illogicalSeg.category
                            });
                          }
                        )}
                      </p>
                    );
                  })}
                </div>

              </div>
            ) : (
              /* CHẾ ĐỘ 2: SOẠN THẢO TỰ DO (Textarea) */
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Soạn thảo tự do (Paste bảng Word/Excel giữ nguyên viền, ngắt trang A4 tự động)</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleInsertStandardTable}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Tự động tạo bảng biểu chuẩn Nghị định 30"
                    >
                      <TableIcon className="w-3 h-3" />
                      <span>+ Chèn bảng NĐ 30</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAlignTables}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Căn chỉnh toàn bộ bảng biểu trong văn bản theo chuẩn thể thức"
                    >
                      <AlignCenter className="w-3 h-3" />
                      <span>Căn chỉnh bảng</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBoldBullets}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Tô đậm các đầu dòng 1., 2., 3..., Điều, Khoản, Điểm"
                    >
                      <Bold className="w-3 h-3" />
                      <span>Tô đậm Bullet</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUnboldBullets}
                      className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 px-2 py-1 rounded text-xs font-medium cursor-pointer"
                    >
                      Bỏ đậm
                    </button>
                  </div>
                </div>

                <textarea
                  rows={18}
                  value={normalizedText}
                  onChange={(e) => onUpdateText(e.target.value.normalize('NFC'))}
                  onPaste={(e) => {
                    const plain = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text') || '';
                    const html = e.clipboardData.getData('text/html') || '';
                    if (plain || html) {
                      e.preventDefault();
                      const cleaned = cleanAIText(plain, { preserveTables: true, stripNationalHeader: false, htmlClipboard: html });
                      const target = e.currentTarget;
                      const start = target.selectionStart ?? 0;
                      const end = target.selectionEnd ?? 0;
                      const val = target.value;
                      const next = (val.substring(0, start) + cleaned + val.substring(end)).normalize('NFC');
                      onUpdateText(next);
                      requestAnimationFrame(() => {
                        target.setSelectionRange(start + cleaned.length, start + cleaned.length);
                      });
                    }
                  }}
                  className="w-full p-4 rounded-xl border border-slate-300 font-serif text-[15px] leading-relaxed text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-inner"
                  style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
                  placeholder="Soạn thảo hoặc chỉnh sửa nội dung văn bản..."
                />
              </div>
            )}

          </div>
        )}
      </div>

      {/* =========================================================================
          HẠNG MỤC 3: NƠI NHẬN VÀ CHỮ KÝ (Cuối văn bản)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection3(!openSection3)}
          className="w-full p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              3
            </span>
            <div className="text-left">
              <h4 className="font-bold text-slate-800 text-sm md:text-base font-serif">
                Cuối văn bản (Nơi nhận & Chữ ký, Thẩm quyền ký)
              </h4>
              <p className="text-xs text-slate-500">
                Chỉnh sửa danh sách nơi nhận, quyền hạn (TM., T/M), chức vụ và họ tên người ký
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-700 font-bold hidden sm:inline">
              {openSection3 ? 'Thu gọn' : 'Mở rộng chỉnh sửa'}
            </span>
            {openSection3 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </button>

        {openSection3 && (
          <div className="p-4 md:p-6 space-y-4 bg-white animate-fade-in text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Cột 1: Nơi nhận (HỖ TRỢ NHIỀU DÒNG VỚI \n, THẺ TEXTAREA) */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <label className="font-bold text-slate-700 text-xs">
                    Nơi nhận (hỗ trợ nhiều dòng, xuống dòng bằng phím Enter):
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-700 font-medium">
                      (Mặc định đã có nhãn "Nơi nhận:")
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sanitized = cleanAndDeduplicateRecipients(noiNhanText.split('\n'), {
                          quyenHanKy: doc.quyenHanKy,
                          signerAuthority: doc.signerAuthority,
                          signerTitle: doc.signerTitle,
                          signerName: doc.signerName,
                        });
                        const formatted = sanitized.join('\n');
                        setNoiNhanText(formatted);
                        updateDocField('recipients', sanitized);
                        setFixNotice('✓ Đã chuẩn hóa Nơi nhận và loại bỏ hoàn toàn trùng lặp với khối chữ ký!');
                        setTimeout(() => setFixNotice(null), 3000);
                      }}
                      className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded hover:bg-emerald-100 cursor-pointer font-bold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Lọc trùng & thêm (-) chuẩn NĐ 30</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={7}
                  value={noiNhanText}
                  onChange={(e) => {
                    const val = e.target.value.normalize('NFC');
                    setNoiNhanText(val);
                    const lines = val.split('\n');
                    updateDocField('recipients', lines);
                  }}
                  onBlur={() => {
                    const sanitized = cleanAndDeduplicateRecipients(noiNhanText.split('\n'), {
                      quyenHanKy: doc.quyenHanKy,
                      signerAuthority: doc.signerAuthority,
                      signerTitle: doc.signerTitle,
                      signerName: doc.signerName,
                    });
                    const formatted = sanitized.join('\n');
                    if (formatted !== noiNhanText) {
                      setNoiNhanText(formatted);
                      updateDocField('recipients', sanitized);
                    }
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
                    if (!text) return;
                    e.preventDefault();
                    const cleaned = cleanAIText(text, { preserveTables: true, stripNationalHeader: false });
                    const target = e.currentTarget;
                    const start = target.selectionStart ?? 0;
                    const end = target.selectionEnd ?? 0;
                    const val = target.value;
                    const next = (val.substring(0, start) + cleaned + val.substring(end)).normalize('NFC');
                    const sanitized = cleanAndDeduplicateRecipients(next.split('\n'), {
                      quyenHanKy: doc.quyenHanKy,
                      signerAuthority: doc.signerAuthority,
                      signerTitle: doc.signerTitle,
                      signerName: doc.signerName,
                    });
                    const formatted = sanitized.join('\n');
                    setNoiNhanText(formatted);
                    updateDocField('recipients', sanitized);
                  }}
                  placeholder="- Như trên;&#10;- Chủ tịch, các PCT UBND;&#10;- Lưu: VT, VP."
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 italic mt-0.5 block">
                  Trình bày chữ in thường cỡ 11, các dòng kết thúc bằng dấu chấm phẩy (;), dòng cuối cùng kết thúc bằng dấu chấm (.). Tự động loại bỏ thành phần chữ ký khỏi nơi nhận.
                </span>
              </div>

              {/* Cột 2: Quyền hạn ký, chức vụ & chữ ký (TÁCH RÕ DÒNG 1 & DÒNG 2 CHUẨN NGHỊ ĐỊNH 30) */}
              <div className="space-y-3">
                
                {/* DÒNG 1: QUYỀN HẠN KÝ & CHỨC VỤ NGƯỜI KÝ */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                      <span>Dòng 1: Quyền hạn ký & Chức vụ người ký</span>
                    </label>
                    <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold border border-rose-200">
                      In hoa đậm (13pt)
                    </span>
                  </div>

                  {/* Nút chọn nhanh Quyền hạn ký */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateDocField('quyenHanKy', 'KT. CHỦ TỊCH');
                        updateDocField('signerAuthority', 'KT. CHỦ TỊCH');
                        if (!doc.signerTitle || doc.signerTitle === 'CHỦ TỊCH') {
                          updateDocField('signerTitle', 'PHÓ CHỦ TỊCH');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                        (doc.quyenHanKy === 'KT. CHỦ TỊCH' || doc.signerAuthority === 'KT. CHỦ TỊCH')
                          ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400 ring-offset-1'
                          : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                      }`}
                    >
                      ★ KT. CHỦ TỊCH (Phó Chủ tịch)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        updateDocField('quyenHanKy', 'TM.');
                        updateDocField('signerAuthority', doc.agencyName ? `TM. ${doc.agencyName}` : 'TM. ỦY BAN NHÂN DÂN');
                        if (doc.signerTitle === 'PHÓ CHỦ TỊCH') {
                          updateDocField('signerTitle', 'CHỦ TỊCH');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                        doc.quyenHanKy === 'TM.'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      TM. (Thay mặt)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        updateDocField('quyenHanKy', 'T/M');
                        updateDocField('signerAuthority', 'T/M CHI BỘ');
                        updateDocField('signerTitle', 'BÍ THƯ');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                        doc.quyenHanKy === 'T/M'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      T/M (Văn bản Đảng)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        updateDocField('quyenHanKy', 'KT.');
                        updateDocField('signerAuthority', 'KT.');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                        doc.quyenHanKy === 'KT.'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      KT. (Ký thay)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        updateDocField('quyenHanKy', 'Q.');
                        updateDocField('signerAuthority', 'Q. CHỦ TỊCH');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                        doc.quyenHanKy === 'Q.'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Q. (Quyền)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        updateDocField('quyenHanKy', '');
                        updateDocField('signerAuthority', '');
                      }}
                      className={`px-2 py-1 rounded-md text-xs cursor-pointer transition-all ${
                        !doc.quyenHanKy && !doc.signerAuthority
                          ? 'bg-slate-700 text-white'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Ký trực tiếp
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Quyền hạn ký:
                      </label>
                      <input
                        type="text"
                        value={doc.quyenHanKy || doc.signerAuthority}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          updateDocField('quyenHanKy', val);
                          updateDocField('signerAuthority', val);
                        }}
                        placeholder="Ví dụ: KT. CHỦ TỊCH hoặc TM."
                        className="w-full p-2 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Chức vụ người ký (*):
                      </label>
                      <input
                        type="text"
                        value={doc.signerTitle}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          updateDocField('signerTitle', val);
                          if (/PHÓ/i.test(val) && doc.quyenHanKy !== 'KT. CHỦ TỊCH') {
                            updateDocField('quyenHanKy', 'KT. CHỦ TỊCH');
                            updateDocField('signerAuthority', 'KT. CHỦ TỊCH');
                          }
                        }}
                        placeholder="Ví dụ: PHÓ CHỦ TỊCH hoặc CHỦ TỊCH"
                        className="w-full p-2 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DÒNG 2: HỌ VÀ TÊN NGƯỜI KÝ & KHOẢNG TRỐNG KÝ TÊN */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Dòng 2: Họ và tên người ký (Cỡ 14pt in đậm)</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                      Khoảng trống ký: 55-60pt
                    </span>
                  </div>

                  <input
                    type="text"
                    value={doc.signerName}
                    onChange={(e) => updateDocField('signerName', e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A (hoặc để trống nếu ký tay)"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />

                  {/* Trực quan hóa bố cục chữ ký xuất ra */}
                  <div className="p-2.5 bg-white rounded-lg border border-dashed border-slate-300 text-center text-xs font-serif space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-sans tracking-wider font-bold">
                      Bản xem trước bố cục chữ ký sẽ xuất:
                    </div>
                    <div className="font-bold text-slate-900 text-xs">
                      {(() => {
                        const auth = (doc.signerAuthority || doc.quyenHanKy || '').trim().toUpperCase();
                        const title = (doc.signerTitle || '').trim().toUpperCase();
                        if (auth === 'KT. CHỦ TỊCH' || doc.quyenHanKy === 'KT. CHỦ TỊCH') {
                          return (
                            <div>
                              <div>KT. CHỦ TỊCH</div>
                              <div className="mt-0.5">{title || 'PHÓ CHỦ TỊCH'}</div>
                            </div>
                          );
                        }
                        if (doc.quyenHanKy === 'Q.' || auth.startsWith('Q.')) {
                          return <div>{auth || 'Q. CHỦ TỊCH'}</div>;
                        }
                        if (auth && title && auth === title) {
                          return <div>{title}</div>;
                        }
                        if (auth && title) {
                          return (
                            <div>
                              <div>{auth}</div>
                              <div className="mt-0.5">{title}</div>
                            </div>
                          );
                        }
                        return <div>{auth || title || 'CHỦ TỊCH'}</div>;
                      })()}
                    </div>
                    <div className="py-2 text-[10px] text-slate-400 italic font-sans border-y border-slate-100 my-1">
                      [Khoảng trống ký tay hoặc ký số chứng thư số]
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {doc.signerName || '(Họ và tên người ký)'}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          HẠNG MỤC 4: PHỤ LỤC VĂN BẢN (Phân tách trang A4 độc lập sau Nơi nhận & Chữ ký)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection4(!openSection4)}
          className="w-full p-4 bg-gradient-to-r from-purple-50 via-slate-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center text-xs font-bold font-mono">
              4
            </span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800 text-sm md:text-base font-serif">
                  Phụ lục kèm theo (Phân tách trang A4 độc lập sau Nơi nhận & Chữ ký)
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                  {doc.appendices?.length || 0} Phụ lục
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tự động ngắt sang trang mới độc lập, chứa danh mục, bảng biểu số liệu chi tiết
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-700 font-bold hidden sm:inline">
              {openSection4 ? 'Thu gọn' : 'Mở rộng chỉnh sửa'}
            </span>
            {openSection4 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </button>

        {openSection4 && (
          <div className="p-4 md:p-6 space-y-5 bg-white animate-fade-in text-xs font-sans">
            
            {/* Thanh công cụ quản lý Phụ lục */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
              <span className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Theo Nghị định 30, Phụ lục luôn bắt đầu trên trang A4 độc lập sau Nơi nhận và chữ ký</span>
              </span>

              <button
                type="button"
                onClick={handleAddAppendix}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <FilePlus className="w-4 h-4" />
                <span>+ Thêm Phụ lục mới (Ngắt trang A4)</span>
              </button>
            </div>

            {/* Danh sách các Phụ lục */}
            {(!doc.appendices || doc.appendices.length === 0) ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto text-lg">
                  📑
                </div>
                <h5 className="font-bold text-slate-700 text-sm">Văn bản hiện tại chưa có Phụ lục</h5>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Nếu văn bản có bảng số liệu lớn hoặc danh mục đính kèm, đồng chí hãy nhấn nút dưới đây để tạo Phụ lục phân tách trang A4 độc lập sau Nơi nhận và chữ ký.
                </p>
                <button
                  type="button"
                  onClick={handleAddAppendix}
                  className="mt-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Phụ lục I ngay</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {doc.appendices.map((app, appIdx) => (
                  <div key={app.id || appIdx} className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-3.5 shadow-2xs">
                    
                    {/* Header bar của từng phụ lục */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-purple-200">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-700 text-white flex items-center justify-center font-bold text-xs">
                          {appIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={app.header}
                          onChange={(e) => handleUpdateAppendix(appIdx, { header: e.target.value.toUpperCase() })}
                          placeholder="Ví dụ: PHỤ LỤC I hoặc PHỤ LỤC 1"
                          className="font-bold text-purple-950 font-serif text-sm bg-white border border-purple-300 rounded px-2.5 py-1 focus:ring-2 focus:ring-purple-500 uppercase"
                        />
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          Trang A4 độc lập #{appIdx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInsertTableToAppendix(appIdx)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Tự động tạo bảng biểu chuẩn Word vào phụ lục này"
                        >
                          <TableIcon className="w-3 h-3" />
                          <span>+ Bảng biểu Word</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAlignAppendixTables(appIdx)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Căn chỉnh toàn bộ bảng biểu trong phụ lục này theo chuẩn NĐ 30"
                        >
                          <AlignCenter className="w-3 h-3" />
                          <span>Căn bảng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAppendix(appIdx)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Xóa phụ lục này"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>

                    {/* Tiêu đề & Ghi chú ban hành */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Tên tiêu đề Phụ lục:
                        </label>
                        <input
                          type="text"
                          value={app.title}
                          onChange={(e) => handleUpdateAppendix(appIdx, { title: e.target.value })}
                          placeholder="Ví dụ: DANH MỤC CÁC CƠ SỞ HOẠT ĐỘNG TRÊN ĐỊA BÀN"
                          className="w-full p-2 bg-white rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 uppercase"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Ghi chú Ban hành kèm theo:
                        </label>
                        <input
                          type="text"
                          value={app.referenceNote}
                          onChange={(e) => handleUpdateAppendix(appIdx, { referenceNote: e.target.value })}
                          placeholder="Ví dụ: (Kèm theo Báo cáo số 15/BC-UBND ngày 10/10/2026 của UBND...)"
                          className="w-full p-2 bg-white rounded-lg border border-slate-300 font-serif text-xs italic text-slate-800 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Nội dung và Bảng biểu phụ lục */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">
                          Nội dung & Bảng biểu phụ lục (Dán trực tiếp từ Word/Excel giữ nguyên viền và cấu trúc cột):
                        </label>
                        <span className="text-[11px] text-slate-500 italic">
                          Tự động xuất bảng chuẩn Microsoft Word
                        </span>
                      </div>
                      <textarea
                        rows={7}
                        value={app.paragraphs.join('\n')}
                        onChange={(e) => {
                          const val = e.target.value.normalize('NFC');
                          const lines = val.split('\n');
                          handleUpdateAppendix(appIdx, { paragraphs: lines });
                        }}
                        placeholder="| STT | Tên hạng mục | Số lượng | Ghi chú |&#10;|:---:|:---|:---:|:---|&#10;| 1 | Nội dung công việc | 10 | Đạt chuẩn |"
                        className="w-full p-2.5 bg-white rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 font-mono leading-relaxed"
                      />
                    </div>

                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddAppendix}
                  className="w-full py-2.5 border-2 border-dashed border-purple-300 hover:border-purple-500 text-purple-800 rounded-xl font-bold flex items-center justify-center gap-2 bg-purple-50/40 hover:bg-purple-50 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Phụ lục tiếp theo (Tự động ngắt sang trang A4 mới)</span>
                </button>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};

/**
 * Hàm phân tích và render đoạn văn có gắn các vị trí tô vàng (chính tả, chỗ trống, thiếu tính logic)
 */
function renderParagraphWithHighlights(
  text: string,
  activeProposals: SpellingProposal[] | undefined,
  keywords: Array<{ pattern: RegExp; wrong: string; right: string; reason?: string }>,
  illogicalFindings: IllogicalSegment[],
  onSpellingClick: (wrong: string, right: string, reason?: string, proposal?: SpellingProposal) => void,
  onBlankClick: (blank: string) => void,
  onIllogicalClick: (segment: IllogicalSegment) => void
) {
  // 1. Nếu có activeProposals (dù rỗng), ưu tiên quét theo activeProposals
  if (activeProposals !== undefined) {
    const matchedProps = activeProposals.filter(p => p.wrong && text.includes(p.wrong));

    const regexTokens: string[] = [];
    matchedProps.forEach(p => {
      regexTokens.push(escapeRegex(p.wrong));
    });

    // Blanks
    regexTokens.push('…{2,}');
    regexTokens.push('\\.{3,}');
    regexTokens.push('_{3,}');
    regexTokens.push('\\[\\s*\\.{3,}\\s*\\]');

    if (regexTokens.length === 0) return text;

    const sortedTokens = [...regexTokens].sort((a, b) => b.length - a.length);
    const combinedRegex = new RegExp(`(${sortedTokens.join('|')})`, 'gi');
    const parts = text.split(combinedRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      // A. Kiểm tra proposal
      const propMatch = matchedProps.find(p => p.wrong.toLowerCase() === part.trim().toLowerCase());
      if (propMatch) {
        return (
          <span
            key={`prop_${i}`}
            onClick={() => onSpellingClick(part, propMatch.right, propMatch.reason, propMatch)}
            title={`Đề xuất sửa: Bấm để chọn [Đồng ý sửa] thành "${propMatch.right}" hoặc [Bỏ qua] (${propMatch.reason || ''})`}
            className="bg-yellow-200 hover:bg-yellow-300 text-yellow-950 px-1.5 py-0.5 rounded border border-yellow-400 font-bold cursor-pointer transition-colors inline-flex items-center gap-0.5 mx-0.5 shadow-2xs"
          >
            <span className="text-[10px] text-yellow-800">⚠️</span>
            <span>{part}</span>
          </span>
        );
      }

      // B. Kiểm tra chỗ trống
      if (/^(\.{3,}|…{2,}|_{3,}|\[\s*\.{3,}\s*\])/.test(part)) {
        return (
          <span
            key={`blank_${i}`}
            onClick={() => onBlankClick(part)}
            title="Bấm vào để điền thông tin vào chỗ trống này"
            className="bg-amber-200 hover:bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded border border-amber-400 font-bold cursor-pointer transition-colors animate-pulse inline-flex items-center gap-0.5 mx-0.5"
          >
            {part}
            <span className="text-[10px] text-amber-800">✏️</span>
          </span>
        );
      }

      return part;
    });
  }

  // 2. Chế độ fallback nếu activeProposals không được truyền vào
  const matchedIllogicals = illogicalFindings.filter(f => f.target && text.includes(f.target));
  const activeKeywords = keywords.filter(k => k.pattern.test(text));

  const regexTokens: string[] = [];
  matchedIllogicals.forEach(f => {
    regexTokens.push(escapeRegex(f.target));
  });
  activeKeywords.forEach(k => {
    regexTokens.push(escapeRegex(k.wrong));
  });
  regexTokens.push('…{2,}');
  regexTokens.push('\\.{3,}');
  regexTokens.push('_{3,}');
  regexTokens.push('\\[\\s*\\.{3,}\\s*\\]');

  if (regexTokens.length === 0) return text;

  const sortedTokens = [...regexTokens].sort((a, b) => b.length - a.length);
  const combinedRegex = new RegExp(`(${sortedTokens.join('|')})`, 'gi');
  const parts = text.split(combinedRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // A. Kiểm tra illogical segment
    const illMatch = matchedIllogicals.find(f => f.target.toLowerCase() === part.toLowerCase());
    if (illMatch) {
      return (
        <span
          key={`ill_${i}`}
          onClick={() => onIllogicalClick(illMatch)}
          title={`⚠️ Thiếu tính logic: ${illMatch.reason}. Bấm để xóa hoặc điều chỉnh!`}
          className="bg-yellow-200 hover:bg-yellow-300 text-yellow-950 px-1.5 py-0.5 rounded border border-yellow-500 font-bold cursor-pointer transition-all inline-flex items-center gap-1 mx-0.5 shadow-2xs hover:scale-105"
        >
          <span className="text-amber-800 font-black">⚠️</span>
          <span>{part}</span>
        </span>
      );
    }

    // B. Kiểm tra chỗ trống
    if (/^(\.{3,}|…{2,}|_{3,}|\[\s*\.{3,}\s*\])/.test(part)) {
      return (
        <span
          key={`blank_${i}`}
          onClick={() => onBlankClick(part)}
          title="Bấm vào để điền thông tin vào chỗ trống này"
          className="bg-amber-200 hover:bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded border border-amber-400 font-bold cursor-pointer transition-colors animate-pulse inline-flex items-center gap-0.5 mx-0.5"
        >
          {part}
          <span className="text-[10px] text-amber-800">✏️</span>
        </span>
      );
    }

    // C. Kiểm tra lỗi chính tả
    const matchedRule = activeKeywords.find(k => k.wrong.toLowerCase() === part.trim().toLowerCase());
    if (matchedRule) {
      return (
        <span
          key={`spell_${i}`}
          onClick={() => onSpellingClick(part, matchedRule.right, matchedRule.reason)}
          title={`Gợi ý sửa chính tả: Bấm để sửa thành "${matchedRule.right}" (${matchedRule.reason || ''})`}
          className="bg-yellow-200 hover:bg-yellow-300 text-yellow-950 px-1 py-0.5 rounded border border-yellow-400 font-bold cursor-pointer transition-colors inline-flex items-center gap-0.5 mx-0.5 shadow-2xs"
        >
          {part}
          <span className="text-[10px] text-yellow-800">🪄</span>
        </span>
      );
    }

    return part;
  });
}
