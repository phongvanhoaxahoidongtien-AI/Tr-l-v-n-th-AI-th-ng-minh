import React, { useState, useEffect, useRef } from 'react';
import { DocumentTypeItem, AgencySettings, DocumentAnalysisReport, IllogicalSegment } from '../types';
import { 
  parseDocumentStructure, 
  reconstructNormalizedText, 
  formatBulletLines, 
  boldBulletHeadings,
  unboldBulletHeadings,
  StructuredDoc 
} from '../services/decree30Formatter';
import { cleanAIText } from '../utils/cleanAIText';
import { AGENCY_PRESETS } from '../utils/agencyPresets';
import { 
  Building2, FileText, CheckCircle2, AlertTriangle, Sparkles, 
  HelpCircle, UserCheck, ChevronDown, ChevronUp, Edit3, Wand2,
  Check, X, Eye, Undo2, ArrowRight, Building, Bold, ListOrdered
} from 'lucide-react';

interface InteractiveDocumentEditorProps {
  normalizedText: string;
  selectedType: DocumentTypeItem;
  agencySettings: AgencySettings;
  onUpdateText: (text: string) => void;
  onUpdateDoc?: (doc: StructuredDoc) => void;
  analysisReport?: DocumentAnalysisReport;
  externalDoc?: StructuredDoc;
}

