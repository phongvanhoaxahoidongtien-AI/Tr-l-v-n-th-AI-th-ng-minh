import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DocumentTypeItem, AgencySettings, DocumentAnalysisReport, IllogicalSegment, DocumentAppendix, SpellingProposal } from '../types';
import { 
  parseDocumentStructure, 
  reconstructNormalizedText, 
  formatBulletLines, 
  formatKinhGuiLines,
  boldBulletHeadings,
  unboldBulletHeadings,
  cleanAndDeduplicateRecipients,
  checkSignatureLines,
  isDocumentBodyStart,
  StructuredDoc 
} from '../services/decree30Formatter';
import { 
  isCongVanDocument, 
  formatCongVanSubject, 
  getCongVanSubject 
} from '../services/Module_CongVan.js';
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

/**
 * Nhận diện ranh giới bắt đầu nội dung chính trong trường Kính gửi
 * (Thực hiện..., Căn cứ..., UBND nhận được..., Nhận được..., Tiếp nhận..., Phúc đáp...)
 */
export function isKinhGuiBodyLeakLine(line: string): boolean {
  if (!line) return false;
  const clean = line.trim();
  if (!clean) return false;

  // Nếu dòng bắt đầu bằng tên cơ quan, hội đồng, ban bệ, đoàn thể, chức danh nhận văn bản:
  // TUYỆT ĐỐI KHÔNG coi là nội dung thân bài (trừ khi có các động từ trần thuật của câu kể đầy đủ)
  const isAgencyEntity = /^(?:Ban\s+Chỉ\s+đạo|Ban\s+Quản\s+lý|Ban\s+Cán\s+sự|Ban\s+Chấp\s+hành|Hội\s+đồng|Tổ\s+công\s+tác|Đoàn\s+kiểm\s+tra|Đoàn\s+công\s+tác|UBND|Ủy\s+ban\s+nhân\s+dân|Uỷ\s+ban\s+nhân\s+dân|HĐND|UBMTTQ|Sở|Phòng|Chi\s+cục|Cục|Trung\s+tâm|Công\s+an|Trạm|Bệnh\s+viện|Trường|Công\s+ty|Tổng\s+công\s+ty|Đồng\s+chí|Đ\/c|Ông|Bà|Chủ\s+tịch|Phó\s+Chủ\s+tịch|Giám\s+đốc|Phó\s+Giám\s+đốc|Trưởng\s+phòng|Phó\s+Trưởng\s+phòng|Thủ\s+trưởng)\b/i.test(clean);

  if (isAgencyEntity) {
    // Chỉ coi là body leak nếu có cụm động từ trần thuật rõ ràng của câu văn bản gửi đến
    return /\b(?:nhận\s+được\s+(?:Công\s+văn|Tờ\s+trình|Báo\s+cáo|văn\s+bản|kế\s+hoạch)|tiếp\s+nhận\s+(?:Công\s+văn|văn\s+bản)|yêu\s+cầu\s+các\s+(?:phòng|ban|đơn\s+vị)|đề\s+nghị\s+các\s+(?:phòng|ban|đơn\s+vị)|chỉ\s+đạo\s+các)\b/i.test(clean);
  }

  if (isDocumentBodyStart(clean)) return true;
  if (/^(?:Thực\s+hiện|thực\s+hiện)\b/i.test(clean)) return true;
  if (/^(?:Căn\s+cứ|căn\s+cứ)\b/i.test(clean)) return true;
  if (/^(?:Nhận\s+được|nhận\s+được|Tiếp\s+nhận|tiếp\s+nhận|Phúc\s+đáp|phúc\s+đáp|Xét\s+đề\s+nghị|xét\s+đề\s+nghị|Theo\s+đề\s+nghị|theo\s+đề\s+nghị|Trả\s+lời\s+công\s+văn)\b/i.test(clean)) return true;
  if (clean.length > 55 && /\b(?:thực hiện\s+(?:Công\s+văn|Kế\s+hoạch|Nghị\s+quyết|Quyết\s+định|Chỉ\s+thị)|kính\s+đề\s+nghị|kính\s+báo\s+cáo)\b/i.test(clean)) return true;
  return false;
}

/**
 * Nâng cấp khả năng nhận diện các nơi kính gửi theo chuẩn Nghị định 30/2020/NĐ-CP:
 * - KHÔNG tự ý bỏ đi bất kỳ nơi nhận nào người dùng đã nhập hoặc paste vào.
 * - Nhận diện tách nhiều nơi nhận qua: xuống dòng (\n), dấu chấm phẩy (;), gạch đầu dòng (-), bullet (•, *), số thứ tự (1, 2...)
 *   hoặc phân cách dấu phẩy (,) khi liệt kê các cơ quan khác nhau.
 * - Tách riêng các dòng nội dung chính bị dính vào Kính gửi (Thực hiện..., Căn cứ..., UBND nhận được...)
 * - Quy tắc thể thức Nghị định 30/2020/NĐ-CP:
 *   + Nếu 1 nơi nhận: ghi trên 1 hàng, TUYỆT ĐỐI KHÔNG có dấu gạch (-), kết thúc bằng dấu chấm (.)
 *   + Nếu nhiều nơi nhận (>= 2): mỗi nơi nhận trên 1 dòng riêng biệt, đầu dòng BẮT BUỘC có dấu gạch (- ),
 *     canh thẳng hàng lề trái, các dòng trước kết thúc bằng dấu chấm phẩy (;), dòng cuối cùng kết thúc bằng dấu chấm (.)
 */
export function processAndFormatKinhGui(raw: string | string[]): {
  formattedText: string;
  recipients: string[];
  leakedBodyLines: string[];
} {
  const rawLines: string[] = Array.isArray(raw) ? raw : (raw || '').split('\n');
  const candidateRecipients: string[] = [];
  const leakedBodyLines: string[] = [];
  let foundBodyStart = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Nếu đã phát hiện ranh giới thân bài, toàn bộ các dòng sau đều là nội dung chính
    if (foundBodyStart) {
      leakedBodyLines.push(trimmed);
      continue;
    }

    // Kiểm tra dòng có phải là bắt đầu nội dung chính không (Thực hiện..., Căn cứ..., UBND... nhận được...)
    if (isKinhGuiBodyLeakLine(trimmed)) {
      foundBodyStart = true;
      leakedBodyLines.push(trimmed);
      continue;
    }

    // Tách bỏ tiền tố "Kính gửi:", "Kính trình:", "Kính chuyển:"
    let clean = trimmed.replace(/^Kính\s*(?:gửi|trình|chuyển):?\s*/i, '').trim();
    if (!clean) continue;

    // Kiểm tra lại sau khi bỏ tiền tố Kính gửi, phần còn lại có phải nội dung thân bài không
    if (isKinhGuiBodyLeakLine(clean)) {
      foundBodyStart = true;
      leakedBodyLines.push(clean);
      continue;
    }

    // 1. Phân tách nếu dòng chứa dấu chấm phẩy ";"
    if (clean.includes(';')) {
      const subParts = clean.split(';').map(p => p.trim()).filter(Boolean);
      for (const sub of subParts) {
        if (isKinhGuiBodyLeakLine(sub)) {
          foundBodyStart = true;
          leakedBodyLines.push(sub);
          continue;
        }
        const itemClean = sub
          .replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '')
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/[;\.]+$/, '')
          .trim();
        if (itemClean) candidateRecipients.push(itemClean);
      }
      continue;
    }

    // 2. Phân tách nếu dòng chứa dấu phẩy "," phân cách các cơ quan/chức danh riêng biệt
    // Ví dụ: "Sở Nội vụ, Sở Tài chính, UBND các huyện" hoặc "Đ/c Bí thư Đảng ủy, Đ/c Chủ tịch UBND"
    const agencyLookahead = /(?:,\s*(?:và\s+)?|\s+và\s+)(?=(?:Sở|Ban|Phòng|UBND|Ủy\s+ban|HĐND|UBMTTQ|Chi\s+cục|Cục|Trung\s+tâm|Công\s+an|Trường|Bệnh\s+viện|Công\s+ty|Đồng\s+chí|Đ\/c|Ông|Bà|Chủ\s+tịch|Giám\s+đốc|Trưởng\s+phòng)\b)/i;
    if (agencyLookahead.test(clean)) {
      const subParts = clean.split(agencyLookahead).map(p => p.trim()).filter(Boolean);
      let parsedAny = false;
      for (const sub of subParts) {
        if (isKinhGuiBodyLeakLine(sub)) {
          foundBodyStart = true;
          leakedBodyLines.push(sub);
          continue;
        }
        const itemClean = sub
          .replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '')
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/[;\.]+$/, '')
          .trim();
        if (itemClean) {
          candidateRecipients.push(itemClean);
          parsedAny = true;
        }
      }
      if (parsedAny) continue;
    }

    // 3. Dòng thông thường (1 cơ quan/đơn vị trên 1 dòng)
    const itemClean = clean
      .replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '')
      .replace(/^\d+[\.\)]\s*/, '')
      .replace(/[;\.]+$/, '')
      .trim();
    if (itemClean) {
      candidateRecipients.push(itemClean);
    }
  }

  // KHÔNG BỎ SÓT BẤT KỲ NƠI NHẬN NÀO:
  // Lọc trùng lặp chính xác (nếu người dùng lỡ paste 2 dòng giống hệt nhau thì giữ 1, còn khác nhau giữ nguyên 100%)
  const uniqueRecipients: string[] = [];
  for (const r of candidateRecipients) {
    const rTrim = r.trim();
    if (rTrim && !uniqueRecipients.some(existing => existing.toLowerCase() === rTrim.toLowerCase())) {
      uniqueRecipients.push(rTrim);
    }
  }

  let formattedLines: string[] = [];
  if (uniqueRecipients.length === 1) {
    // 1 nơi nhận: trên 1 dòng, TUYỆT ĐỐI KHÔNG có dấu gạch (-), kết thúc bằng dấu chấm (.)
    formattedLines = [`${uniqueRecipients[0]}.`];
  } else if (uniqueRecipients.length > 1) {
    // Nhiều nơi nhận: mỗi dòng có gạch đầu dòng (- ), các dòng trước kết thúc bằng (;), dòng cuối kết thúc bằng (.)
    formattedLines = uniqueRecipients.map((item, idx) => {
      const isLast = idx === uniqueRecipients.length - 1;
      return `- ${item}${isLast ? '.' : ';'}`;
    });
  }

  return {
    formattedText: formattedLines.join('\n'),
    recipients: uniqueRecipients,
    leakedBodyLines
  };
}

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

  // Multiline string states cho Kính gửi và Nơi nhận (Kính gửi 1 nơi: không có dấu gạch -; Nơi nhận: có dấu - ở đầu dòng)
  const [kinhGuiText, setKinhGuiText] = useState(() => {
    const raw = externalDoc?.recipientsHeader ?? doc.recipientsHeader ?? '';
    return raw ? processAndFormatKinhGui(raw).formattedText : '';
  });
  const [noiNhanText, setNoiNhanText] = useState(() => {
    const raw = externalDoc?.recipients ?? doc.recipients ?? [];
    return formatBulletLines(raw).join('\n');
  });

  // Trạng thái đã chốt kết thúc Kính gửi (dấu ".") và khóa chống trùng lặp vào văn bản chính (Yêu cầu 4)
  const [isKinhGuiFinalized, setIsKinhGuiFinalized] = useState(() => {
    const raw = externalDoc?.recipientsHeader ?? doc.recipientsHeader ?? '';
    return Boolean(raw && (raw.trim().endsWith('.') || raw.trim().endsWith('.;')));
  });

  // Trạng thái số dòng vai trò ký (2 dòng hay 3 dòng vai trò ký thay mặt tập thể)
  const [hasThreeSignerLines, setHasThreeSignerLines] = useState<boolean>(() => {
    return Boolean(externalDoc?.signerRoleLine2 || doc.signerRoleLine2);
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
      const kgResult = processAndFormatKinhGui(externalDoc.recipientsHeader || '');
      setKinhGuiText(kgResult.formattedText);
      setNoiNhanText(formatBulletLines(externalDoc.recipients || []).join('\n'));
      if (externalDoc.signerRoleLine2) {
        setHasThreeSignerLines(true);
      }
      if (kgResult.leakedBodyLines.length > 0) {
        const paras = [...(externalDoc.bodyParagraphs || [])];
        let hasNew = false;
        for (let i = kgResult.leakedBodyLines.length - 1; i >= 0; i--) {
          const lk = kgResult.leakedBodyLines[i];
          if (!paras.some(p => p.trim() === lk.trim())) {
            paras.unshift(lk);
            hasNew = true;
          }
        }
        if (hasNew) {
          setDoc(prev => ({ ...prev, recipientsHeader: kgResult.formattedText, bodyParagraphs: paras }));
        }
      }
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
    const kgResult = processAndFormatKinhGui(parsed.recipientsHeader || '');
    setKinhGuiText(kgResult.formattedText);
    setNoiNhanText(formatBulletLines(parsed.recipients || []).join('\n'));
    if (kgResult.leakedBodyLines.length > 0) {
      const paras = [...(parsed.bodyParagraphs || [])];
      let hasNew = false;
      for (let i = kgResult.leakedBodyLines.length - 1; i >= 0; i--) {
        const lk = kgResult.leakedBodyLines[i];
        if (!paras.some(p => p.trim() === lk.trim())) {
          paras.unshift(lk);
          hasNew = true;
        }
      }
      if (hasNew) {
        parsed.recipientsHeader = kgResult.formattedText;
        parsed.bodyParagraphs = paras;
      }
    }
    setDoc(parsed);
  }, [normalizedText, agencySettings, selectedType.category, selectedType.name, externalDoc]);

  // Section toggle state (accordions)
  const [openSection1, setOpenSection1] = useState(true); // Đầu văn bản
  const [openSection2, setOpenSection2] = useState(true); // Nội dung văn bản
  const [openSection3, setOpenSection3] = useState(true); // Nơi nhận & Chữ ký
  const [openSection4, setOpenSection4] = useState(true); // Phụ lục văn bản (sau Nơi nhận & Chữ ký)

  // Chế độ soạn thảo tách biệt cho từng phần (Yêu cầu 3: Đầu, Thân, Cuối văn bản)
  const [section1Mode, setSection1Mode] = useState<'form' | 'free'>('form');
  const [section3Mode, setSection3Mode] = useState<'form' | 'free'>('form');
  const [section1FreeText, setSection1FreeText] = useState('');
  const [section3FreeText, setSection3FreeText] = useState('');

  const generateSection1FreeText = (d: StructuredDoc) => {
    const lines: string[] = [];
    if (d.parentAgency) lines.push(d.parentAgency);
    if (d.agencyName) lines.push(d.agencyName);
    if (d.docCode) lines.push(d.docCode);
    if (d.docSubjectShort) lines.push(d.docSubjectShort);
    if (!d.isPartyDoc) {
      lines.push(d.countryHeader || 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      lines.push(d.motto || 'Độc lập - Tự do - Hạnh phúc');
    } else {
      lines.push(d.motto || 'ĐẢNG CỘNG SẢN VIỆT NAM');
    }
    if (d.locationDate) lines.push(d.locationDate);
    if (d.docTypeName && d.docTypeName !== 'CÔNG VĂN') {
      lines.push(d.docTypeName);
      if (d.docTitle) lines.push(d.docTitle);
    }
    if (d.recipientsHeader) {
      lines.push('Kính gửi:');
      lines.push(d.recipientsHeader);
    }
    return lines.join('\n');
  };

  const handleSwitchSection1Mode = (mode: 'form' | 'free') => {
    if (mode === 'free') {
      setSection1FreeText(generateSection1FreeText(doc));
    }
    setSection1Mode(mode);
  };

  const generateSection3FreeText = (d: StructuredDoc) => {
    const lines: string[] = [];
    if (d.recipients && d.recipients.length > 0) {
      lines.push('Nơi nhận:');
      d.recipients.forEach(r => lines.push(r.startsWith('-') ? r : `- ${r}`));
    }
    const auth = (d.signerAuthority || d.quyenHanKy || '').trim();
    const role2 = (d.signerRoleLine2 || '').trim();
    const title = (d.signerTitle || '').trim();
    if (role2 && auth && title) {
      lines.push(auth);
      lines.push(role2);
      lines.push(title);
    } else if (auth && title && auth === title) {
      lines.push(title);
    } else {
      if (auth) lines.push(auth);
      if (title) lines.push(title);
    }
    lines.push(''); // Cách thêm 1 dòng đối với chức danh
    if (d.signerName) lines.push(d.signerName);
    return lines.join('\n');
  };

  const handleSwitchSection3Mode = (mode: 'form' | 'free') => {
    if (mode === 'free') {
      setSection3FreeText(generateSection3FreeText(doc));
    }
    setSection3Mode(mode);
  };

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

  // Xử lý soạn thảo tự do Cuối văn bản (Nơi nhận & Chữ ký)
  const handleSection3FreeTextChange = (val: string) => {
    const rawLines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length === 0) {
      commitDocChanges({
        ...doc,
        recipients: [],
        signerName: '',
      });
      return;
    }

    const recs: string[] = [];
    const sigLines: string[] = [];
    let inRecipients = false;

    // Danh mục từ khóa chức danh chữ ký độc lập
    const exactIsolatedSigRegex = /^(?:KT\.\s*CHỦ\s*TỊCH|TM\.\s*ỦY\s*BAN\s*NHÂN\s*DÂN|T\/M\s*CHI\s*BỘ|KT\.|TM\.|T\/M|Q\.|TL\.|TUQ\.|T\.UQ|CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|PHÓ\s*CHỦ\s*TỊCH|QUYỀN\s*CHỦ\s*TỊCH|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|PHÓ\s*TRƯỞNG\s*PHÒNG|HIỆU\s*TRƯỞNG)$/i;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (/^Nơi nhận:?/i.test(line)) {
        inRecipients = true;
        const stripped = line.replace(/^Nơi nhận:?\s*/i, '').trim();
        if (stripped) {
          recs.push(stripped);
        }
        continue;
      }

      const lineClean = line.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim();
      if (!lineClean) continue;

      // KIỂM TRA ĐẶC BIỆT: Dòng người nhận công vụ hợp lệ (ví dụ: Chủ tịch, các Phó Chủ tịch UBND phường (để b/c);)
      // TUYỆT ĐỐI không bao giờ bị nhận nhầm sang khối Chữ ký
      const isOfficialRecipientLine = line.trim().startsWith('-') ||
        /\(để\s*(?:b\/c|báo\s*cáo|chỉ\s*đạo|phối\s*hợp|thực\s*hiện|t\/h|biết|theo\s*dõi)\)/i.test(lineClean) ||
        /\bđể\s*(?:b\/c|báo\s*cáo|chỉ\s*đạo)\b/i.test(lineClean) ||
        /\b(?:các\s*Phó\s*Chủ\s*tịch|các\s*PCT|Chủ\s*tịch,\s*các|Chủ\s*tịch\s*và\s*các)\b/i.test(lineClean) ||
        /\b(?:UBND|HĐND|Đảng\s*ủy|Chi\s*bộ|Thường\s*trực)\b/i.test(lineClean) ||
        lineClean.endsWith(';');

      const isSigKeyword = exactIsolatedSigRegex.test(lineClean) ||
        (/^(?:KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ)\b/i.test(lineClean) && !isOfficialRecipientLine);
      const isLeaderPersonName = (/^[A-ZĐÀ-Ỹ][a-zđà-ỹ]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ]+){1,4}$/.test(lineClean) || /^[A-ZĐÀ-Ỹ\s]{3,35}$/.test(lineClean)) &&
        !/^(?:Như|Lưu|Phòng|Ban|Sở|Bộ|UBND|HĐND|Ủy\s*ban|Thường\s*trực|Chi\s*bộ|Đảng\s*ủy|Đảng\s*bộ|Hội\s*đồng|Công\s*an|Quân\s*sự|Y\s*tế|Đoàn|Hội|Tổ|Đồng\s*chí|Đ\/c|Các|Chủ\s*tịch|Phó\s*chủ\s*tịch)\b/i.test(lineClean);

      if (isOfficialRecipientLine) {
        recs.push(line);
      } else if (isSigKeyword || isLeaderPersonName) {
        inRecipients = false;
        sigLines.push(lineClean);
      } else if (inRecipients || (line.startsWith('-') && sigLines.length === 0)) {
        recs.push(line);
      } else {
        sigLines.push(lineClean);
      }
    }

    let parsedQuyenHan = doc.quyenHanKy || '';
    let parsedAuth = doc.signerAuthority || '';
    let parsedRole2 = doc.signerRoleLine2 || '';
    let parsedTitle = doc.signerTitle || '';
    let parsedName = doc.signerName || '';

    if (sigLines.length === 1) {
      if (/^[A-ZĐÀ-Ỹ][a-zđà-ỹ]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ]+){1,5}$/.test(sigLines[0])) {
        parsedName = sigLines[0];
      } else {
        parsedTitle = sigLines[0];
      }
    } else if (sigLines.length >= 2) {
      parsedName = sigLines[sigLines.length - 1];
      const titles = sigLines.slice(0, sigLines.length - 1);

      if (titles.length === 1) {
        parsedTitle = titles[0];
        parsedRole2 = '';
        if (/^(?:TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ)/i.test(titles[0])) {
          parsedQuyenHan = titles[0].split(/\s+/)[0];
          parsedAuth = titles[0];
        }
      } else if (titles.length === 2) {
        parsedAuth = titles[0];
        parsedRole2 = '';
        parsedTitle = titles[1];
        if (/^(?:TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ)/i.test(titles[0])) {
          parsedQuyenHan = titles[0].split(/\s+/)[0];
        }
      } else if (titles.length >= 3) {
        // Có 3 dòng vai trò ký: Dòng 1 = Tập thể/Thẩm quyền, Dòng 2 = Ký thay/Lãnh đạo, Dòng 3 = Chức vụ người ký
        parsedAuth = titles[0];
        parsedRole2 = titles[1];
        parsedTitle = titles.slice(2).join(' ');
        if (/^(?:TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ)/i.test(titles[0])) {
          parsedQuyenHan = titles[0].split(/\s+/)[0];
        }
      }
    }

    // Luôn đặt isUserManualEdit = true khi xử lý phần sửa tay của người dùng để bảo toàn 100% người nhận
    const sanitizedRecs = cleanAndDeduplicateRecipients(recs, {
      signerName: parsedName,
      signerTitle: parsedTitle,
      signerRoleLine2: parsedRole2,
      signerAuthority: parsedAuth,
      quyenHanKy: parsedQuyenHan
    }, true);

    const updated: StructuredDoc = {
      ...doc,
      recipients: sanitizedRecs.length > 0 ? sanitizedRecs : doc.recipients,
      quyenHanKy: parsedQuyenHan || doc.quyenHanKy,
      signerAuthority: parsedAuth || doc.signerAuthority,
      signerRoleLine2: parsedRole2,
      signerTitle: parsedTitle || doc.signerTitle,
      signerName: parsedName,
    };

    if (recs.length > 0) {
      setNoiNhanText(recs.join('\n'));
    }
    commitDocChanges(updated);
  };

  // Sửa lỗi chính tả từ chỗ tô vàng (dùng ranh giới từ tiếng Việt an toàn)
  const handleApplySpellingFix = (wrong: string, right: string) => {
    const newText = fixSingleSpellingMatch(normalizedText, wrong, right);
    onUpdateText(newText);
    setActiveFix(null);
    setFixNotice(`Đã sửa "${wrong}" ➔ "${right}" thành công!`);
    setTimeout(() => setFixNotice(null), 2500);
  };

  // Xóa bỏ đoạn văn bản thừa / lặp lại / thiếu tính logic
  const handleDeleteIllogicalSnippet = (target: string) => {
    const currentFullText = normalizedText;
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:\\r?\\n)?\\s*${escaped}\\s*(?:\\r?\\n)?`, 'gi');
    const newText = currentFullText.replace(regex, '\n').replace(/\n{3,}/g, '\n\n').trim();

    // Đồng bộ lập tức vào bodyParagraphs của doc để Live Preview cập nhật tức thì
    const updatedParas = doc.bodyParagraphs
      .map(p => p.replace(new RegExp(escaped, 'gi'), '').trim())
      .filter(p => p.length > 0);
    const updatedDoc = { ...doc, bodyParagraphs: updatedParas };
    isInternalUpdateRef.current = true;
    setDoc(updatedDoc);
    if (onUpdateDoc) onUpdateDoc(updatedDoc);

    onUpdateText(newText);
    setActiveFix(null);
    setFixNotice(`Đã xóa bỏ đoạn thừa: "${target.substring(0, 30)}..."!`);
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

  const isCongVan = isCongVanDocument(doc, selectedType);
  const sigCheck = useMemo(() => checkSignatureLines(doc), [doc.signerAuthority, doc.quyenHanKy, doc.signerTitle]);

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
            
            {/* Chuyển đổi Form chi tiết vs Soạn thảo tự do Đầu văn bản (Yêu cầu 3) */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Chế độ chỉnh sửa Đầu văn bản (Tổng 16cm: Cột trái 6,2cm, Cột phải 9,8cm):</span>
              </div>
              <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSwitchSection1Mode('form')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    section1Mode === 'form'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Form chi tiết (16cm)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSection1Mode('free')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    section1Mode === 'free'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Soạn thảo tự do</span>
                </button>
              </div>
            </div>

            {section1Mode === 'free' ? (
              /* SOẠN THẢO TỰ DO ĐẦU VĂN BẢN */
              <div className="space-y-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs font-serif">
                    Soạn thảo tự do phần Đầu văn bản (Cơ quan, Số hiệu, Quốc hiệu, Tiêu ngữ, Địa danh, Trích yếu, Kính gửi):
                  </span>
                  <span className="text-[10px] text-blue-700 italic">
                    Tự động đồng bộ sang Live Preview A4 và file Word
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={section1FreeText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSection1FreeText(val);
                    const parsedHeader = parseDocumentStructure(val, agencySettings, selectedType.category, selectedType.name);
                    const updated = {
                      ...doc,
                      agencyName: parsedHeader.agencyName || doc.agencyName,
                      parentAgency: parsedHeader.parentAgency !== undefined ? parsedHeader.parentAgency : doc.parentAgency,
                      docCode: parsedHeader.docCode || doc.docCode,
                      locationDate: parsedHeader.locationDate || doc.locationDate,
                      docTypeName: parsedHeader.docTypeName || doc.docTypeName,
                      docTitle: parsedHeader.docTitle || doc.docTitle,
                      docSubjectShort: parsedHeader.docSubjectShort || doc.docSubjectShort,
                      recipientsHeader: parsedHeader.recipientsHeader || doc.recipientsHeader,
                    };
                    commitDocChanges(updated);
                  }}
                  style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
                  placeholder="Dán hoặc gõ nội dung đầu văn bản tự do..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-[13px] leading-relaxed text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Mỗi thành phần cách nhau bởi dấu xuống dòng (Enter).</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSection1FreeText(generateSection1FreeText(doc));
                      setFixNotice('Đã đồng bộ lại nội dung Đầu văn bản!');
                      setTimeout(() => setFixNotice(null), 2000);
                    }}
                    className="text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer"
                  >
                    Nạp lại từ cấu trúc hiện tại
                  </button>
                </div>
              </div>
            ) : (
              /* FORM NHẬP LIỆU CHI TIẾT ĐẦU VĂN BẢN */
              <>
                {/* CẢNH BÁO SAI LỆCH CƠ QUAN BAN HÀNH (HIỂN THỊ TO & RÕ RÀNG) */}
                {agencySettings.agencyName && doc.agencyName && !doc.agencyName.toLowerCase().includes(agencySettings.agencyName.toLowerCase()) && !agencySettings.agencyName.toLowerCase().includes(doc.agencyName.toLowerCase()) && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-500 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-950 font-sans shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs shrink-0 mt-0.5 animate-pulse">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full border border-amber-300">
                            ⚠️ CẢNH BÁO ĐỒNG BỘ CÀI ĐẶT
                          </span>
                          <span className="font-bold text-slate-900">
                            Cơ quan trong văn bản khác Cài đặt mặc định
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span>Văn bản: <strong className="font-serif text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">"{doc.agencyName}"</strong></span>
                          <span>➔ Cài đặt: <strong className="font-serif text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">"{agencySettings.agencyName}"</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
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
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-black shrink-0 cursor-pointer transition-all shadow-xs flex items-center gap-1.5 hover:scale-105 active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>⚡ Đồng bộ theo Cài đặt</span>
                      </button>
                    </div>
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

                {/* Hiển thị Tiêu đề Quốc ngữ / Tiêu đề Đảng (Tổng 16.2cm: Cột trái 6.5cm - Cột phải 9.7cm) */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-xs font-serif flex items-center gap-1.5">
                      <span>Bố cục Tiêu đề chuẩn thể thức 16.2cm (Cột trái 6.5cm - Cột phải 9.7cm):</span>
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
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM (Cỡ 12-13pt, in hoa, đậm, căn giữa, 1 dòng)
                        </div>
                        <div className="font-bold text-xs text-blue-900 mt-1 font-serif">
                          <span className="inline-block border-b-[1.2px] border-blue-900 pb-0.5">
                            Độc lập - Tự do - Hạnh phúc (Cỡ 13-14pt, đậm, căn giữa, 1 dòng)
                          </span>
                        </div>
                        <div className="text-[11px] text-blue-700 mt-1">
                          ✓ Chuẩn Nghị định 30/2020/NĐ-CP • Tổng 16.2cm (Cột trái 6.5cm - Cột phải 9.7cm) • Phía dưới Tiêu ngữ có đường kẻ ngang, nét liền, có độ dài bằng đúng độ dài của dòng chữ Độc lập - Tự do - Hạnh phúc
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-300">
                        Cột phải 9.7cm
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

                {/* VỊ TRÍ ĐÚNG THEO NGHỊ ĐỊNH 30 CHO CÔNG VĂN: Ô SỐ 5b NẰM Ở Ô BÊN TRÁI, DÒNG DƯỚI SỐ KÝ HIỆU VĂN BẢN */}
                {isCongVan && (
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-blue-950 block text-xs flex items-center gap-1.5 font-sans">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>Trích yếu công văn (Ô số 5b - Ô bên trái, dòng dưới Số ký hiệu):</span>
                      </label>
                      <span className="text-[10px] text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-bold border border-blue-300">
                        Cỡ 12–13, chữ đứng, không in đậm
                      </span>
                    </div>
                    <input
                      type="text"
                      value={doc.docSubjectShort || (doc.docTitle?.startsWith('V/v') ? doc.docTitle : (doc.docTitle ? `V/v ${doc.docTitle}` : ''))}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (/^Về việc\s+/i.test(val)) {
                          val = val.replace(/^Về việc\s+/i, 'V/v ');
                        }
                        updateDocField('docSubjectShort', val);
                        if (doc.docTitle) {
                          updateDocField('docTitle', '');
                        }
                      }}
                      placeholder="Ví dụ: V/v tăng cường công tác phòng cháy, chữa cháy và cứu nạn, cứu hộ"
                      className="w-full p-2.5 rounded-lg border border-blue-300 bg-white font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                    />
                    <p className="text-[10px] text-blue-800 mt-1 italic leading-relaxed">
                      ✓ Chuẩn Nghị định 30/2020/NĐ-CP (Ô số 5b): Vị trí ở <strong>ô bên trái, ngay dòng dưới Số ký hiệu văn bản</strong> (ô số 3), căn giữa trong khối 6,5cm. Bắt đầu bằng "V/v", chữ thường, kích thước 12–13, kiểu chữ đứng, không in đậm, kết thúc KHÔNG có dấu gạch ngang.
                    </p>
                  </div>
                )}
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
                  <p className="text-[10px] text-slate-500 mt-0.5 italic">
                    Cỡ 13-14, chữ nghiêng, căn giữa cột phải 9.5-9.7cm, ngang hàng với Số ký hiệu văn bản.
                  </p>
                </div>

                {isCongVan ? (
                  /* THÔNG BÁO THỂ THỨC RIÊNG CHO CÔNG VĂN: KHÔNG CÓ TÊN LOẠI Ở GIỮA TRANG */
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="text-emerald-600">✓</span>
                      <span>Thể thức Công văn hành chính (Nghị định 30):</span>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 list-disc">
                      <li>Công văn <strong>không ghi tên loại</strong> "CÔNG VĂN" ở giữa trang.</li>
                      <li>Trích yếu nội dung (ô 5b) đã được đặt <strong>ở ô bên trái, dòng dưới số ký hiệu văn bản</strong>.</li>
                      <li>Sau phần đầu văn bản, công văn sẽ <strong>đi thẳng vào mục Kính gửi</strong> (ô số 6).</li>
                    </ul>
                  </div>
                ) : (
                  /* CÁC LOẠI VĂN BẢN CÓ TÊN LOẠI (Báo cáo, Kế hoạch, Quyết định, Tờ trình...) */
                  <>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Loại văn bản:
                      </label>
                      <input
                        type="text"
                        value={doc.docTypeName}
                        onChange={(e) => updateDocField('docTypeName', e.target.value.toUpperCase())}
                        placeholder="Ví dụ: QUYẾT ĐỊNH, BÁO CÁO, KẾ HOẠCH, TỜ TRÌNH..."
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 block text-xs">
                          {doc.docTypeName === 'BÁO CÁO' ? 'Tiêu đề Báo cáo (Chuẩn NĐ 30):' : 'Trích yếu nội dung (Về việc...):'}
                        </label>
                        <span className="text-[10px] text-slate-500">
                          In đậm, cỡ 13-14, căn giữa
                        </span>
                      </div>
                      <input
                        type="text"
                        value={doc.docTitle}
                        onChange={(e) => updateDocField('docTitle', e.target.value)}
                        placeholder={doc.docTypeName === 'BÁO CÁO' ? 'Ví dụ: Kết quả thực hiện nhiệm vụ công tác năm 2026...' : 'Ví dụ: Về việc ban hành Kế hoạch kiểm tra...'}
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-serif text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  </>
                )}
              </div>

            </div>

            {/* Ô nhập Kính gửi (HỖ TRỢ NHIỀU DÒNG VỚI \n, THẺ TEXTAREA & NÚT KẾT THÚC CHỐNG TRÙNG LẶP - YÊU CẦU 4) */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              {(doc.docTypeName === 'BÁO CÁO' || doc.docTypeName?.startsWith('BÁO CÁO')) && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-amber-950">Chuẩn Nghị định 30/2020/NĐ-CP: </span>
                    Báo cáo <strong>không có phần Kính gửi</strong> ở đầu văn bản. Đơn vị nhận được ghi ở mục Nơi nhận cuối văn bản.
                  </div>
                  {kinhGuiText.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        const recLines = kinhGuiText.split('\n').map(l => l.trim()).filter(Boolean);
                        const newRecs = [...(doc.recipients || [])];
                        for (const l of recLines) {
                          const clean = l.replace(/^Kính\s*(?:gửi|trình):?\s*/i, '').replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
                          if (clean) {
                            const recItem = clean.includes('(để') ? `- ${clean};` : `- ${clean} (để b/c);`;
                            newRecs.push(recItem);
                          }
                        }
                        const sanitized = cleanAndDeduplicateRecipients(newRecs, {
                          quyenHanKy: doc.quyenHanKy,
                          signerAuthority: doc.signerAuthority,
                          signerTitle: doc.signerTitle,
                          signerName: doc.signerName
                        }, true);
                        setKinhGuiText('');
                        updateDocField('recipientsHeader', '');
                        setNoiNhanText(sanitized.join('\n'));
                        updateDocField('recipients', sanitized);
                        setFixNotice('✓ Đã chuyển người nhận vào Nơi nhận (để b/c) và xóa Kính gửi theo chuẩn Báo cáo NĐ 30!');
                        setTimeout(() => setFixNotice(null), 3000);
                      }}
                      className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-2.5 py-1 rounded shadow-xs cursor-pointer"
                    >
                      Chuyển vào Nơi nhận & Xóa Kính gửi
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <label className="font-bold text-slate-800 text-xs">
                    Kính gửi (hỗ trợ nhiều dòng, kết thúc bằng dấu "."):
                  </label>
                  {isKinhGuiFinalized ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-300 flex items-center gap-1 shadow-2xs">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Đã chốt kết thúc dấu "." & khóa chống trùng lặp</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                      Chưa chốt kết thúc
                    </span>
                  )}
                  {(() => {
                    const parsed = processAndFormatKinhGui(kinhGuiText);
                    const count = parsed.recipients.length;
                    if (count === 0) return null;
                    if (count === 1) {
                      return (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                          1 nơi nhận (không gạch đầu dòng, kết thúc ".")
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                        {count} nơi nhận (mỗi cơ quan 1 dòng, có gạch đầu dòng -, dòng cuối ".")
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const result = processAndFormatKinhGui(kinhGuiText);
                      setKinhGuiText(result.formattedText);
                      updateDocField('recipientsHeader', result.formattedText);
                      
                      // Nếu phát hiện nội dung thân văn bản lọt vào Kính gửi (Thực hiện..., Căn cứ..., UBND nhận được...), chuyển lại vào Thân văn bản
                      if (result.leakedBodyLines.length > 0) {
                        const newParas = [...doc.bodyParagraphs];
                        let added = 0;
                        for (let i = result.leakedBodyLines.length - 1; i >= 0; i--) {
                          const lLine = result.leakedBodyLines[i];
                          if (!newParas.some(p => p.trim() === lLine.trim())) {
                            newParas.unshift(lLine);
                            added++;
                          }
                        }
                        if (added > 0) {
                          updateDocField('bodyParagraphs', newParas);
                        }
                        setFixNotice(`✓ Đã chuẩn hóa Kính gửi (bảo toàn đủ ${result.recipients.length} nơi nhận) và chuyển ${added} câu mở đầu ("Thực hiện...", "Căn cứ...", "UBND nhận được"...) vào Thân văn bản!`);
                        setTimeout(() => setFixNotice(null), 3500);
                        return;
                      }
                      const count = result.recipients.length;
                      const msg = count === 1
                        ? '✓ Đã chuẩn hóa 1 nơi nhận: trên 1 hàng, không gạch đầu dòng, kết thúc bằng dấu "." chuẩn NĐ 30!'
                        : `✓ Đã chuẩn hóa đầy đủ ${count} nơi nhận: mỗi cơ quan 1 dòng có gạch đầu dòng (- ), các dòng trước ";" và dòng cuối "." chuẩn NĐ 30!`;
                      setFixNotice(msg);
                      setTimeout(() => setFixNotice(null), 3000);
                    }}
                    className="text-[11px] bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-200 cursor-pointer font-medium"
                    title="Tự động nhận diện đầy đủ các nơi nhận, nếu 1 cơ quan không gạch (-), từ 2 cơ quan có gạch (-) và nơi cuối cùng kết thúc bằng dấu (.)"
                  >
                    Chuẩn hóa Kính gửi
                  </button>

                  {kinhGuiText.trim() && !kinhGuiText.trim().endsWith('.') && (
                    <button
                      type="button"
                      onClick={() => {
                        const clean = kinhGuiText.trim().replace(/[;\.]+$/, '');
                        if (clean) {
                          const next = `${clean}.`;
                          setKinhGuiText(next);
                          updateDocField('recipientsHeader', next);
                          setFixNotice('✓ Đã thêm dấu chấm (.) vào nơi nhận cuối cùng!');
                          setTimeout(() => setFixNotice(null), 2000);
                        }
                      }}
                      className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2 py-1 rounded cursor-pointer font-medium"
                      title="Thêm dấu chấm (.) vào cuối nơi nhận cuối cùng"
                    >
                      + Dấu (.) cuối
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      // 1. Nhận diện đầy đủ các nơi nhận và tách lọc ranh giới nội dung thân bài (Thực hiện..., Căn cứ..., UBND nhận được...)
                      const processed = processAndFormatKinhGui(kinhGuiText);

                      if (processed.recipients.length === 0 && processed.leakedBodyLines.length === 0) {
                        setIsKinhGuiFinalized(true);
                        setFixNotice('Đã xác nhận văn bản không có phần Kính gửi!');
                        setTimeout(() => setFixNotice(null), 2500);
                        return;
                      }

                      // NGUYÊN TẮC VÀNG: TUYỆT ĐỐI KHÔNG TỰ Ý BỎ ĐI BẤT KỲ NƠI GỬI NÀO NGƯỜI DÙNG ĐÃ PASTE HOẶC NHẬP VÀO
                      const cleanedItems: string[] = [...processed.recipients];

                      let formattedLines: string[] = [];
                      if (cleanedItems.length === 1) {
                        // 1 nơi nhận: đặt trên 1 hàng, TUYỆT ĐỐI KHÔNG có dấu gạch (-), kết thúc bằng dấu chấm (.)
                        formattedLines = [`${cleanedItems[0]}.`];
                      } else if (cleanedItems.length > 1) {
                        // Nhiều nơi nhận: mỗi nơi nhận 1 dòng có gạch đầu dòng (- ), các dòng trước dấu chấm phẩy (;), dòng cuối cùng kết thúc bằng dấu chấm (.)
                        formattedLines = cleanedItems.map((item, idx) => {
                          const isLast = idx === cleanedItems.length - 1;
                          return `- ${item}${isLast ? '.' : ';'}`;
                        });
                      }

                      const finalKinhGuiStr = formattedLines.join('\n');
                      setKinhGuiText(finalKinhGuiStr);

                      // 2. Lọc sạch triệt để các dòng Kính gửi trùng lặp khỏi bodyParagraphs
                      // Lưu ý: Nếu dòng đó là bắt đầu nội dung chính (isDocumentBodyStart, Thực hiện..., Căn cứ..., UBND nhận được...), TUYỆT ĐỐI KHÔNG lọc bỏ!
                      const currentParas = [...doc.bodyParagraphs];
                      const filteredParas = currentParas.filter(p => {
                        const pTrim = p.trim();
                        if (!pTrim) return false;
                        if (isKinhGuiBodyLeakLine(pTrim)) return true;
                        if (isDocumentBodyStart(pTrim)) return true;
                        if (/^Kính\s*(?:gửi|trình):?/i.test(pTrim)) return false;
                        for (const item of cleanedItems) {
                          if (pTrim === item || pTrim === `- ${item}` || pTrim === `- ${item};` || pTrim === `- ${item}.`) {
                            return false;
                          }
                          const pNoDash = pTrim.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
                          if (pNoDash && pNoDash.toLowerCase() === item.toLowerCase()) {
                            return false;
                          }
                        }
                        return true;
                      });

                      // Đảm bảo đưa các đoạn ranh giới thân bài (Thực hiện..., Căn cứ..., UBND nhận được...) trở lại thân văn bản
                      if (processed.leakedBodyLines.length > 0) {
                        for (let i = processed.leakedBodyLines.length - 1; i >= 0; i--) {
                          const leaked = processed.leakedBodyLines[i];
                          if (!filteredParas.some(p => p.trim() === leaked.trim())) {
                            filteredParas.unshift(leaked);
                          }
                        }
                      }

                      const updatedDoc: StructuredDoc = {
                        ...doc,
                        recipientsHeader: finalKinhGuiStr,
                        bodyParagraphs: filteredParas
                      };

                      commitDocChanges(updatedDoc);
                      setIsKinhGuiFinalized(true);
                      const noticeMsg = processed.leakedBodyLines.length > 0
                        ? `✓ Đã chốt Kính gửi (đủ ${cleanedItems.length} nơi nhận, kết thúc dấu "."), chuyển ${processed.leakedBodyLines.length} câu mở đầu vào Thân văn bản và khóa chống trùng lặp!`
                        : `✓ Đã chốt Kính gửi: bảo toàn đầy đủ ${cleanedItems.length} nơi nhận theo chuẩn NĐ 30, kết thúc bằng dấu "." và khóa chống trùng lặp!`;
                      setFixNotice(noticeMsg);
                      setTimeout(() => setFixNotice(null), 3500);
                    }}
                    className={`text-[11px] px-3 py-1 rounded font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                      isKinhGuiFinalized
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300'
                    }`}
                    title="Hoàn tất và kết thúc phần Kính gửi bằng dấu chấm (.), tự động khóa chặn không cho trùng lặp nội dung văn bản chính"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isKinhGuiFinalized ? '✓ Đã hoàn tất Kính gửi (Bấm để chốt lại)' : 'Kết thúc & Khóa Kính gửi (dấu .)'}</span>
                  </button>

                  {isKinhGuiFinalized && (
                    <button
                      type="button"
                      onClick={() => setIsKinhGuiFinalized(false)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Mở sửa lại
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={Math.max(3, Math.min(8, (kinhGuiText.split('\n').length || 1) + 1))}
                value={kinhGuiText}
                readOnly={isKinhGuiFinalized}
                onChange={(e) => {
                  const val = e.target.value.normalize('NFC');
                  setKinhGuiText(val);
                  updateDocField('recipientsHeader', val);
                  if (isKinhGuiFinalized) setIsKinhGuiFinalized(false);
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
                  
                  // Nhận diện thông minh ranh giới nội dung chính và nơi nhận chuẩn Nghị định 30
                  const processed = processAndFormatKinhGui(next);
                  
                  // NGUYÊN TẮC VÀNG: Bảo toàn 100% tất cả các nơi gửi người dùng đã paste vào
                  setKinhGuiText(processed.formattedText);
                  updateDocField('recipientsHeader', processed.formattedText);

                  if (processed.leakedBodyLines.length > 0) {
                    const newParas = [...doc.bodyParagraphs];
                    let added = 0;
                    for (let i = processed.leakedBodyLines.length - 1; i >= 0; i--) {
                      const lk = processed.leakedBodyLines[i];
                      if (!newParas.some(p => p.trim() === lk.trim())) {
                        newParas.unshift(lk);
                        added++;
                      }
                    }
                    if (added > 0) {
                      updateDocField('bodyParagraphs', newParas);
                    }
                    setFixNotice(`✓ Đã nhận diện đầy đủ ${processed.recipients.length} nơi nhận chuẩn NĐ 30 và chuyển ${processed.leakedBodyLines.length} câu nội dung thân bài vào Thân văn bản!`);
                    setTimeout(() => setFixNotice(null), 3500);
                  } else {
                    const count = processed.recipients.length;
                    const msg = count === 1
                      ? '✓ Đã nhận diện 1 nơi nhận: không gạch đầu dòng, kết thúc bằng dấu "." chuẩn NĐ 30!'
                      : `✓ Đã nhận diện đầy đủ ${count} nơi nhận: tự động thêm gạch đầu dòng (- ), các dòng kết thúc bằng ";" và dòng cuối kết thúc bằng "." chuẩn NĐ 30!`;
                    setFixNotice(msg);
                    setTimeout(() => setFixNotice(null), 3000);
                  }
                  if (isKinhGuiFinalized) setIsKinhGuiFinalized(false);
                }}
                placeholder="Ví dụ 1 nơi: Ủy ban nhân dân thị xã Bỉm Sơn.&#10;Ví dụ nhiều nơi:&#10;- Sở Nội vụ;&#10;- Sở Tài chính;&#10;- UBND các huyện, thị xã, thành phố."
                className={`w-full p-2.5 rounded-lg border font-serif text-xs text-slate-900 focus:outline-none transition-colors ${
                  isKinhGuiFinalized 
                    ? 'bg-emerald-50/40 border-emerald-300' 
                    : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 italic">
                <span>
                  ✓ Quy định NĐ 30: Nơi cuối cùng kết thúc bằng dấu <strong>"."</strong>. Gửi 1 nơi: ghi trên cùng dòng "Kính gửi:", không gạch đầu dòng, kết thúc <strong>"."</strong>; gửi nhiều nơi: mỗi cơ quan 1 dòng có gạch đầu dòng <strong>"- "</strong>, các dòng trước <strong>";"</strong>, dòng cuối <strong>"."</strong>.
                </span>
                <span className="text-emerald-700 font-semibold not-italic">
                  Bảo toàn 100% nơi nhận paste vào • Tự động nhận diện ranh giới "Thực hiện", "Căn cứ", "UBND nhận được"...
                </span>
              </div>
            </div>
          </>
        )}
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

                            {(() => {
                              const isDeletionProposal = !activeFix.suggestion || 
                                activeFix.suggestion.toLowerCase().includes('xóa bỏ') || 
                                activeFix.suggestion.toLowerCase().includes('xóa căn cứ') || 
                                (activeFix.proposal && (!activeFix.proposal.right || activeFix.proposal.right.trim() === ''));

                              return (
                                <>
                                  <div className="text-xs">
                                    <span className="text-slate-600">Đề xuất xử lý: </span>
                                    <strong className="text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300 font-serif">
                                      {isDeletionProposal ? 'Xóa bỏ đoạn thừa / lặp lại này' : activeFix.suggestion}
                                    </strong>
                                  </div>

                                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-amber-300">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (activeFix.proposal && onAcceptProposal) {
                                          onAcceptProposal(activeFix.proposal);
                                        } else if (activeFix.suggestion && !isDeletionProposal) {
                                          handleApplyIllogicalFix(activeFix.target, activeFix.suggestion);
                                        } else {
                                          handleDeleteIllogicalSnippet(activeFix.target);
                                        }
                                        setActiveFix(null);
                                      }}
                                      className={`px-3.5 py-1.5 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs ${
                                        isDeletionProposal 
                                          ? 'bg-rose-600 hover:bg-rose-700' 
                                          : 'bg-emerald-600 hover:bg-emerald-700'
                                      }`}
                                      title={isDeletionProposal ? 'Đồng ý xóa đoạn thừa này khỏi văn bản' : 'Đồng ý sửa đoạn này theo đề xuất chuẩn mực'}
                                    >
                                      {isDeletionProposal ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                      <span>{isDeletionProposal ? 'Đồng ý xóa' : 'Đồng ý sửa'}</span>
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
                                      title="Bỏ qua đề xuất, giữ nguyên 100% nội dung gốc"
                                    >
                                      <span>{isDeletionProposal ? 'Giữ lại (Không xóa)' : 'Bỏ qua'}</span>
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
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
            
            {/* Chuyển đổi Form chi tiết vs Soạn thảo tự do Cuối văn bản (Yêu cầu 3) */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Chế độ chỉnh sửa Cuối văn bản (Nơi nhận & Chữ ký):</span>
              </div>
              <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSwitchSection3Mode('form')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    section3Mode === 'form'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Form chi tiết (2 cột)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSection3Mode('free')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    section3Mode === 'free'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Soạn thảo tự do</span>
                </button>
              </div>
            </div>

            {section3Mode === 'free' ? (
              /* SOẠN THẢO TỰ DO CUỐI VĂN BẢN */
              <div className="space-y-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs font-serif">
                    Soạn thảo tự do phần Cuối văn bản (Nơi nhận, Thẩm quyền ký, Chức vụ và Họ tên người ký):
                  </span>
                  <span className="text-[10px] text-emerald-700 italic">
                    Tự động đồng bộ sang Live Preview A4 và file Word
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={section3FreeText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSection3FreeText(val);
                    handleSection3FreeTextChange(val);
                  }}
                  style={{ fontFamily: "'Times New Roman', Times, 'Tinos', serif" }}
                  placeholder="Dán hoặc gõ nội dung cuối văn bản tự do (Nơi nhận, TM/KT, Chức vụ, Họ tên)..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-[13px] leading-relaxed text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Mỗi thành phần cách nhau bởi dấu xuống dòng (Enter). Cách thêm 1 dòng đối với chức danh.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSection3FreeText(generateSection3FreeText(doc));
                      setFixNotice('Đã đồng bộ lại nội dung Cuối văn bản!');
                      setTimeout(() => setFixNotice(null), 2000);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer"
                  >
                    Nạp lại từ cấu trúc hiện tại
                  </button>
                </div>
              </div>
            ) : (
              /* FORM NHẬP LIỆU CHI TIẾT CUỐI VĂN BẢN */
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
                    }, true);
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
                    }, true);
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

              {/* Cột 2: Quyền hạn ký, chức vụ & chữ ký (HỖ TRỢ CẢ 2 DÒNG VÀ 3 DÒNG VAI TRÒ KÝ CHUẨN NGHỊ ĐỊNH 30 & HD 05) */}
              <div className="space-y-3">
                
                {/* DÒNG 1: QUYỀN HẠN KÝ & CHỨC VỤ NGƯỜI KÝ */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                      <span>Vai trò & Chức vụ ký ({hasThreeSignerLines ? '3 dòng vai trò ký' : '2 dòng vai trò ký'})</span>
                    </label>

                    {/* Bộ chọn số dòng vai trò ký: 2 dòng vs 3 dòng */}
                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setHasThreeSignerLines(false);
                          updateDocField('signerRoleLine2', '');
                        }}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          !hasThreeSignerLines
                            ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        2 dòng vai trò
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHasThreeSignerLines(true);
                          if (!doc.signerRoleLine2) {
                            if (/TM/i.test(doc.signerAuthority || doc.quyenHanKy)) {
                              updateDocField('signerRoleLine2', 'KT. CHỦ TỊCH');
                              if (!doc.signerTitle || doc.signerTitle === 'CHỦ TỊCH') {
                                updateDocField('signerTitle', 'PHÓ CHỦ TỊCH');
                              }
                            } else {
                              updateDocField('signerRoleLine2', 'KT. CHỦ TỊCH');
                            }
                          }
                        }}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                          hasThreeSignerLines
                            ? 'bg-rose-700 text-white shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>3 dòng vai trò (TM. tập thể)</span>
                      </button>
                    </div>
                  </div>

                  {/* Nút chọn nhanh Quyền hạn & Thẩm quyền ký (Theo yêu cầu: TM. UBND / TM. BTV / TM. BCH) */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                      <span>Chọn nhanh thẩm quyền ký:</span>
                      <span className="text-[10px] text-rose-700 font-semibold italic">Thay mặt tập thể / Ký thay</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {/* Nút 1: TM. ỦY BAN NHÂN DÂN */}
                      <button
                        type="button"
                        onClick={() => {
                          const ubndName = agencySettings.agencyName
                            ? `TM. ${agencySettings.agencyName.replace(/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)\s*/i, 'ỦY BAN NHÂN DÂN ')}`
                            : (doc.agencyName ? `TM. ${doc.agencyName.replace(/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)\s*/i, 'ỦY BAN NHÂN DÂN ')}` : 'TM. ỦY BAN NHÂN DÂN');
                          updateDocField('quyenHanKy', 'TM.');
                          updateDocField('signerAuthority', ubndName.trim());
                          if (hasThreeSignerLines) {
                            updateDocField('signerRoleLine2', 'KT. CHỦ TỊCH');
                            updateDocField('signerTitle', 'PHÓ CHỦ TỊCH');
                          } else {
                            updateDocField('signerRoleLine2', '');
                            updateDocField('signerTitle', 'CHỦ TỊCH');
                          }
                          setFixNotice(`✓ Đã nạp thẩm quyền: "${ubndName}"`);
                          setTimeout(() => setFixNotice(null), 2500);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border ${
                          (doc.signerAuthority?.includes('TM. ỦY BAN NHÂN DÂN') || doc.signerAuthority?.includes('TM. UBND'))
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-400 ring-offset-1'
                            : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                        }`}
                        title="Thay mặt Ủy ban nhân dân (Chọn 3 dòng sẽ có: TM. UBND -> KT. CHỦ TỊCH -> PHÓ CHỦ TỊCH)"
                      >
                        🏛️ TM. ỦY BAN NHÂN DÂN
                      </button>

                      {/* Nút 2: TM. BAN THƯỜNG VỤ */}
                      <button
                        type="button"
                        onClick={() => {
                          updateDocField('quyenHanKy', 'TM.');
                          updateDocField('signerAuthority', 'TM. BAN THƯỜNG VỤ');
                          if (hasThreeSignerLines) {
                            updateDocField('signerRoleLine2', 'KT. BÍ THƯ');
                            updateDocField('signerTitle', 'PHÓ BÍ THƯ');
                          } else {
                            updateDocField('signerRoleLine2', '');
                            updateDocField('signerTitle', 'BÍ THƯ');
                          }
                          setFixNotice('✓ Đã nạp thẩm quyền: "TM. BAN THƯỜNG VỤ"');
                          setTimeout(() => setFixNotice(null), 2500);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border ${
                          doc.signerAuthority === 'TM. BAN THƯỜNG VỤ'
                            ? 'bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-400 ring-offset-1'
                            : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                        }`}
                        title="Thay mặt Ban Thường vụ (Chọn 3 dòng sẽ có: TM. BAN THƯỜNG VỤ -> KT. BÍ THƯ -> PHÓ BÍ THƯ)"
                      >
                        🚩 TM. BAN THƯỜNG VỤ
                      </button>

                      {/* Nút 3: TM. BAN CHẤP HÀNH */}
                      <button
                        type="button"
                        onClick={() => {
                          updateDocField('quyenHanKy', 'TM.');
                          updateDocField('signerAuthority', 'TM. BAN CHẤP HÀNH');
                          if (hasThreeSignerLines) {
                            updateDocField('signerRoleLine2', 'T/M BAN THƯỜNG VỤ');
                            updateDocField('signerTitle', 'BÍ THƯ');
                          } else {
                            updateDocField('signerRoleLine2', '');
                            updateDocField('signerTitle', 'BÍ THƯ');
                          }
                          setFixNotice('✓ Đã nạp thẩm quyền: "TM. BAN CHẤP HÀNH"');
                          setTimeout(() => setFixNotice(null), 2500);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border ${
                          doc.signerAuthority === 'TM. BAN CHẤP HÀNH'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400 ring-offset-1'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                        title="Thay mặt Ban Chấp hành (Chọn 3 dòng sẽ có: TM. BAN CHẤP HÀNH -> T/M BAN THƯỜNG VỤ -> BÍ THƯ)"
                      >
                        ★ TM. BAN CHẤP HÀNH
                      </button>

                      {/* Nút 4: KT. CHỦ TỊCH (Phó Chủ tịch) */}
                      <button
                        type="button"
                        onClick={() => {
                          updateDocField('quyenHanKy', 'KT. CHỦ TỊCH');
                          updateDocField('signerAuthority', 'KT. CHỦ TỊCH');
                          updateDocField('signerRoleLine2', '');
                          if (!doc.signerTitle || doc.signerTitle === 'CHỦ TỊCH') {
                            updateDocField('signerTitle', 'PHÓ CHỦ TỊCH');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border ${
                          (doc.quyenHanKy === 'KT. CHỦ TỊCH' || doc.signerAuthority === 'KT. CHỦ TỊCH') && !doc.signerRoleLine2
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-400 ring-offset-1'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        KT. CHỦ TỊCH
                      </button>

                      {/* Nút 5: T/M Chi bộ (Đảng) */}
                      <button
                        type="button"
                        onClick={() => {
                          updateDocField('quyenHanKy', 'T/M');
                          updateDocField('signerAuthority', 'T/M CHI BỘ');
                          updateDocField('signerRoleLine2', '');
                          updateDocField('signerTitle', 'BÍ THƯ');
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border ${
                          doc.signerAuthority === 'T/M CHI BỘ'
                            ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        T/M CHI BỘ
                      </button>

                      {/* Nút 6: Q. (Quyền) */}
                      <button
                        type="button"
                        onClick={() => {
                          updateDocField('quyenHanKy', 'Q.');
                          updateDocField('signerAuthority', 'Q. CHỦ TỊCH');
                          updateDocField('signerRoleLine2', '');
                          updateDocField('signerTitle', 'QUYỀN CHỦ TỊCH');
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border ${
                          doc.quyenHanKy === 'Q.'
                            ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Q. (Quyền)
                      </button>

                      {/* Nút 7: Ký trực tiếp */}
                      <button
                        type="button"
                        onClick={() => {
                          updateDocField('quyenHanKy', '');
                          updateDocField('signerAuthority', '');
                          updateDocField('signerRoleLine2', '');
                          if (!doc.signerTitle) updateDocField('signerTitle', 'CHỦ TỊCH');
                        }}
                        className={`px-2 py-1 rounded-md text-xs cursor-pointer transition-all border ${
                          !doc.quyenHanKy && !doc.signerAuthority && !doc.signerRoleLine2
                            ? 'bg-slate-700 text-white border-slate-800'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Ký trực tiếp
                      </button>
                    </div>
                  </div>

                  {/* BÔI VÀNG CẢNH BÁO NẾU PHẦN CHỮ KÝ CHỈ CÓ 1 DÒNG QUYỀN HẠN HOẶC CHỨC VỤ KÝ */}
                  {sigCheck.isSingleLine && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-400 rounded-xl text-amber-950 text-xs flex items-start gap-2.5 animate-fade-in shadow-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1.5 flex-1">
                        <div className="font-bold flex items-center justify-between gap-1 text-amber-950">
                          <span>⚠️ Phần chữ ký hiện chỉ có 1 dòng ({sigCheck.singleLineText || 'Chưa đủ dữ liệu'})</span>
                          <span className="text-[10px] bg-amber-300/90 text-amber-950 px-2 py-0.5 rounded font-bold uppercase border border-amber-400">
                            Lưu ý bổ sung
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-900 font-sans">
                          Theo Nghị định 30/2020/NĐ-CP, khi ký thay mặt (TM.) hoặc ký thay (KT.), phần chữ ký cần có đủ 2 hoặc 3 dòng riêng biệt:
                          <br />• <strong>Dòng 1:</strong> Thẩm quyền / Thay mặt (ví dụ: <em>TM. ỦY BAN NHÂN DÂN</em> hoặc <em>KT. CHỦ TỊCH</em>)
                          <br />• <strong>Dòng 2 (khi có 3 dòng):</strong> Quyền hạn ký thay (ví dụ: <em>KT. CHỦ TỊCH</em>)
                          <br />• <strong>Dòng cuối:</strong> Chức vụ người ký (ví dụ: <em>PHÓ CHỦ TỊCH</em> hoặc <em>CHỦ TỊCH</em>)
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {/KT/i.test(sigCheck.singleLineText) && !doc.signerTitle && (
                            <button
                              type="button"
                              onClick={() => {
                                updateDocField('quyenHanKy', 'KT. CHỦ TỊCH');
                                updateDocField('signerAuthority', 'KT. CHỦ TỊCH');
                                updateDocField('signerTitle', 'PHÓ CHỦ TỊCH');
                                setFixNotice('✓ Đã bổ sung Chức vụ người ký: "PHÓ CHỦ TỊCH"');
                                setTimeout(() => setFixNotice(null), 2500);
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Bổ sung nhanh: "PHÓ CHỦ TỊCH"</span>
                            </button>
                          )}
                          {/TM/i.test(sigCheck.singleLineText) && !doc.signerTitle && (
                            <button
                              type="button"
                              onClick={() => {
                                updateDocField('signerTitle', 'CHỦ TỊCH');
                                setFixNotice('✓ Đã bổ sung Chức vụ người ký: "CHỦ TỊCH"');
                                setTimeout(() => setFixNotice(null), 2500);
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Bổ sung nhanh: "CHỦ TỊCH"</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KHUNG NHẬP LIỆU CÁC DÒNG VAI TRÒ KÝ (2 DÒNG HOẶC 3 DÒNG) */}
                  {hasThreeSignerLines ? (
                    /* CHẾ ĐỘ 3 DÒNG VAI TRÒ KÝ */
                    <div className="space-y-2 pt-1 border-t border-slate-200">
                      <div className="flex items-center justify-between text-[11px] text-rose-800 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-200">
                        <span>⭐ Đang ở chế độ 3 dòng vai trò ký (Thay mặt tập thể & Ký thay):</span>
                        <span className="text-[10px] text-slate-500 font-normal">In hoa đậm 13pt cả 3 dòng</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Dòng 1: Thẩm quyền / Thay mặt tập thể */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                            Dòng 1: Thay mặt tập thể (TM.):
                          </label>
                          <input
                            type="text"
                            value={doc.signerAuthority || doc.quyenHanKy}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              updateDocField('quyenHanKy', val.startsWith('TM') ? 'TM.' : doc.quyenHanKy);
                              updateDocField('signerAuthority', val);
                            }}
                            placeholder="Ví dụ: TM. ỦY BAN NHÂN DÂN"
                            className="w-full p-2 rounded-lg border border-slate-300 font-serif text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 bg-white"
                          />
                        </div>

                        {/* Dòng 2: Quyền hạn ký thay */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                            Dòng 2: Quyền hạn ký thay (KT./Vai trò):
                          </label>
                          <input
                            type="text"
                            value={doc.signerRoleLine2 || ''}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              updateDocField('signerRoleLine2', val);
                            }}
                            placeholder="Ví dụ: KT. CHỦ TỊCH hoặc KT. BÍ THƯ"
                            className="w-full p-2 rounded-lg border border-slate-300 font-serif text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 bg-white"
                          />
                        </div>

                        {/* Dòng 3: Chức vụ người ký trực tiếp */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                            Dòng 3: Chức vụ người ký (*):
                          </label>
                          <input
                            type="text"
                            value={doc.signerTitle}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              updateDocField('signerTitle', val);
                            }}
                            placeholder="Ví dụ: PHÓ CHỦ TỊCH hoặc PHÓ BÍ THƯ"
                            className="w-full p-2 rounded-lg border border-slate-300 font-serif text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CHẾ ĐỘ 2 DÒNG VAI TRÒ KÝ (CHUẨN THÔNG THƯỜNG) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                          Dòng 1: Quyền hạn ký:
                        </label>
                        <input
                          type="text"
                          value={doc.quyenHanKy || doc.signerAuthority}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            updateDocField('quyenHanKy', val);
                            updateDocField('signerAuthority', val);
                          }}
                          placeholder="Ví dụ: KT. CHỦ TỊCH hoặc TM. ỦY BAN NHÂN DÂN"
                          className={`w-full p-2 rounded-lg border font-serif text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                            sigCheck.isSingleLine && !doc.quyenHanKy && !doc.signerAuthority
                              ? 'border-amber-400 bg-amber-50/60 text-amber-950'
                              : 'border-slate-300 text-slate-900 bg-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                          Dòng 2: Chức vụ người ký (*):
                        </label>
                        <input
                          type="text"
                          value={doc.signerTitle}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            updateDocField('signerTitle', val);
                            if (/PHÓ/i.test(val) && doc.quyenHanKy !== 'KT. CHỦ TỊCH' && !doc.signerAuthority) {
                              updateDocField('quyenHanKy', 'KT. CHỦ TỊCH');
                              updateDocField('signerAuthority', 'KT. CHỦ TỊCH');
                            }
                          }}
                          placeholder="Ví dụ: PHÓ CHỦ TỊCH hoặc CHỦ TỊCH"
                          className={`w-full p-2 rounded-lg border font-serif text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                            sigCheck.isSingleLine && !doc.signerTitle
                              ? 'border-amber-400 bg-amber-50/60 text-amber-950 ring-1 ring-amber-300'
                              : 'border-slate-300 text-slate-900 bg-white'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DÒNG TIẾP THEO: HỌ VÀ TÊN NGƯỜI KÝ & KHOẢNG TRỐNG KÝ TÊN */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Họ và tên người ký (Cỡ 14pt in đậm)</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                      Khoảng trống ký: 75–85pt (720 dxa)
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
                      Bản xem trước bố cục chữ ký sẽ xuất ({hasThreeSignerLines ? '3 dòng vai trò ký' : '2 dòng vai trò ký'}):
                    </div>
                    <div className="font-bold text-slate-900 text-xs">
                      {(() => {
                        if (sigCheck.hasThreeLines && sigCheck.roleLine2) {
                          return (
                            <div className="space-y-0.5">
                              <div>{sigCheck.authorityLine}</div>
                              <div>{sigCheck.roleLine2}</div>
                              <div>{sigCheck.titleLine}</div>
                            </div>
                          );
                        }

                        if (sigCheck.isSingleLine) {
                          return (
                            <div className="inline-block bg-yellow-200 border-2 border-yellow-400 p-2 rounded-lg text-yellow-950 shadow-xs">
                              <div className="font-bold uppercase underline decoration-amber-600">
                                {sigCheck.singleLineText || 'CHƯA CÓ CHỨC VỤ / QUYỀN HẠN KÝ'}
                              </div>
                              <div className="text-[10px] text-amber-900 font-sans mt-1 font-semibold italic flex items-center justify-center gap-1">
                                <span>⚠️ Đang chỉ có 1 dòng (lưu ý bổ sung đủ Quyền hạn & Chức vụ)</span>
                              </div>
                            </div>
                          );
                        }

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

                    {/* Thêm khoảng trống 1 dòng giãn cách tiêu chuẩn ngay dưới chức năng/quyền ký hiệu */}
                    <div className="h-4 text-[10px] text-slate-400 italic select-none my-0.5">
                      (1 dòng giãn cách tiêu chuẩn)
                    </div>
                    {/* Thêm 1 dòng giãn cách bổ sung theo yêu cầu tăng khoảng cách tên người ký và chức danh */}
                    <div className="h-4 text-[10px] text-emerald-600 font-semibold italic select-none my-0.5">
                      (+ thêm 1 dòng khoảng cách giữa chức danh và người ký)
                    </div>

                    {/* Mở rộng không gian ký tên (khoảng trống 85–95pt trong HTML và 840 dxa trong tệp Word Word) */}
                    <div style={{ height: '85pt' }} className="flex items-center justify-center border-y border-dashed border-slate-200 my-1 bg-slate-50/50 rounded">
                      <span className="text-[11px] text-slate-500 italic font-sans">
                        [Khoảng trống ký rộng rãi 85–95pt (840 dxa) cho chữ ký tươi và ký số điện tử]
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 text-sm">
                      {doc.signerName || '(Họ và tên người ký)'}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
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