export const InteractiveDocumentEditor: React.FC<InteractiveDocumentEditorProps> = ({
  normalizedText,
  selectedType,
  agencySettings,
  onUpdateText,
  onUpdateDoc,
  analysisReport,
  externalDoc
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
  } | null>(null);

  const [blankInputVal, setBlankInputVal] = useState('');
  const [fixNotice, setFixNotice] = useState<string | null>(null);

  // Update a single field in doc and trigger parent onUpdateText & onUpdateDoc
  const updateDocField = (field: keyof StructuredDoc, value: any) => {
    isInternalUpdateRef.current = true;
    const updated = { ...doc, [field]: value };
    setDoc(updated);
    if (onUpdateDoc) {
      onUpdateDoc(updated);
    }
    const newText = reconstructNormalizedText(updated);
    onUpdateText(newText);
  };

  // Re-sync all fields
  const commitDocChanges = (updatedDoc: StructuredDoc) => {
    isInternalUpdateRef.current = true;
    setDoc(updatedDoc);
    if (onUpdateDoc) {
      onUpdateDoc(updatedDoc);
    }
    const newText = reconstructNormalizedText(updatedDoc);
    onUpdateText(newText);
  };

  // Sửa lỗi chính tả từ chỗ tô vàng
  const handleApplySpellingFix = (wrong: string, right: string) => {
    const currentFullText = normalizedText;
    const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const newText = currentFullText.replace(regex, right);
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
                    Trích yếu nội dung (V/v hoặc Về việc):
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
                    placeholder="Ví dụ: V/v tăng cường an toàn PCCC hoặc Về việc ban hành..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleBoldBullets}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Tô đậm số thứ tự vào văn bản</span>
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
                                onClick={() => handleDeleteIllogicalSnippet(activeFix.target)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Xóa bỏ hoàn toàn đoạn văn bản thiếu tính logic này khỏi văn bản"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Xóa bỏ đoạn này ngay</span>
                              </button>

                              {activeFix.suggestion && !activeFix.suggestion.toLowerCase().includes('xóa bỏ') && !activeFix.suggestion.toLowerCase().includes('xóa căn cứ') && (
                                <button
                                  type="button"
                                  onClick={() => handleApplyIllogicalFix(activeFix.target, activeFix.suggestion)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                                  title="Điều chỉnh đoạn này theo gợi ý chuẩn mực"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Điều chỉnh / Sửa logic</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setActiveFix(null)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg cursor-pointer"
                              >
                                Bỏ qua
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Sửa chính tả */}
                        {activeFix.type === 'spelling' && activeFix.suggestion && (
                          <div className="mt-2 text-xs text-slate-800">
                            <span>Từ trong văn bản: </span>
                            <span className="line-through text-rose-700 font-bold mr-2">{activeFix.target}</span>
                            <span>➔ Gợi ý sửa đúng: </span>
                            <strong className="text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300 text-sm">
                              {activeFix.suggestion}
                            </strong>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApplySpellingFix(activeFix.target, activeFix.suggestion!)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Sửa ngay thành: {activeFix.suggestion}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFix(null)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg cursor-pointer"
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

                    // Tô vàng các lỗi chính tả và chỗ trống trong đoạn
                    // Danh sách từ cần tô vàng
                    const highlightKeywords = [
                      { pattern: /sử lý/gi, wrong: 'sử lý', right: 'xử lý' },
                      { pattern: /bổ xung/gi, wrong: 'bổ xung', right: 'bổ sung' },
                      { pattern: /xắp xếp/gi, wrong: 'xắp xếp', right: 'sắp xếp' },
                      { pattern: /qui định/gi, wrong: 'qui định', right: 'quy định' },
                      { pattern: /qui chế/gi, wrong: 'qui chế', right: 'quy chế' },
                      { pattern: /bố chí/gi, wrong: 'bố chí', right: 'bố trí' },
                      { pattern: /chủ chí/gi, wrong: 'chủ chí', right: 'chủ trì' },
                      { pattern: /xơ xuất/gi, wrong: 'xơ xuất', right: 'sơ suất' },
                      { pattern: /sơ xuất/gi, wrong: 'sơ xuất', right: 'sơ suất' },
                      { pattern: /xem sét/gi, wrong: 'xem sét', right: 'xem xét' },
                      { pattern: /ba phần tư/gi, wrong: 'ba phần tư', right: 'ba phần tư' }
                    ];

                    return (
                      <p key={pIdx} className="text-justify indent-6 text-slate-800 leading-relaxed">
                        {renderParagraphWithHighlights(
                          trimmed,
                          highlightKeywords,
                          doc.illogicalFindings || [],
                          (wrong, right) => {
                            setActiveFix({ type: 'spelling', target: wrong, suggestion: right });
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
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleBoldBullets}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Tô đậm các đầu dòng 1., 2., 3..., Điều, Khoản, Điểm"
                    >
                      <Bold className="w-3 h-3" />
                      <span>Tô đậm Bullet (1, 2, 3...)</span>
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

            {/* THÔNG TIN & CHỈNH SỬA PHỤ LỤC KÈM THEO (TỰ ĐỘNG NGẮT SANG TRANG A4 MỚI) */}
            <div className="mt-4 p-4 bg-emerald-50/90 rounded-xl border border-emerald-300 space-y-3 font-sans animate-fade-in shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📄</span>
                  <h5 className="font-bold text-emerald-950 text-xs uppercase">
                    Phụ lục kèm theo ({doc.appendices?.length || 0} phụ lục - Tự động ngắt sang trang A4 thứ 2 riêng biệt)
                  </h5>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                    ✓ Có ngắt trang chuẩn A4
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = (doc.appendices?.length || 0) + 1;
                      const newApp = {
                        id: `appendix_${Date.now()}`,
                        header: `PHỤ LỤC ${nextNum}`,
                        title: 'SỐ LƯỢNG CÁC ĐƠN VỊ THAM GIA LỄ PHÁT ĐỘNG',
                        referenceNote: `(Ban hành kèm theo Công văn số ${doc.docCode ? doc.docCode.replace(/^Số:\s*/i, '') : '/UBND-VHXH'} ngày tháng 10 năm 2026 của ${doc.agencyName || 'UBND phường Đông Tiến'})`,
                        paragraphs: [
                          '| STT | Đơn vị tham gia | Số lượng người | Ghi chú |',
                          '|:---:|:---|:---:|:---|',
                          '| 1 | Các ban ngành đoàn thể phường | 35 | Đại biểu |',
                          '| 2 | Nhân dân các tổ dân phố | 120 | Lực lượng tham gia |'
                        ]
                      };
                      const updatedApps = [...(doc.appendices || []), newApp];
                      updateDocField('appendices', updatedApps);
                      setFixNotice(`Đã thêm PHỤ LỤC ${nextNum} ngắt trang A4 mới!`);
                      setTimeout(() => setFixNotice(null), 2500);
                    }}
                    className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Thêm phụ lục</span>
                  </button>
                </div>
              </div>

              {doc.appendices && doc.appendices.length > 0 ? (
                <div className="space-y-3">
                  {doc.appendices.map((app, idx) => (
                    <div key={app.id || idx} className="p-3 bg-white rounded-xl border border-emerald-300 text-xs space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="font-bold text-emerald-800 text-xs flex items-center gap-1.5 font-sans">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-mono">
                            {idx + 1}
                          </span>
                          <span>Phụ lục {idx + 1}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedApps = (doc.appendices || []).filter((_, i) => i !== idx);
                            updateDocField('appendices', updatedApps);
                            setFixNotice(`Đã xóa phụ lục ${idx + 1}!`);
                            setTimeout(() => setFixNotice(null), 2500);
                          }}
                          className="text-[10px] text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          Xóa phụ lục này
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                            Tiêu đề phụ lục (Dòng 1):
                          </label>
                          <input
                            type="text"
                            value={app.header}
                            onChange={(e) => {
                              const updated = [...(doc.appendices || [])];
                              updated[idx] = { ...updated[idx], header: e.target.value.toUpperCase() };
                              updateDocField('appendices', updated);
                            }}
                            placeholder="PHỤ LỤC 1..."
                            className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold uppercase text-slate-900 font-serif"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                            Tên phụ lục (Dòng 2):
                          </label>
                          <input
                            type="text"
                            value={app.title}
                            onChange={(e) => {
                              const updated = [...(doc.appendices || [])];
                              updated[idx] = { ...updated[idx], title: e.target.value };
                              updateDocField('appendices', updated);
                            }}
                            placeholder="- SỐ LƯỢNG CÁC ĐƠN VỊ THAM GIA LỄ PHÁT ĐỘNG..."
                            className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 font-serif"
                          />
                        </div>
                      </div>

                      <div className="font-sans">
                        <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                          Ghi chú ban hành kèm theo (Dòng 3):
                        </label>
                        <input
                          type="text"
                          value={app.referenceNote}
                          onChange={(e) => {
                            const updated = [...(doc.appendices || [])];
                            updated[idx] = { ...updated[idx], referenceNote: e.target.value };
                            updateDocField('appendices', updated);
                          }}
                          placeholder="(Ban hành kèm theo Công văn số .../UBND-VHXH ngày tháng 10 năm 2026 của UBND phường Đông Tiến)..."
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs italic text-slate-700 font-serif"
                        />
                      </div>

                      <div className="font-sans">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[11px] font-bold text-slate-700">
                            Nội dung chi tiết & Bảng biểu (Markdown hoặc văn bản):
                          </label>
                          <span className="text-[10px] text-slate-500 italic">
                            Hỗ trợ bảng dạng | Cột 1 | Cột 2 |
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={app.paragraphs.join('\n')}
                          onChange={(e) => {
                            const updated = [...(doc.appendices || [])];
                            updated[idx] = { ...updated[idx], paragraphs: e.target.value.split('\n') };
                            updateDocField('appendices', updated);
                          }}
                          placeholder="| STT | Tên đơn vị | Số lượng |..."
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900"
                        />
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 text-[11px] text-emerald-800 font-medium flex items-center justify-between">
                        <span>✓ Tự động ngắt sang trang thứ 2 trong Live Preview và file Word</span>
                        <span className="text-slate-500 text-[10px]">{app.paragraphs.length} dòng</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white/80 rounded-lg border border-dashed border-emerald-300 text-center text-xs text-slate-600">
                  <p>Chưa có phụ lục kèm theo. Đồng chí có thể bấm nút <strong>"+ Thêm phụ lục"</strong> ở trên nếu văn bản có bảng biểu số liệu riêng cần ngắt trang A4.</p>
                </div>
              )}
            </div>

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
                        const formatted = formatBulletLines(noiNhanText).join('\n');
                        setNoiNhanText(formatted);
                        updateDocField('recipients', formatted.split('\n'));
                      }}
                      className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100 cursor-pointer"
                    >
                      Thêm (-) đầu dòng
                    </button>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={noiNhanText}
                  onChange={(e) => {
                    const val = e.target.value.normalize('NFC');
                    setNoiNhanText(val);
                    const lines = val.split('\n');
                    updateDocField('recipients', lines);
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
                    setNoiNhanText(next);
                    updateDocField('recipients', next.split('\n'));
                  }}
                  placeholder="- Như trên;&#10;- Chủ tịch, các PCT UBND;&#10;- Lưu: VT, VP."
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 italic mt-0.5 block">
                  Trình bày chữ in thường cỡ 11, các dòng kết thúc bằng dấu chấm phẩy (;), dòng cuối cùng kết thúc bằng dấu chấm (.).
                </span>
              </div>

              {/* Cột 2: Quyền hạn ký, chức vụ & chữ ký (YÊU CẦU 4: Quyền hạn ký TM., T/M, KT., Q. với tùy chọn KT. CHỦ TỊCH) */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block text-xs">
                      Quyền hạn ký (TM., T/M, KT., Q., KT. CHỦ TỊCH):
                    </label>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Chuẩn NĐ 30 & HD 05
                    </span>
                  </div>

                  {/* Nút chọn nhanh Quyền hạn ký */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
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
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Để trống
                    </button>
                  </div>

                  <input
                    type="text"
                    value={doc.quyenHanKy || doc.signerAuthority}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      updateDocField('quyenHanKy', val);
                      updateDocField('signerAuthority', val);
                    }}
                    placeholder="Ví dụ: KT. CHỦ TỊCH hoặc TM. ỦY BAN NHÂN DÂN"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block text-xs">
                      Chức vụ người ký (*):
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          updateDocField('signerTitle', 'CHỦ TỊCH');
                          if (doc.quyenHanKy === 'KT. CHỦ TỊCH') {
                            updateDocField('quyenHanKy', 'TM.');
                            updateDocField('signerAuthority', doc.agencyName ? `TM. ${doc.agencyName}` : 'TM. ỦY BAN NHÂN DÂN');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          doc.signerTitle === 'CHỦ TỊCH' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        CHỦ TỊCH
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateDocField('signerTitle', 'PHÓ CHỦ TỊCH');
                          updateDocField('quyenHanKy', 'KT. CHỦ TỊCH');
                          updateDocField('signerAuthority', 'KT. CHỦ TỊCH');
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          doc.signerTitle === 'PHÓ CHỦ TỊCH' ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        PHÓ CHỦ TỊCH
                      </button>
                    </div>
                  </div>
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
                    placeholder="Ví dụ: CHỦ TỊCH hoặc PHÓ CHỦ TỊCH"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-xs">
                    Họ và tên người ký (*):
                  </label>
                  <input
                    type="text"
                    value={doc.signerName}
                    onChange={(e) => updateDocField('signerName', e.target.value)}
                    placeholder="Ví dụ: Họ và tên người ký trong văn bản"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
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
  keywords: Array<{ pattern: RegExp; wrong: string; right: string }>,
  illogicalFindings: IllogicalSegment[],
  onSpellingClick: (wrong: string, right: string) => void,
  onBlankClick: (blank: string) => void,
  onIllogicalClick: (segment: IllogicalSegment) => void
) {
  // Lọc các illogical findings xuất hiện trong đoạn văn này
  const matchedIllogicals = illogicalFindings.filter(f => f.target && text.includes(f.target));

  // Tạo mảng regex tổng hợp
  const regexTokens: string[] = [];

  // 1. Illogical snippets
  matchedIllogicals.forEach(f => {
    regexTokens.push(f.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  });

  // 2. Spelling mistakes
  keywords.forEach(k => {
    regexTokens.push(`\\b${k.wrong}\\b`);
  });

  // 3. Blanks
  regexTokens.push('…{2,}');
  regexTokens.push('\\.{3,}');
  regexTokens.push('_{3,}');
  regexTokens.push('\\[\\s*\\.{3,}\\s*\\]');

  const combinedRegex = new RegExp(`(${regexTokens.join('|')})`, 'gi');
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
    const matchedRule = keywords.find(k => k.pattern.test(part));
    if (matchedRule) {
      return (
        <span
          key={`spell_${i}`}
          onClick={() => onSpellingClick(part, matchedRule.right)}
          title={`Gợi ý sửa chính tả: Bấm để sửa thành "${matchedRule.right}"`}
          className="bg-yellow-200 hover:bg-yellow-300 text-yellow-950 px-1 py-0.5 rounded border border-yellow-400 font-bold cursor-pointer transition-colors inline-flex items-center gap-0.5 mx-0.5"
        >
          {part}
          <span className="text-[10px] text-yellow-800">🪄</span>
        </span>
      );
    }

    return part;
  });
}
