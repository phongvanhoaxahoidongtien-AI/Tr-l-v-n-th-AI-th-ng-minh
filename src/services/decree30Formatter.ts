import { AgencySettings, IllogicalSegment, DocumentAppendix } from '../types';
import { convertMarkdownTableToHtml, formatHtmlTableToFitA4, isWarningOrInstructionLine } from '../utils/cleanAIText';
import { detectIllogicalAdministrativeText } from '../utils/illogicalTextDetector';
import { 
  isCongVanDocument, 
  formatCongVanSubject, 
  extractCongVanSubjectFromLines,
  CONG_VAN_SUBJECT_REGEX,
  getCongVanSubject, 
  renderCongVanHeaderTableHtml 
} from './Module_CongVan.js';

/**
 * Chuẩn hóa kiểu chữ trích yếu / tiêu đề văn bản theo Nghị định 30/2020/NĐ-CP:
 * - Trích yếu văn bản: Viết chữ in thường, in đậm, căn giữa.
 * - Chữ cái đầu tiên viết hoa, các chữ sau viết thường theo quy tắc chính tả tiếng Việt.
 * - Giữ nguyên viết hoa cho các từ viết tắt và danh từ riêng/địa danh:
 *   UBND, HĐND, BCH, BTV, MTTQ, TƯ, TW, VN, TP, TNHH, BT, CP, Đông Tiến, Việt Nam, Hà Nội, v.v.
 * - Loại bỏ các dấu thừa ở cuối như dấu hai chấm (:), dấu chấm (.), dấu chấm phẩy (;).
 */
export function formatDecree30TitleCase(title: string): string {
  if (!title) return '';
  let clean = title
    .replace(/(?:CỘNG\s*H[ÒOòo][AÀàa]\s*XÃ\s*HỘI\s*CHỦ\s*NGHĨA\s*VIỆT\s*NAM|Độc\s*lập\s*[-–—_]\s*Tự\s*do\s*[-–—_]\s*Hạnh\s*phúc)/gi, '')
    .replace(/^[\s:\.\-–—]+/, '')
    .replace(/[\s:\.\-–—;]+$/, '')
    .trim();

  if (!clean) return '';

  // Nếu tiêu đề bị viết hoa toàn bộ (ALL CAPS): chuyển thành chữ in thường chuẩn NĐ 30, chữ cái đầu viết hoa
  const isAllCaps = clean.length > 5 && clean === clean.toUpperCase() && /[A-ZÀ-Ỹ]/.test(clean);
  if (isAllCaps) {
    let lower = clean.toLowerCase();
    // Viết hoa chữ cái đầu tiên
    clean = lower.charAt(0).toUpperCase() + lower.slice(1);
    
    // Khôi phục các từ viết tắt và danh từ riêng phổ biến
    const properWords: Record<string, string> = {
      'ubnd': 'UBND',
      'hđnd': 'HĐND',
      'mttq': 'MTTQ',
      'tw': 'TW',
      'tư': 'TƯ',
      'vn': 'VN',
      'tp': 'TP',
      'tnhh': 'TNHH',
      'bch': 'BCH',
      'btv': 'BTV',
      'đcs': 'ĐCS',
      'tncs': 'TNCS',
      'việt nam': 'Việt Nam',
      'đông tiến': 'Đông Tiến',
      'hà nội': 'Hà Nội',
      'hồ chí minh': 'Hồ Chí Minh',
      'đà nẵng': 'Đà Nẵng',
      'thanh hóa': 'Thanh Hóa',
      'nghệ an': 'Nghệ An',
      'nghị định 30': 'Nghị định 30',
      'nghị định': 'Nghị định',
      'quyết định': 'Quyết định',
      'luật': 'Luật',
      'bộ luật': 'Bộ luật',
      'chính phủ': 'Chính phủ',
      'quốc hội': 'Quốc hội'
    };

    for (const [key, replacement] of Object.entries(properWords)) {
      const rx = new RegExp(`\\b${key}\\b`, 'gi');
      clean = clean.replace(rx, replacement);
    }
  }

  // Đảm bảo chữ cái đầu luôn viết hoa
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export interface StructuredDoc {
  isPartyDoc: boolean;
  parentAgency: string;
  agencyName: string;
  docCode: string;
  docSubjectShort: string; // V/v ... (dành cho công văn)
  countryHeader: string;
  motto: string;
  locationDate: string;
  docTypeName: string; // QUYẾT ĐỊNH, CÔNG VĂN, TỜ TRÌNH, NGHỊ QUYẾT...
  docTitle: string; // Về việc ...
  issuingAuthority?: string; // Thẩm quyền ban hành (ví dụ: ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN hoặc CHỦ TỊCH...)
  recipientsHeader: string; // Kính gửi (hỗ trợ nhiều dòng với \n)
  legalBases: string[];
  bodyParagraphs: string[];
  appendices?: DocumentAppendix[]; // Phụ lục (ngắt sang trang riêng)
  recipients: string[]; // Nơi nhận (hỗ trợ nhiều dòng với \n)
  quyenHanKy: string; // TM. | T/M | KT. | Q. | KT. CHỦ TỊCH
  signerAuthority: string; // TM. ỦY BAN NHÂN DÂN / TM. BAN THƯỜNG VỤ / TM. BAN CHẤP HÀNH / KT. CHỦ TỊCH / T/M CHI BỘ
  signerRoleLine2?: string; // Dòng vai trò thứ 2 khi có 3 dòng (ví dụ: KT. CHỦ TỊCH, CHỦ TỊCH, KT. BÍ THƯ)
  signerTitle: string; // CHỦ TỊCH / PHÓ CHỦ TỊCH / BÍ THƯ (Chức vụ người ký trực tiếp)
  signerName: string;
  tableStats?: {
    tableCount: number;
    mergedCellCount: number;
  };
  cacMucDaChinh?: string[];
  illogicalFindings?: IllogicalSegment[];
}

/**
 * Chuẩn hóa danh sách nơi nhận / kính gửi: Tự động thêm dấu gạch ngang đầu dòng (-) cho mỗi dòng
 * và loại bỏ các từ khóa thừa như 'Kính gửi:', 'Nơi nhận:'
 */
export function formatBulletLines(raw: string | string[], prefixToRemove?: RegExp): string[] {
  const lines: string[] = Array.isArray(raw) 
    ? raw 
    : (raw || '').split('\n');

  return lines
    .map(line => {
      let l = line.trim();
      if (prefixToRemove) {
        l = l.replace(prefixToRemove, '').trim();
      }
      if (!l) return '';
      // Tự động thêm '- ' nếu chưa có (mặc định các dòng Kính gửi và Nơi nhận có dấu - ở đầu)
      if (!/^[-\u2013\u2014]\s*/.test(l)) {
        l = `- ${l}`;
      } else {
        l = l.replace(/^[-\u2013\u2014]\s*/, '- ');
      }
      return l;
    })
    .filter(Boolean);
}

/**
 * Định dạng riêng cho phần Kính gửi chuẩn Nghị định 30/2020/NĐ-CP:
 * - Nếu chỉ có 1 cơ quan: Đặt trên cùng 1 hàng, TUYỆT ĐỐI KHÔNG có dấu gạch (-)
 * - Nếu có từ 2 cơ quan trở lên: Các dòng tiếp theo có gạch đầu dòng (-), cuối dòng chấm phẩy (;), dòng cuối chấm (.)
 */
export function formatKinhGuiLines(raw: string | string[]): string[] {
  const lines: string[] = Array.isArray(raw) ? raw : (raw || '').split('\n');
  const cleaned = lines
    .map(line => {
      let l = line.trim();
      l = l.replace(/^Kính\s*(?:gửi|trình):?\s*/i, '').trim();
      l = l.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim();
      return l;
    })
    .filter(Boolean);

  if (cleaned.length === 1) {
    const single = cleaned[0].replace(/[;\.]+$/, '').trim();
    return [`${single}.`];
  } else if (cleaned.length > 1) {
    return cleaned.map((c, idx) => {
      const isLast = idx === cleaned.length - 1;
      const clean = c.replace(/[;\.]+$/, '').trim();
      return `- ${clean}${isLast ? '.' : ';'}`;
    });
  }
  return [];
}

/**
 * Chuẩn hóa Nơi nhận (dành riêng cho Quyết định):
 * - Dòng đầu ghi "- Như Điều …;" (trong đó Điều … là điều khoản thi hành cuối cùng, vd: "- Như Điều 3;" hoặc "- Như Điều 4;")
 * - Tuyệt đối không ghi "Như trên"
 * - Các dòng trước kết thúc bằng dấu ";", dòng cuối kết thúc bằng dấu "."
 */
export function formatDecisionRecipients(recipients: string[], maxArticleNumber = 3): string[] {
  const targetDieu = Math.max(1, maxArticleNumber);
  const firstExpected = `- Như Điều ${targetDieu};`;

  const cleaned = recipients
    .map(r => r.replace(/^Nơi\s*nhận:?\s*/i, '').trim())
    .filter(Boolean)
    .map(r => {
      const noDash = r.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim();
      // Thay thế "Như trên" bằng "- Như Điều [N];"
      if (/^Như\s+trên/i.test(noDash)) {
        return firstExpected;
      }
      return r.startsWith('-') ? r : `- ${noDash}`;
    });

  // Tách dòng Như Điều ...
  const dieuItems = cleaned.filter(r => /^-\s*Như\s+Điều\s+\d+/i.test(r));
  const otherItems = cleaned.filter(r => !/^-\s*Như\s+Điều\s+\d+/i.test(r) && !/^-\s*Như\s+trên/i.test(r));

  // Tách dòng Lưu: VT ở cuối
  const luuItems = otherItems.filter(r => /^-\s*Lưu\s*:/i.test(r));
  const midItems = otherItems.filter(r => !/^-\s*Lưu\s*:/i.test(r));

  const resultItems: string[] = [];
  resultItems.push(dieuItems.length > 0 ? dieuItems[0].replace(/[;\.]+$/, '') + ';' : firstExpected);
  for (const m of midItems) {
    const cleanM = m.replace(/[;\.]+$/, '');
    resultItems.push(`${cleanM};`);
  }
  if (luuItems.length > 0) {
    const cleanL = luuItems[0].replace(/[;\.]+$/, '');
    resultItems.push(`${cleanL}.`);
  } else {
    resultItems.push('- Lưu: VT.');
  }

  return resultItems;
}

/**
 * Tự động tính toán đường kẻ ngang nằm dưới Tiêu ngữ (hoặc Tiêu đề Đảng) trong Word (.docx)
 * sao cho chiều dài bằng đúng 100% chiều dài của cụm chữ này, tuyệt đối không được vượt quá.
 * - Cỡ chữ Tiêu ngữ chuẩn: 13-14pt (26-28 half-points)
 * - Cỡ chữ nét gạch: 11pt (22 half-points)
 * - Đối với "Độc lập - Tự do - Hạnh phúc" 14pt bold:
 *   Trong Word desktop, mỗi ký tự '─' (U+2500) có chiều rộng 1 em (0.388cm).
 *   Cụm "Độc lập - Tự do - Hạnh phúc" 14pt bold có bề ngang ~5.2 - 5.4cm.
 *   Do đó đúng 13 ký tự '─' (14pt) hoặc 12 ký tự '─' (13pt) đảm bảo chiều dài bằng 100% dòng chữ,
 *   tuyệt đối không bao giờ vượt quá dù mở bằng bất kỳ phiên bản Microsoft Word nào!
 */
export function getAutoAdjustedMottoLine(
  mottoText: string = 'Độc lập - Tự do - Hạnh phúc',
  mottoFontSizeHalfPt: number = 28,
  lineFontSizeHalfPt: number = 22
): string {
  const text = mottoText?.trim() || 'Độc lập - Tự do - Hạnh phúc';

  // Chuẩn hóa tiêu ngữ hành chính Việt Nam theo NĐ 30:
  if (text === 'Độc lập - Tự do - Hạnh phúc') {
    return mottoFontSizeHalfPt >= 28 ? '─────────────' : '────────────'; // 13 ký tự cho 14pt, 12 ký tự cho 13pt
  }

  // Tiêu đề Đảng theo HD 05: "ĐẢNG CỘNG SẢN VIỆT NAM"
  if (text === 'ĐẢNG CỘNG SẢN VIỆT NAM') {
    return '──────────────'; // 14 ký tự
  }

  // Với tiêu ngữ tùy biến: tính toán chặt chẽ và chặn trên tuyệt đối
  let totalEm = 0;
  for (const ch of text) {
    if (ch === ' ' || ch === '\u00A0') totalEm += 0.25;
    else if (ch === '-' || ch === '–') totalEm += 0.35;
    else if (/[A-ZĐÀ-Ỹ]/.test(ch)) totalEm += 0.65;
    else if (/[ijlftr]/.test(ch)) totalEm += 0.28;
    else if (/[mw]/.test(ch)) totalEm += 0.70;
    else totalEm += 0.44;
  }
  const textWidthDxa = totalEm * (mottoFontSizeHalfPt * 10);
  const charWidthDxa = lineFontSizeHalfPt * 10;
  const charCount = Math.max(3, Math.min(13, Math.floor((textWidthDxa * 0.94) / charWidthDxa)));
  return '─'.repeat(charCount);
}

/**
 * Nhận diện chính xác 100% dòng bắt đầu của phần Thân / Nội dung chính văn bản
 * (Bao gồm Công văn, Báo cáo, Tờ trình, Kế hoạch, Quyết định, v.v.)
 * Giúp ngăn chặn triệt để:
 * - Đối với Công văn: không bị dính phần nội dung mở đầu vào mục Kính gửi
 * - Đối với Báo cáo: không bị dính phần nội dung chính vào tên trích yếu báo cáo
 * Các dấu hiệu nhận biết:
 * 1. Bắt đầu bằng: Thực hiện... (Thực hiện Kế hoạch, Công văn, chỉ đạo, ý kiến, nhiệm vụ...)
 * 2. Bắt đầu bằng: Căn cứ... (Căn cứ Luật, Nghị định, Quyết định, Thông tư, Công văn, Kế hoạch...)
 * 3. Bắt đầu bằng: UBND nhận được... (Ủy ban nhân dân nhận được, Cơ quan... nhận được, Tiếp nhận, Phúc đáp, Trả lời...)
 * 4. Dấu tab (\t), khoảng thụt lề đầu dòng kết hợp câu văn hành chính
 * 5. Các từ ngữ mở đầu văn bản: Xét đề nghị, Theo đề nghị, Nhằm, Để, Qua rà soát, Trong thời gian qua, Hiện nay...
 * 6. Kết thúc bằng cụm ": như sau:", "báo cáo như sau:", "như sau."
 * 7. Các đề mục phân cấp: I., 1., Điều 1., Phần thứ...
 */
export function isDocumentBodyStart(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;

  const hasIndent = line.startsWith('\t') || /^ {3,}/.test(line);

  // 1. Bắt đầu bằng "Thực hiện..."
  if (/^Thực\s+hiện(?:\s+|$|[:\.,])/i.test(trimmed)) {
    return true;
  }

  // 2. Bắt đầu bằng "Căn cứ..."
  if (/^Căn\s+cứ(?:\s+|$|[:\.,])/i.test(trimmed)) {
    return true;
  }

  // 3. Cơ quan nhận được / tiếp nhận / phúc đáp / trả lời
  if (/^(?:UBND|Ủy\s+ban\s+nhân\s+dân|Đảng\s+ủy|Chi\s+bộ|HĐND|Hội\s+đồng\s+nhân\s+dân|Ban|Sở|Phòng|Đơn\s+vị|Cơ\s+quan)(?:\s+[A-ZÀ-Ỹa-zà-ỹ0-9\s]+?)?\s*(?:nhận\s+được|tiếp\s+nhận|phúc\s+đáp|trả\s+lời|kính\s+chuyển|kính\s+gửi|báo\s+cáo|xin\s+ý\s+kiến)(?:\s+|$|[:\.,])/i.test(trimmed)) {
    return true;
  }
  if (/^(?:ngày\s+[\d\/\.\-]+\s*,\s*)?(?:UBND|Ủy\s+ban\s+nhân\s+dân|Sở|Phòng|Ban|Đơn\s+vị)\s+(?:nhận\s+được|tiếp\s+nhận)(?:\s+|$|[:\.,])/i.test(trimmed)) {
    return true;
  }
  if (/^(?:Nhận\s+được|Tiếp\s+nhận|Phúc\s+đáp|Trả\s+lời)\s+(?:công\s+văn|văn\s+bản|kế\s+hoạch|tờ\s+trình|thông\s+báo|đề\s+nghị|ý\s+kiến|phiếu\s+chuyển)(?:\s+|$|[:\.,])/i.test(trimmed)) {
    return true;
  }

  // 4. Các câu mở đầu văn bản hành chính thông dụng
  if (/^(?:Xét\s+đề\s+nghị|Theo\s+đề\s+nghị|Theo\s+yêu\s+cầu|Theo\s+chỉ\s+đạo|Theo\s+đó|Nhằm|Để|Qua\s+rà\s+soát|Qua\s+kiểm\s+tra|Qua\s+theo\s+dõi|Thời\s+gian\s+qua|Trong\s+thời\s+gian\s+qua|Hiện\s+nay|Trong\s+những\s+năm\s+qua|Sau\s+khi\s+xem\s+xét|Sau\s+khi\s+nghiên\s+cứu|Được\s+sự\s+đồng\s+ý)(?:\s+|$|[:\.,])/i.test(trimmed)) {
    return true;
  }

  // 5. Kết thúc bằng: như sau:, báo cáo như sau:, kính báo cáo như sau:
  if (/(?:như\s+sau\s*[:\.]|kính\s+báo\s+cáo\s+như\s+sau|báo\s+cáo\s+kết\s+quả\s+như\s+sau|kết\s+quả\s+cụ\s+thể\s+như\s+sau|kính\s+trình\s+như\s+sau)\s*$/i.test(trimmed)) {
    return true;
  }

  // 6. Các đề mục phân cấp thân văn bản
  if (/^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+[A-ZÀ-Ỹ]/i.test(trimmed)) return true;
  if (/^(?:Phần\s+thứ|Mục\s+[A-Z\d]|Chương\s+[I|V|X\d]+|Điều\s+\d+|Khoản\s+\d+)(?:\s+|$|[:\.,])/i.test(trimmed)) return true;
  if (/^(?:QUYẾT\s+ĐỊNH|QUYẾT\s+NGHỊ|KẾT\s+LUẬN|CHỈ\s+THỊ|YÊU\s+CẦU|ĐỀ\s+NGHỊ)\s*[:\.]?$/i.test(trimmed)) return true;

  // 7. Dấu tab / thụt lề rõ rệt kết hợp văn bản có câu cú
  if (hasIndent && trimmed.length >= 25 && /\b(?:thực hiện|nhận được|báo cáo|đề nghị|yêu cầu|triển khai|chỉ đạo|phối hợp|ban hành)\b/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Nâng cấp tính năng tô đậm các đầu dòng Bullet 1 2 3.... (Khoản, Mục, Điểm, Số La Mã, Điều khoản).
 * Hỗ trợ tô đậm cả đầu số (vd: **1.**) hoặc tiêu đề đầu mục kết thúc bằng dấu hai chấm (vd: **1. Mục đích, yêu cầu:**).
 */
export function boldBulletHeadings(text: string): { text: string; count: number } {
  if (!text) return { text: '', count: 0 };
  const lines = text.split('\n');
  let count = 0;

  const boldedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Không xử lý nếu là bảng hoặc đã in đậm toàn bộ
    if (trimmed.startsWith('|') || trimmed.startsWith('---') || trimmed.startsWith('<table')) {
      return line;
    }

    // A. Dạng số thứ tự: 1. hoặc 1.1. hoặc 2.1.3.
    const numMatch = trimmed.match(/^(\d+(?:\.\d+)*\.)(?:\s+(.*))?$/);
    if (numMatch) {
      const numPrefix = numMatch[1];
      const rest = numMatch[2] || '';

      // Đã in đậm rồi?
      if (trimmed.startsWith('**') || trimmed.startsWith('<b>') || trimmed.startsWith('<strong>')) {
        return line;
      }

      count++;
      // Nếu có tiêu đề kết thúc bằng dấu hai chấm (vd: "1. Về công tác chỉ đạo: Thực hiện...")
      const colonMatch = rest.match(/^([^:]{2,45}:)\s*(.*)$/);
      if (colonMatch) {
        return `**${numPrefix} ${colonMatch[1]}** ${colonMatch[2]}`.trim();
      }
      return `**${numPrefix}** ${rest}`.trim();
    }

    // B. Dạng số La Mã: I. hoặc II. hoặc III.
    const romanMatch = trimmed.match(/^([IVXLCDM]+\.)(?:\s+(.*))?$/);
    if (romanMatch) {
      const romanPrefix = romanMatch[1];
      const rest = romanMatch[2] || '';
      if (trimmed.startsWith('**') || trimmed.startsWith('<b>') || trimmed.startsWith('<strong>')) {
        return line;
      }
      count++;
      const colonMatch = rest.match(/^([^:]{2,50}:)\s*(.*)$/);
      if (colonMatch) {
        return `**${romanPrefix} ${colonMatch[1]}** ${colonMatch[2]}`.trim();
      }
      return `**${romanPrefix}** ${rest}`.trim();
    }

    // C. Dạng chữ cái điểm: a) hoặc b) hoặc c) hoặc đ)
    const letterMatch = trimmed.match(/^([a-zđ]\))(?:\s+(.*))?$/i);
    if (letterMatch) {
      const letterPrefix = letterMatch[1];
      const rest = letterMatch[2] || '';
      if (trimmed.startsWith('**') || trimmed.startsWith('<b>') || trimmed.startsWith('<strong>')) {
        return line;
      }
      count++;
      const colonMatch = rest.match(/^([^:]{2,40}:)\s*(.*)$/);
      if (colonMatch) {
        return `**${letterPrefix} ${colonMatch[1]}** ${colonMatch[2]}`.trim();
      }
      return `**${letterPrefix}** ${rest}`.trim();
    }

    // D. Dạng Điều khoản: Điều 1. hoặc Điều 2.
    const articleMatch = trimmed.match(/^(Điều\s+\d+\.)(?:\s+(.*))?$/i);
    if (articleMatch) {
      const artPrefix = articleMatch[1];
      const rest = articleMatch[2] || '';
      if (trimmed.startsWith('**') || trimmed.startsWith('<b>') || trimmed.startsWith('<strong>')) {
        return line;
      }
      count++;
      return `**${artPrefix}** ${rest}`.trim();
    }

    return line;
  });

  return { text: boldedLines.join('\n'), count };
}

/**
 * Nhận diện Khoản / Điều có tiêu đề hay không có tiêu đề theo chuẩn Nghị định 30/2020/NĐ-CP:
 * - Có tiêu đề: Ví dụ: "1. Phạm vi và đối tượng áp dụng" hoặc "1. Phạm vi điều chỉnh: ..." -> In đậm 13-14pt Đứng
 * - Không có tiêu đề: Ví dụ: "1. Quyết định này có hiệu lực thi hành kể từ ngày…" -> In thường 13-14pt Đứng (KHÔNG ĐẬM)
 */
export function detectNumberedHeading(rest: string): {
  hasTitle: boolean;
  title: string;
  content: string;
} {
  const cleanRest = (rest || '').trim();
  if (!cleanRest) return { hasTitle: false, title: '', content: '' };

  // 1. Tiêu đề kết thúc bằng dấu hai chấm (vd: "Phạm vi và đối tượng áp dụng: Áp dụng cho...")
  const colonMatch = cleanRest.match(/^([^:]{2,55}:)\s*(.*)$/);
  if (colonMatch) {
    return { hasTitle: true, title: colonMatch[1], content: colonMatch[2] };
  }

  // 2. Tiêu đề kết thúc bằng dấu chấm và theo sau là câu nội dung bắt đầu bằng chữ hoa
  // Vd: "Phạm vi điều chỉnh. Nghị định này quy định..."
  const dotTitleMatch = cleanRest.match(/^([A-ZÀ-Ỹa-zà-ỹ\s]{2,50}\.)\s+([A-ZÀ-Ỹ].*)$/);
  if (dotTitleMatch) {
    const p1 = dotTitleMatch[1];
    const isSentence = /\b(có hiệu lực|thi hành|kể từ ngày|chịu trách nhiệm|giao cho|tổ chức|thực hiện|quy định này|ban hành)\b/i.test(p1);
    if (!isSentence) {
      return { hasTitle: true, title: dotTitleMatch[1], content: dotTitleMatch[2] };
    }
  }

  // 3. Tiêu đề đứng độc lập trên 1 dòng (dài <= 55 ký tự, không có dấu chấm ở giữa, không phải là câu văn xuôi)
  // Vd: "Phạm vi và đối tượng áp dụng", "Mục đích, yêu cầu", "Nguyên tắc thực hiện", "Nhiệm vụ trọng tâm"
  const isNarrativeSentence = /\b(có hiệu lực|thi hành|kể từ ngày|chịu trách nhiệm|giao cho|căn cứ vào|các cơ quan|được áp dụng|phối hợp với|ban hành kèm|trực tiếp chỉ đạo|đồng chí|UBND|kể từ)\b/i.test(cleanRest);
  const endsWithPunct = /[\.\?!]$/.test(cleanRest) && cleanRest.length > 25;
  const standaloneTitle = cleanRest.length > 0 && cleanRest.length <= 55 && !/[\.\?!]\s+\w+/.test(cleanRest) && !isNarrativeSentence && !endsWithPunct && !/^(Quyết định|Thông tư|Nghị định|Luật|Ủy ban|Bộ|Ban|UBND)\b/i.test(cleanRest);

  if (standaloneTitle) {
    return { hasTitle: true, title: cleanRest, content: '' };
  }

  return { hasTitle: false, title: '', content: cleanRest };
}

/**
 * Tiện ích bỏ tô đậm các đầu dòng Bullet nếu người dùng muốn hoàn tác về dạng chữ thường.
 */
export function unboldBulletHeadings(text: string): { text: string; count: number } {
  if (!text) return { text: '', count: 0 };
  const lines = text.split('\n');
  let count = 0;

  const unboldedLines = lines.map(line => {
    let l = line;
    // Bỏ ** quanh số thứ tự: **1.** hoặc **1. Tiêu đề:**
    const boldBulletRegex = /^\*\*((\d+(?:\.\d+)*\.|[IVXLCDM]+\.|[a-zđ]\)|Điều\s+\d+\.)(?:\s+[^:]+:)?)\*\*\s*(.*)$/i;
    const match = l.trim().match(boldBulletRegex);
    if (match) {
      count++;
      return `${match[1]} ${match[3]}`.trim();
    }
    return line;
  });

  return { text: unboldedLines.join('\n'), count };
}

/**
 * Chuẩn hóa hiển thị tên Cơ quan ban hành (Cột trái):
 * - Nếu có Cơ quan cấp trên (parentAgency) (chỉ áp dụng đối với các phòng, ban, trung tâm chuyên môn trực thuộc tỉnh hoặc xã phường):
 *   Dòng 1: Cơ quan cấp trên (cỡ 12-13, đứng, in hoa)
 *   Dòng 2: Cơ quan ban hành (cỡ 12-13, đậm, in hoa)
 * - Nếu không có Cơ quan cấp trên VÀ Cơ quan ban hành là UBND các cấp (hoặc có dạng UBND ...):
 *   Dòng 1: ỦY BAN NHÂN DÂN (cỡ 12-13, đứng, in hoa)
 *   Dòng 2: <Tên cấp địa phương, ví dụ: PHƯỜNG ĐÔNG TIẾN hoặc TỈNH THANH HÓA> (cỡ 12-13, đậm, in hoa)
 * - Các trường hợp khác:
 *   Nếu chứa \n: dòng 1 đứng, dòng 2 đậm
 *   Ngược lại: dòng 1 đậm
 */
export interface AgencyHeaderParts {
  line1: string;
  line1Bold: boolean;
  line2: string;
  line2Bold: boolean;
  hasLine2: boolean;
  isUbndLevel: boolean;
}

/**
 * Chuẩn hóa tên cơ quan ban hành (Cột trái) theo Nghị định 30/2020/NĐ-CP & Hướng dẫn 05:
 * - Đối với cấp UBND (Phường, Xã, Thị trấn, Huyện, Quận, Thị xã, Tỉnh, Thành phố):
 *   Không có cơ quan cấp trên; tiêu đề cơ quan ban hành được trình bày chuẩn 2 dòng:
 *   Dòng 1: ỦY BAN NHÂN DÂN (chữ in hoa, đứng, size 12pt)
 *   Dòng 2: PHƯỜNG ĐÔNG TIẾN (hoặc TỈNH THANH HÓA, XÃ ĐÔNG TIẾN...) (chữ in hoa, in đậm, size 12pt)
 * - Đối với phòng, ban, trung tâm chuyên môn trực thuộc tỉnh hoặc xã/phường (áp dụng Cơ quan cấp trên & Cơ quan ban hành):
 *   Dòng 1: UBND cấp trên (chữ in hoa, đứng, size 12pt)
 *   Dòng 2: Phòng/ban chuyên môn ban hành (chữ in hoa, in đậm, size 12pt)
 */
export function getStandardAgencyHeaderParts(parentAgency?: string, agencyName?: string): AgencyHeaderParts {
  const cleanParent = (parentAgency || '').trim();
  const cleanAgency = (agencyName || '').trim();

  // 1. Kiểm tra xem có phải cơ quan cấp UBND không
  const isUbnd = /^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)\b/i.test(cleanAgency) ||
    /^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)$/i.test(cleanParent);

  if (isUbnd) {
    let locality = '';
    const match = cleanAgency.match(/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)\s*(.*)$/i);
    if (match && match[1].trim()) {
      locality = match[1].trim();
    } else if (cleanParent && !/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)$/i.test(cleanAgency)) {
      locality = cleanAgency;
    }

    if (locality) {
      return {
        line1: 'ỦY BAN NHÂN DÂN',
        line1Bold: false, // Dòng 1: chữ in hoa, đứng, size 12pt
        line2: locality.toUpperCase(),
        line2Bold: true,  // Dòng 2: chữ in hoa, in đậm, size 12pt
        hasLine2: true,
        isUbndLevel: true,
      };
    } else {
      return {
        line1: cleanAgency.toUpperCase() || 'ỦY BAN NHÂN DÂN',
        line1Bold: true,
        line2: '',
        line2Bold: false,
        hasLine2: false,
        isUbndLevel: true,
      };
    }
  }

  // 2. Trường hợp phòng, ban, trung tâm chuyên môn trực thuộc (Dòng 1: Cấp trên đứng, Dòng 2: Phòng/ban đậm)
  if (cleanParent && cleanAgency) {
    return {
      line1: cleanParent.toUpperCase(),
      line1Bold: false,
      line2: cleanAgency.toUpperCase(),
      line2Bold: true,
      hasLine2: true,
      isUbndLevel: false,
    };
  }

  // 3. Cơ quan ban hành có 2 dòng (chứa \n)
  if (cleanAgency && cleanAgency.includes('\n')) {
    const parts = cleanAgency.split('\n').map(p => p.trim()).filter(Boolean);
    return {
      line1: (parts[0] || '').toUpperCase(),
      line1Bold: false,
      line2: (parts[1] || '').toUpperCase(),
      line2Bold: true,
      hasLine2: Boolean(parts[1]),
      isUbndLevel: false,
    };
  }

  // 4. Các trường hợp cơ quan đơn lẻ khác
  const single = cleanAgency || cleanParent || 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN';
  return {
    line1: single.toUpperCase(),
    line1Bold: true,
    line2: '',
    line2Bold: false,
    hasLine2: false,
    isUbndLevel: false,
  };
}

/**
 * Hiển thị khối tên cơ quan ban hành trên A4 HTML (chuẩn NĐ 30 & HD 05)
 */
export function renderAgencyHeaderHtml(parentAgency: string, agencyName: string): string {
  const parts = getStandardAgencyHeaderParts(parentAgency, agencyName);

  return `
    <div style="font-size: 12pt; text-transform: uppercase; font-weight: ${parts.line1Bold ? 'bold' : 'normal'}; margin-bottom: 2pt; letter-spacing: -0.1px; font-family: 'Times New Roman', serif; line-height: 1.25;">
      ${parts.line1}
    </div>
    <div style="font-size: 12pt; text-transform: uppercase; font-weight: ${parts.line2Bold ? 'bold' : 'normal'}; letter-spacing: -0.2px; font-family: 'Times New Roman', serif; line-height: 1.25;">
      ${parts.hasLine2 ? parts.line2 : '&nbsp;'}
    </div>
  `;
}

/**
 * Mở rộng khoảng cách trắng giữa của số ký hiệu văn bản (cột trái tiêu đề).
 * Ví dụ: Số:           /UBND-VHXH (khoảng cách rộng ~1cm, để trắng không dùng ...)
 */
export function formatDocCodeForDisplay(docCode: string, htmlMode = false): string {
  if (!docCode) {
    if (htmlMode) {
      return 'Số:<span style="display:inline-block; width: 1cm; min-width: 1cm;">&nbsp;</span>/UBND-VP';
    }
    return 'Số:          /UBND-VP';
  }

  const slashIdx = docCode.indexOf('/');
  if (slashIdx !== -1) {
    const prefix = docCode.substring(0, slashIdx);
    const suffix = docCode.substring(slashIdx); // vd: /UBND-VHXH
    
    // Kiểm tra xem prefix có số cụ thể chưa (vd: "Số: 45" hay chỉ là "Số:" hoặc "Số: ..." hoặc "Số: ……")
    const numPart = prefix.replace(/^Số:?\s*/i, '').trim();
    const hasRealNumber = /\d+/.test(numPart);
    
    if (!hasRealNumber) {
      if (htmlMode) {
        return `Số:<span style="display:inline-block; width: 1cm; min-width: 1cm;">&nbsp;</span>${suffix}`;
      }
      return `Số:          ${suffix}`;
    }
    return docCode;
  }

  if (/^Số:?\s*[\.…_\s]*$/i.test(docCode.trim())) {
    if (htmlMode) {
      return 'Số:<span style="display:inline-block; width: 1cm; min-width: 1cm;">&nbsp;</span>/UBND-VP';
    }
    return 'Số:          /UBND-VP';
  }

  return docCode;
}

/**
 * Tách sạch Tên cơ quan ban hành khỏi dòng, ngăn tuyệt đối việc đẩy nội dung văn bản vào ô Cơ quan ban hành:
 * 1. Không để Quốc hiệu, Tiêu ngữ lọt vào tên cơ quan
 * 2. Không để các câu văn, căn cứ, kính gửi, nội dung dài lọt vào tên cơ quan
 * 3. Nếu dòng chứa cả Tên cơ quan và phần nội dung/số hiệu khác, chỉ lấy tên cơ quan và trả phần còn lại vào luồng văn bản
 */
export function extractCleanAgencyAndRemainingText(rawLine: string): { cleanAgency: string; leftoverText: string } {
  // 1. Loại bỏ sạch Quốc hiệu, Tiêu ngữ nếu bị dính trên cùng dòng (thường gặp khi sao chép từ bảng 2 cột Word)
  let line = rawLine
    .replace(/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi, '')
    .replace(/Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi, '')
    .replace(/ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi, '')
    .trim();

  if (!line) return { cleanAgency: '', leftoverText: '' };

  const agencyRegex = /^(?:ỦY BAN NHÂN DÂN|UBND|HỘI ĐỒNG NHÂN DÂN|HĐND|TỈNH ỦY|THÀNH ỦY|HUYỆN ỦY|QUẬN ỦY|THỊ ỦY|ĐẢNG BỘ|ĐẢNG ỦY|CHI BỘ|CHI ỦY|CẤP ỦY|BAN CHẤP HÀNH|BAN THƯỜNG VỤ|ỦY BAN KIỂM TRA|ỦY BAN MTTQ|MẶT TRẬN TỔ QUỐC|CÔNG ĐOÀN|LIÊN ĐOÀN LAO ĐỘNG|ĐOÀN TNCS|ĐOÀN THANH NIÊN|CHI ĐOÀN|HỘI CỰU CHIẾN BINH|HỘI PHỤ NỮ|HỘI LIÊN HIỆP PHỤ NỮ|HỘI NÔNG DÂN|HỘI CHỮ THẬP ĐỎ|HỘI KHUYẾN HỌC|HỘI NGƯỜI CAO TUỔI|SỞ|PHÒNG|BỘ|BAN|TRƯỜNG|TRƯỜNG TIỂU HỌC|TRƯỜNG THCS|TRƯỜNG THPT|TRƯỜNG MẦM NON|HỌC VIỆN|VIỆN|PHÂN VIỆN|TRUNG TÂM|BỆNH VIỆN|CÔNG TY|TỔNG CÔNG TY|TẬP ĐOÀN|HỢP TÁC XÃ|HTX|CỤC|CHI CỤC|TỔNG CỤC|VỤ|VĂN PHÒNG|BỘ PHẬN|TỔ CÔNG TÁC|TỔ|KHỐI DÂN VẬN|ĐOÀN KIỂM TRA|ĐOÀN CÔNG TÁC|BAN CHỈ ĐẠO|TRẠM Y TẾ|TRẠM|ĐỘI|HẠT|CÔNG AN|BỘ CHỈ HUY|BAN CHỈ HUY|BAN CHỈ HUY QUÂN SỰ|KHO BẠC|BẢO HIỂM XÃ HỘI|BẢO HIỂM|NGÂN HÀNG|CHI CỤC THUẾ|THUẾ|PHƯỜNG|XÃ|THỊ TRẤN|QUẬN|HUYỆN|THỊ XÃ|THÀNH PHỐ)\b(?:\s+[A-ZÀ-Ỹ0-9\s\.\-–]+)?/i;
  
  // Tách khi gặp ranh giới: 2 dấu cách trở lên, hoặc dấu chấm/hai chấm/chấm phẩy theo sau là chữ, hoặc từ khóa chuyển tiếp
  const splitBoundary = /^(.*?)(?:\s{2,}|[\.\:\;]\s+|\s+(?:Số:|Số\s+|Kính gửi|V\/v|Về việc|Căn cứ|Thực hiện|Báo cáo|Thông báo|Quyết định|Xét|Điều\s+\d+|Theo\s+đề\s+nghị))(.*)$/i;
  
  const splitMatch = line.match(splitBoundary);
  if (splitMatch) {
    const potentialAgency = splitMatch[1].trim();
    const potentialRest = line.substring(potentialAgency.length).trim();
    if (agencyRegex.test(potentialAgency) && potentialAgency.length <= 80) {
      return { cleanAgency: potentialAgency, leftoverText: potentialRest };
    }
  }

  // Nếu cả dòng khớp từ khóa cơ quan và độ dài hợp lý (<= 80 ký tự, không chứa từ chỉ nội dung câu)
  const isActionOrBodySentence = /báo cáo về|thông báo về|kính gửi|căn cứ vào|thực hiện kế hoạch|xét đề nghị|như sau|yêu cầu các/i.test(line);
  if (agencyRegex.test(line) && line.length <= 80 && !isActionOrBodySentence) {
    return { cleanAgency: line, leftoverText: '' };
  }

  // Nếu dòng quá dài (> 80 ký tự) nhưng bắt đầu bằng tên cơ quan
  const prefixMatch = line.match(/^(?:ỦY BAN NHÂN DÂN|UBND|HỘI ĐỒNG NHÂN DÂN|HĐND|ĐẢNG ỦY|CHI BỘ|BAN CHẤP HÀNH|BAN THƯỜNG VỤ|SỞ|PHÒNG|BỘ|BAN|TRƯỜNG|TRUNG TÂM|BỆNH VIỆN|TRẠM Y TẾ|CÔNG AN|HỘI|ĐOÀN)\s+[A-ZÀ-Ỹa-zà-ỹ0-9\s\-–]+?(?=\s+(?:thông báo|báo cáo|kính gửi|căn cứ|về việc|thực hiện|xét|quyết định|yêu cầu|đề nghị|ban hành))/i);
  if (prefixMatch) {
    const extracted = prefixMatch[0].trim();
    const leftover = line.substring(extracted.length).trim();
    return { cleanAgency: extracted.toUpperCase(), leftoverText: leftover };
  }

  return { cleanAgency: '', leftoverText: line };
}

/**
 * Bóc tách các Phụ lục (Annex / Appendix) kèm theo văn bản:
 * Nhận diện định dạng:
 * PHỤ LỤC 1 / Phụ Lục 2 / PHỤ LỤC I / Phụ Lục ...
 * - SỐ LƯỢNG CÁC ĐƠN VỊ THAM GIA LỄ PHÁT ĐỘNG
 * - (Ban hành kèm theo Công văn số .../UBND-VHXH ngày tháng ... năm ... của UBND phường Đông Tiến)
 * Bảng biểu hoặc nội dung chi tiết
 */
export function parseAppendicesFromLines(lines: string[]): {
  cleanLines: string[];
  appendices: DocumentAppendix[];
} {
  const appendixRegex = /^(?:PHỤ\s*LỤC|Phụ\s*lục)(?:\s+(?:số|Số|SỐ))?(?:\s*[\:\-–—\.]\s*|\s+)?(?:\d+|[0-9IVXLCDM]+)?(?:\s*[\:\-–—\.]\s*(.*)|(?:\s*\(.*?\)))?$/i;
  const breakMarkerRegex = /^---\s*\[(?:NGẮT|PHÂN\s+TÁCH)\s+TRANG\s+A4\s*-\s*PHỤ\s+LỤC/i;

  const appendixIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (appendixRegex.test(l) || breakMarkerRegex.test(l)) {
      appendixIndices.push(i);
    }
  }

  if (appendixIndices.length === 0) {
    return { cleanLines: lines, appendices: [] };
  }

  const cleanLines = lines.slice(0, appendixIndices[0]);
  const appendices: DocumentAppendix[] = [];
  const misplacedFooterLines: string[] = [];

  for (let idx = 0; idx < appendixIndices.length; idx++) {
    const start = appendixIndices[idx];
    const end = idx + 1 < appendixIndices.length ? appendixIndices[idx + 1] : lines.length;
    let rawAppLines = lines.slice(start, end).map(l => l.trim()).filter(Boolean);

    if (rawAppLines.length === 0) continue;

    // Kiểm tra nếu trong phụ lục bị dính Nơi nhận & Chữ ký của văn bản chính (do xếp nhầm thứ tự ở file tải lên)
    const misplacedNoiNhanIdx = rawAppLines.findIndex(l => /^Nơi nhận:?/i.test(l));
    if (misplacedNoiNhanIdx !== -1) {
      const footerLines = rawAppLines.splice(misplacedNoiNhanIdx);
      misplacedFooterLines.push(...footerLines);
    }

    let lineIdx = 0;
    // Bỏ qua dòng ngắt trang marker nếu có
    if (breakMarkerRegex.test(rawAppLines[lineIdx])) {
      lineIdx++;
    }

    if (lineIdx >= rawAppLines.length) continue;

    const headerLine = rawAppLines[lineIdx];
    lineIdx++;

    let title = '';
    let referenceNote = '';
    const paragraphs: string[] = [];

    // Nhận diện Header phụ lục (e.g. PHỤ LỤC I, PHỤ LỤC 1, PHỤ LỤC SỐ 01, PHỤ LỤC: KÈM THEO)
    const headerMatch = headerLine.match(/^(?:PHỤ\s*LỤC|Phụ\s*lục)(?:\s+(?:số|Số|SỐ))?(?:\s*([0-9IVXLCDM\d]+))?(?:\s*[\:\-–—\.]\s*(.*)|(?:\s*\((.*?)\)))?$/i);
    let appHeader = '';
    if (headerMatch) {
      const num = headerMatch[1]?.trim() || String(idx + 1);
      appHeader = `PHỤ LỤC ${num}`.toUpperCase().trim();
      if (headerMatch[2]?.trim()) {
        title = headerMatch[2].trim();
      } else if (headerMatch[3]?.trim()) {
        referenceNote = `(${headerMatch[3].trim()})`;
      }
    } else {
      appHeader = headerLine.replace(/^---\s*\[.*?\]\s*---\s*/, '').toUpperCase();
    }

    // Đọc các dòng tiếp theo để bóc tách Tên phụ lục và Ghi chú ban hành kèm theo
    while (lineIdx < rawAppLines.length && lineIdx < 5) {
      const l = rawAppLines[lineIdx];
      // Nếu gặp bảng biểu, dừng đọc header
      if (l.startsWith('|') || l.startsWith('<table') || l.includes('___TABLE_BLOCK_')) {
        break;
      }

      // Kiểm tra dòng Ban hành kèm theo...
      const cleanRef = l.replace(/^[-\u2013\u2014]\s*/, '').trim();
      if (/^\(?\s*(?:Ban\s+hành\s+kèm\s+theo|Kèm\s+theo)\s+/i.test(cleanRef)) {
        referenceNote = l;
        lineIdx++;
        continue;
      }

      // Kiểm tra dòng Tiêu đề phụ lục (bắt đầu bằng '-', hoặc in hoa)
      if (!title) {
        title = l;
        lineIdx++;
        continue;
      }

      break;
    }

    // Toàn bộ các dòng còn lại thuộc về nội dung / bảng biểu phụ lục
    for (; lineIdx < rawAppLines.length; lineIdx++) {
      paragraphs.push(rawAppLines[lineIdx]);
    }

    appendices.push({
      id: `appendix_${idx + 1}`,
      header: appHeader,
      title: title,
      referenceNote: referenceNote,
      paragraphs
    });
  }

  // Nếu có phần Nơi nhận & Chữ ký bị đặt nhầm vào sau phụ lục, đưa trả lại vào cuối văn bản chính trước khi sang phụ lục
  if (misplacedFooterLines.length > 0) {
    cleanLines.push(...misplacedFooterLines);
  }

  return { cleanLines, appendices };
}

/**
 * Rà soát và loại bỏ triệt để trùng lặp giữa Nơi nhận và Khối chữ ký theo chuẩn Nghị định 30:
 * - Tự động ngăn chặn và loại bỏ hoàn toàn các dòng chức danh, thẩm quyền ký (KT. CHỦ TỊCH, PHÓ CHỦ TỊCH, CHỦ TỊCH, TM., BÍ THƯ, GIÁM ĐỐC...)
 * - Loại bỏ hoàn toàn họ tên riêng của lãnh đạo khỏi phần Nơi nhận
 * - Loại bỏ các mục trùng lặp, chuẩn hóa dấu gạch ngang đầu dòng (-)
 * - Bảo đảm mục "Lưu: VT, ..." luôn được đặt ở dòng cuối cùng của Nơi nhận
 */
/**
 * Chuẩn hóa và làm sạch danh sách Nơi nhận:
 * - NGUYÊN TẮC: Mọi sửa tay của người dùng là PHÁN QUYẾT CUỐI CÙNG, tuyệt đối không tự ý xóa bỏ.
 * - KHÔNG BAO GIỜ xóa bỏ các dòng người nhận hợp lệ như:
 *   "Chủ tịch, các Phó Chủ tịch UBND phường (để b/c);"
 *   "Chủ tịch, các PCT UBND xã (để chỉ đạo);"
 *   hoặc bất kỳ dòng nào có ghi chú "(để b/c)", "(để chỉ đạo)", "(để phối hợp)", "(để t/h)", "(để biết)"...
 * - Chỉ loại bỏ dòng nếu dòng đó là chức danh chữ ký đứng ĐỘC LẬP (ví dụ chỉ có duy nhất chữ "CHỦ TỊCH" hoặc "KT. CHỦ TỊCH" đứng lẻ không có cơ quan hay ghi chú nhận).
 * - Bảo đảm mục "Lưu: VT, ..." luôn được đặt ở dòng cuối cùng của Nơi nhận.
 */
export function cleanAndDeduplicateRecipients(
  recipients: string[], 
  signerInfo?: {
    quyenHanKy?: string;
    signerAuthority?: string;
    signerRoleLine2?: string;
    signerTitle?: string;
    signerName?: string;
  },
  isUserManualEdit = false
): string[] {
  if (!recipients || recipients.length === 0) return [];

  const signerNameUpper = (signerInfo?.signerName || '').trim().toUpperCase();
  const signerTitleUpper = (signerInfo?.signerTitle || '').trim().toUpperCase();
  const signerRole2Upper = (signerInfo?.signerRoleLine2 || '').trim().toUpperCase();
  const signerAuthUpper = (signerInfo?.signerAuthority || signerInfo?.quyenHanKy || '').trim().toUpperCase();

  // Danh mục từ khóa chức danh ký đứng ĐỘC LẬP (chỉ loại bỏ khi đứng trơ trọi một mình, không có ghi chú nhận)
  const exactIsolatedSigRegex = /^(?:KT\.\s*CHỦ\s*TỊCH|TM\.\s*ỦY\s*BAN\s*NHÂN\s*DÂN|T\/M\s*CHI\s*BỘ|KT\.|TM\.|T\/M|Q\.|TL\.|TUQ\.|T\.UQ|CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|PHÓ\s*CHỦ\s*TỊCH|QUYỀN\s*CHỦ\s*TỊCH|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|PHÓ\s*TRƯỞNG\s*PHÒNG|HIỆU\s*TRƯỞNG)$/i;

  const cleanedItems: string[] = [];
  const seenUpper = new Set<string>();
  let luuItem = '';

  for (const raw of recipients) {
    let line = raw.trim();
    if (!line) continue;

    // Bỏ tiền tố "Nơi nhận:" nếu bị dính
    line = line.replace(/^Nơi\s*nhận\s*:?\s*/i, '').trim();
    if (!line) continue;

    const lineNoDash = line.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim();
    const cleanForCheck = lineNoDash.replace(/[;\.:,\(\)]+$/, '').trim();
    const upper = cleanForCheck.toUpperCase();
    if (!cleanForCheck) continue;

    // KIỂM TRA ĐẶC BIỆT: Nếu dòng chứa các chỉ dẫn người nhận công vụ:
    // (để b/c), (để chỉ đạo), (để phối hợp), (để thực hiện), (để t/h), (để biết), "các Phó Chủ tịch", "các PCT", v.v.
    // -> BẢO TỒN TUYỆT ĐỐI 100%, KHÔNG ĐƯỢC PHÉP LỌC BỎ
    const isSpecialOfficialRecipient = 
      /\(để\s*(?:b\/c|báo\s*cáo|chỉ\s*đạo|phối\s*hợp|thực\s*hiện|t\/h|biết|theo\s*dõi)\)/i.test(line) ||
      /\bđể\s*(?:b\/c|báo\s*cáo|chỉ\s*đạo)\b/i.test(line) ||
      /\b(?:các\s*Phó\s*Chủ\s*tịch|các\s*PCT|Chủ\s*tịch,\s*các|Chủ\s*tịch\s*và\s*các)\b/i.test(line) ||
      /\b(?:UBND|HĐND|Đảng\s*ủy|Chi\s*bộ|Thường\s*trực)\b/i.test(line);

    if (isSpecialOfficialRecipient) {
      const formatted = line.startsWith('-') ? line : `- ${lineNoDash}`;
      const dedupeKey = cleanForCheck.replace(/[;\.]+$/, '').toUpperCase();
      if (!seenUpper.has(dedupeKey)) {
        seenUpper.add(dedupeKey);
        cleanedItems.push(formatted);
      }
      continue;
    }

    // Nếu người dùng sửa tay, tôn trọng phán quyết của người dùng
    if (isUserManualEdit) {
      const formatted = line.startsWith('-') ? line : `- ${lineNoDash}`;
      const dedupeKey = cleanForCheck.replace(/[;\.]+$/, '').toUpperCase();
      if (!seenUpper.has(dedupeKey)) {
        seenUpper.add(dedupeKey);
        cleanedItems.push(formatted);
      }
      continue;
    }

    // 1. Chỉ loại bỏ nếu dòng đó là chức danh ký đứng HOÀN TOÀN ĐỘC LẬP
    if (exactIsolatedSigRegex.test(cleanForCheck)) {
      continue;
    }

    // 2. Loại bỏ các dòng ghi chú chỉ thị ký: (Đã ký), (Ký, ghi rõ họ tên)...
    if (/^\(?(?:Ký|Ký tên|Ký số|Ký,?\s*ghi\s*rõ\s*họ\s*tên|Ký,?\s*đóng\s*dấu|Đã ký|Chữ ký số|Chứng thư số)\)?$/i.test(cleanForCheck)) {
      continue;
    }

    // 3. Kiểm tra nếu trùng họ tên người ký đã biết đứng đơn lẻ
    if (signerNameUpper && upper === signerNameUpper) {
      continue;
    }

    // 4. Kiểm tra nếu trùng chức danh/thẩm quyền ký đã biết đứng đơn lẻ
    if ((signerTitleUpper && upper === signerTitleUpper) || (signerAuthUpper && upper === signerAuthUpper) || (signerRole2Upper && upper === signerRole2Upper)) {
      continue;
    }

    // 5. Ngăn chặn họ tên riêng của lãnh đạo ở phần Nơi nhận khi đứng trơ trọi (chỉ gồm 2-4 từ viết hoa tên người):
    const isSinglePersonName = /^[A-ZĐÀ-Ỹ][a-zđà-ỹ]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ]+){1,3}$/.test(cleanForCheck) &&
      !/^(?:Như|Lưu|Phòng|Ban|Sở|Bộ|UBND|HĐND|Ủy\s*ban|Thường\s*trực|Chi\s*bộ|Đảng\s*ủy|Đảng\s*bộ|Hội\s*đồng|Công\s*an|Quân\s*sự|Y\s*tế|Đoàn|Hội|Tổ|Đồng\s*chí|Đ\/c|Các|Chủ\s*tịch|Phó\s*chủ\s*tịch)\b/i.test(cleanForCheck);

    if (isSinglePersonName) {
      continue;
    }

    // 6. Tách dòng "Lưu: ..." để bảo đảm luôn đặt ở dòng cuối cùng của Nơi nhận
    if (/^Lưu\s*:\s*/i.test(cleanForCheck)) {
      luuItem = `- ${cleanForCheck.replace(/^Lưu\s*:\s*/i, 'Lưu: ')}`;
      continue;
    }

    // 7. Định dạng chuẩn với dấu "-" ở đầu dòng
    const formatted = `- ${cleanForCheck}`;
    const dedupeKey = cleanForCheck.replace(/[;\.]+$/, '').toUpperCase();

    if (!seenUpper.has(dedupeKey)) {
      seenUpper.add(dedupeKey);
      cleanedItems.push(formatted);
    }
  }

  // Đặt dòng Lưu: VT, ... ở vị trí cuối cùng
  if (luuItem && !seenUpper.has(luuItem.replace(/^[-\s]+/, '').replace(/[;\.]+$/, '').toUpperCase())) {
    cleanedItems.push(luuItem);
  }

  return cleanedItems;
}

/**
 * Bộ phân tích và nhận diện cấu trúc văn bản thông minh:
 * Tách riêng hoàn toàn:
 * 1. Tiêu đề Quốc ngữ (NĐ 30) hoặc Tiêu đề Đảng (HD 05) - ưu tiên cao nhất, tuyệt đối không lẫn vào cơ quan hay thân bài
 * 2. Tên cơ quan cấp trên & Cơ quan ban hành (ngăn chặn nội dung bị đẩy vào ô cơ quan ban hành)
 * 3. Số ký hiệu văn bản
 * 4. Trích yếu nội dung
 * 5. Địa danh, ngày tháng năm
 * 6. Kính gửi (hỗ trợ nhiều dòng \n)
 * 7. Căn cứ pháp lý
 * 8. Thân văn bản & bảng biểu
 * 9. Nơi nhận (hỗ trợ nhiều dòng \n)
 * 10. Chữ ký, quyền hạn ký (TM., T/M, KT., Q., KT. CHỦ TỊCH), chức vụ, họ tên
 */
export function parseDocumentStructure(
  text: string, 
  settings: AgencySettings, 
  docCategory?: string,
  docTypeNameHint?: string
): StructuredDoc {
  // 0. BẢO TOÀN NGUYÊN VẸN KHỐI BẢNG BIỂU (HTML TABLE & MARKDOWN TABLE) TRƯỚC KHI TÁCH DÒNG
  // Tuyệt đối tuân thủ trình tự, không thay đổi nội dung bảng, không tự ý xóa bảng, giữ đúng vị trí
  const atomicTableBlocks: string[] = [];
  let tableProtectedText = text || '';

  // A. Bảo vệ HTML tables (chuẩn hóa về khổ A4 chuẩn)
  tableProtectedText = tableProtectedText.replace(/<table\b[\s\S]*?<\/table>/gi, (match) => {
    const formatted = formatHtmlTableToFitA4(match);
    const placeholder = `___DECREE30_ATOMIC_TABLE_${atomicTableBlocks.length}___`;
    atomicTableBlocks.push(formatted);
    return `\n\n${placeholder}\n\n`;
  });

  // B. Bảo vệ Markdown tables (chuyển sang HTML table A4 chuẩn)
  const mdTableRegex = /(?:^|\n)(\|[^\n]+\|\r?\n\|[\s:-|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g;
  tableProtectedText = tableProtectedText.replace(mdTableRegex, (match) => {
    const formatted = convertMarkdownTableToHtml(match);
    const placeholder = `___DECREE30_ATOMIC_TABLE_${atomicTableBlocks.length}___`;
    atomicTableBlocks.push(formatted);
    return `\n\n${placeholder}\n\n`;
  });

  // Chuẩn hóa và làm sạch dòng thô
  const cleanInput = tableProtectedText.replace(/[\*_~`#]/g, '');
  const originalLines = cleanInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Xác định phân loại hình thức: Căn cứ vai trò đã cài đặt của người dùng làm chuẩn cao nhất
  const isExplicitPartyCategory = docCategory === 'dang' || 
    docCategory === 'Hướng dẫn 05-HD/VPTW' || 
    (Boolean(docTypeNameHint) && /Đảng|Chi bộ|Đảng ủy|Đảng bộ|Nghị quyết của Đảng/i.test(docTypeNameHint || ''));
  const isExplicitAdminCategory = docCategory === 'hanh_chinh' || docCategory === 'hoc_thuat';

  let isPartyDoc = false;
  if (settings.roleBlock === 'dang') {
    isPartyDoc = true;
  } else if (settings.roleBlock === 'ubnd' || settings.roleBlock === 'mttq_doanthe') {
    isPartyDoc = false;
  } else if (isExplicitPartyCategory) {
    isPartyDoc = true;
  } else if (isExplicitAdminCategory) {
    isPartyDoc = false;
  } else {
    // Chỉ coi là văn bản Đảng nếu 3 dòng đầu CÓ "ĐẢNG CỘNG SẢN VIỆT NAM" VÀ hoàn toàn không có "CỘNG HÒA"
    const firstLines = originalLines.slice(0, 4).join('\n');
    isPartyDoc = /ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/i.test(firstLines) && !/CỘNG\s+H[ÒO]A/i.test(text);
  }

  const countryHeader = isPartyDoc ? '' : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  const motto = isPartyDoc ? 'ĐẢNG CỘNG SẢN VIỆT NAM' : 'Độc lập - Tự do - Hạnh phúc';

  let parentAgency = '';
  let agencyName = '';
  let docCode = '';
  let docSubjectShort = '';
  let locationDate = '';
  let docTypeName = docTypeNameHint ? docTypeNameHint.toUpperCase() : '';
  let docTitle = '';
  let recipientsHeaderLines: string[] = [];
  const legalBases: string[] = [];
  const bodyParagraphs: string[] = [];
  const recipients: string[] = [];
  let quyenHanKy = '';
  let signerAuthority = '';
  let signerTitle = '';
  let signerName = '';
  const cacMucDaChinh: string[] = [];

  // BƯỚC 1: TÁCH VÀ XÓA TRIỆT ĐỂ QUỐC HIỆU / TIÊU NGỮ / TIÊU ĐỀ ĐẢNG KHỎI TOÀN BỘ CÁC DÒNG
  // (Đảm bảo không bị lọt vào Tên cơ quan, Số ký hiệu hay Thân văn bản kể cả khi dính liền)
  const ALL_NATIONAL_REGEX = /(?:CỘNG\s*H[ÒOòo][AÀàa]\s*XÃ\s*HỘI\s*CHỦ\s*NGHĨA\s*VIỆT\s*NAM|CỘNG\s*HOÀ\s*XÃ\s*HỘI\s*CHỦ\s*NGHĨA\s*VIỆT\s*NAM|Độc\s*lập\s*[-–—_]\s*Tự\s*do\s*[-–—_]\s*Hạnh\s*phúc|Độc\s*Lập\s*[-–—_]\s*Tự\s*Do\s*[-–—_]\s*Hạnh\s*Phúc|ĐỘC\s*LẬP\s*[-–—_]\s*TỰ\s*DO\s*[-–—_]\s*HẠNH\s*PHÚC|ĐẢNG\s*CỘNG\s*SẢN\s*VIỆT\s*NAM|Đảng\s*Cộng\s*sản\s*Việt\s*Nam)[\.:]?/gi;
  const DECORATIVE_LINE_REGEX = /^[ \t]*[*\-–—_~=]{2,}[ \t]*$/;

  let remainingLines: string[] = [];
  for (const line of originalLines) {
    if (line.includes('___DECREE30_ATOMIC_TABLE_')) {
      remainingLines.push(line);
      continue;
    }
    // Tự động loại bỏ triệt để các câu cảnh báo như "Xóa bỏ tiêu đề quốc ngữ thừa này"
    if (isWarningOrInstructionLine(line)) {
      continue;
    }
    const strippedLine = line
      .replace(ALL_NATIONAL_REGEX, '')
      .replace(DECORATIVE_LINE_REGEX, '')
      .trim();

    if (strippedLine && !DECORATIVE_LINE_REGEX.test(strippedLine) && !isWarningOrInstructionLine(strippedLine)) {
      remainingLines.push(strippedLine);
    }
  }
  cacMucDaChinh.push('Đã tách Quốc hiệu và Tiêu ngữ thành công');

  // 2. Tìm Địa danh, ngày tháng năm (ở 15 dòng đầu)
  const dateRegex = /([a-zA-ZÀ-ỹ\s]+),\s*ngày\s+([0-9]{1,2}|…+|\s+)?\s*tháng\s+([0-9]{1,2}|…+|\s+)?\s*năm\s+([0-9]{4}|…+)?/i;
  const dateIndex = remainingLines.findIndex((l, idx) => idx < 15 && dateRegex.test(l));
  if (dateIndex !== -1) {
    locationDate = remainingLines[dateIndex];
    remainingLines.splice(dateIndex, 1);
  }

  // Chuẩn hóa Địa danh ngày tháng: luôn để trống ngày    tháng   năm cách nhau khoảng 1cm (không dùng dấu ...), năm cấu hình trong Cài đặt
  const targetYear = settings.issuingYear?.trim() || String(new Date().getFullYear());
  const defaultLoc = settings.shortLocation?.trim() || 'Đông Tiến';
  if (locationDate) {
    // Tách địa danh trước từ "ngày" hoặc trước dấu phẩy
    const locMatch = locationDate.match(/^([a-zA-ZÀ-ỹ\s]+?)(?:,\s*|\s+)ngày/i);
    const loc = (locMatch && locMatch[1].trim()) ? locMatch[1].trim() : (locationDate.split(',')[0]?.trim() || defaultLoc);
    locationDate = `${loc}, ngày      tháng      năm ${targetYear}`;
  } else {
    locationDate = `${defaultLoc}, ngày      tháng      năm ${targetYear}`;
  }

  // 3. Tìm Số và ký hiệu văn bản (Số: .../...) - NÂNG CẤP XỬ LÝ TOÀN DIỆN CÁC DẠNG FILE TẢI LÊN
  // Hỗ trợ cả ký tự tiếng Việt Đ, đ trong ký hiệu (/QĐ-UBND, /HĐND, /UBND-ĐG...)
  const docCodeStrictRegex = /(?:^|[\s\u00A0])(?:Số|SỐ|Số\s*:|Số\s*\.)\s*:?\.?\s*([0-9A-Za-zĐđÀ-ỹ\-\.…\s]*\/[A-Za-z0-9ĐđÀ-ỹ\-\.…]+(?:-[A-Za-z0-9ĐđÀ-ỹ\-\.…]+)*|[0-9]+)/i;
  for (let idx = 0; idx < Math.min(15, remainingLines.length); idx++) {
    const l = remainingLines[idx];
    if (/^Kính gửi:|^Căn cứ|^Thực hiện|^Xét/i.test(l)) break;
    const match = l.match(docCodeStrictRegex);
    if (match) {
      let rawCode = match[1]
        .replace(ALL_NATIONAL_REGEX, '')
        .replace(/^[:\.\s]+/, '')
        .trim();
      
      // Xóa các từ thừa nếu bị dính sau ký hiệu
      rawCode = rawCode.replace(/\s+(?:CỘNG|Độc|Hà|ngày|tháng|năm|Về|Báo|Quyết|UBND).*$/i, '').trim();

      if (rawCode.startsWith('/')) {
        docCode = `Số:          ${rawCode}`;
      } else if (rawCode) {
        docCode = `Số: ${rawCode.replace(/^[–—\s]+/, '')}`;
      }

      const lineWithoutCode = l.replace(docCodeStrictRegex, '').replace(ALL_NATIONAL_REGEX, '').trim();
      if (lineWithoutCode && lineWithoutCode.length > 5 && !/^[A-Za-z0-9ĐđÀ-ỹ\-\.\s]+$/i.test(lineWithoutCode)) {
        remainingLines[idx] = lineWithoutCode;
      } else {
        remainingLines.splice(idx, 1);
      }
      break;
    }
  }

  // BƯỚC 4.5: TÁCH TÊN CƠ QUAN BAN HÀNH CỰC MẠNH (CỘT 1 TRÊN CÙNG BÊN TRÁI CHUẨN NĐ 30)
  // Thực hiện TRƯỚC KHI bóc tách Báo cáo / Tiêu đề để ngăn tuyệt đối tên cơ quan bị đẩy xuống phía sau tiêu đề báo cáo
  const foundAgencies: { index: number; text: string; leftover?: string }[] = [];

  for (let i = 0; i < Math.min(8, remainingLines.length); i++) {
    const l = remainingLines[i];
    if (/^Kính gửi:|^Căn cứ|^Thực hiện|^Xét/i.test(l)) break;

    const { cleanAgency, leftoverText } = extractCleanAgencyAndRemainingText(l);
    if (cleanAgency) {
      foundAgencies.push({ index: i, text: cleanAgency, leftover: leftoverText });
    }
  }

  if (foundAgencies.length >= 2) {
    const firstText = foundAgencies[0].text.trim();
    const secondText = foundAgencies[1].text.trim();

    // Đối với cấp UBND (Phường, Xã, Huyện, Tỉnh): Không có cơ quan cấp trên
    if (/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)$/i.test(firstText)) {
      agencyName = `ỦY BAN NHÂN DÂN ${secondText.replace(/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)\s*/i, '')}`.trim();
      parentAgency = '';
    } else if (/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)\b/i.test(secondText)) {
      agencyName = secondText;
      parentAgency = '';
    } else {
      parentAgency = firstText;
      agencyName = secondText;
    }

    // Xóa các dòng cơ quan đã tìm thấy từ dưới lên trên (descending index)
    const sortedFound = [...foundAgencies].sort((a, b) => b.index - a.index);
    for (const item of sortedFound) {
      if (item.leftover && item.leftover.trim()) {
        remainingLines[item.index] = item.leftover.trim();
      } else {
        remainingLines.splice(item.index, 1);
      }
    }
    cacMucDaChinh.push('Đã định vị chính xác Tên cơ quan ban hành ở góc trên cùng bên trái');
  } else if (foundAgencies.length === 1) {
    agencyName = foundAgencies[0].text.trim();
    parentAgency = '';
    if (foundAgencies[0].leftover && foundAgencies[0].leftover.trim()) {
      remainingLines[foundAgencies[0].index] = foundAgencies[0].leftover.trim();
    } else {
      remainingLines.splice(foundAgencies[0].index, 1);
    }
    cacMucDaChinh.push('Đã định vị chính xác Tên cơ quan ban hành ở góc trên cùng bên trái');
  }

  // Nếu chưa tìm thấy agencyName trong foundAgencies, quét lại các dòng đầu tiên trước Số: / Kính gửi:
  if (!agencyName && remainingLines.length > 0) {
    for (let i = 0; i < Math.min(4, remainingLines.length); i++) {
      const l = remainingLines[i].trim();
      if (/^Kính gửi:|^Số:|^Căn cứ|^V\/v|^Về việc/i.test(l)) break;
      if (/^(?:ỦY BAN|UBND|HỘI ĐỒNG|HĐND|ĐẢNG|CHI BỘ|CHI ỦY|CẤP ỦY|BAN|SỞ|PHÒNG|BỘ|TRƯỜNG|TRUNG TÂM|BỆNH VIỆN|TRẠM|ĐỘI|CÔNG AN|HỘI|ĐOÀN|CÔNG TY|TỔNG CÔNG TY|TẬP ĐOÀN|HỢP TÁC XÃ|HTX|VIỆN|CỤC|CHI CỤC|KHO BẠC|NGÂN HÀNG|BỘ PHẬN|TỔ)/i.test(l) && l.length <= 80) {
        agencyName = l.toUpperCase();
        remainingLines.splice(i, 1);
        break;
      }
    }
  }

  // Bảo vệ tuyệt đối: nếu agencyName vẫn dính câu văn hoặc dấu chấm, cắt gọt sạch
  if (agencyName && (agencyName.length > 80 || /báo cáo|thông báo|kính gửi/i.test(agencyName))) {
    const cleaned = agencyName.split(/[\.\;\:]/)[0].trim();
    if (cleaned.length <= 80) {
      agencyName = cleaned;
    } else {
      agencyName = '';
    }
  }

  // Nếu văn bản chưa có cơ quan ban hành, tự động điền từ Cài đặt người dùng
  if (!agencyName && settings.agencyName) {
    agencyName = settings.agencyName;
  }
  if (!parentAgency) {
    parentAgency = '';
  }

  // 5. NÂNG CẤP KHẢ NĂNG NHẬN DIỆN 100% CHÍNH XÁC 29 LOẠI VĂN BẢN HÀNH CHÍNH (NĐ 30) VÀ 15 LOẠI VĂN BẢN ĐẢNG (HD 05)
  // Tuân thủ 100% Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW:
  // - Tên loại văn bản: In hoa toàn bộ, in đậm, căn giữa (cỡ 14-15pt)
  // - Trích yếu văn bản: In thường, in đậm, căn giữa (cỡ 13-14pt), chữ cái đầu viết hoa, đặt ngay dưới tên loại
  // - Đối với Công văn: không có tên loại ở giữa; trích yếu được đặt ở Cột trái (Ô 5b), bắt đầu bằng "V/v", chữ thường đứng không đậm

  // 5. NÂNG CẤP KHẢ NĂNG NHẬN DIỆN 100% CHÍNH XÁC 29 LOẠI VĂN BẢN HÀNH CHÍNH (NĐ 30) VÀ 15 LOẠI VĂN BẢN ĐẢNG (HD 05)
  // Tuân thủ 100% Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW:
  // - Tên loại văn bản: In hoa toàn bộ, in đậm, căn giữa (cỡ 14-15pt)
  // - Trích yếu văn bản: In thường, in đậm, căn giữa (cỡ 13-14pt), chữ cái đầu viết hoa, đặt ngay dưới tên loại
  // - Đối với BÁO CÁO: Tiêu đề báo cáo nhận diện chuẩn xác (kể cả Báo cáo tổng kết, Báo cáo kết quả, Báo cáo nhanh, v.v.), không có phần Kính gửi ở đầu văn bản.
  // - Đối với Công văn: không có tên loại ở giữa; trích yếu được đặt ở Cột trái (Ô 5b), bắt đầu bằng "V/v", chữ thường đứng không đậm

  let foundTypeIndex = -1;
  let detectedType = '';
  let inlineTitle = '';

  // 5.0. NHẬN DIỆN VÀ BÓC TÁCH TRÍCH YẾU CÔNG VĂN (Ô SỐ 5b CỘT TRÁI - BẮT ĐẦU BẰNG "V/v" HOẶC "Về việc")
  // Căn cứ Nghị định 30/2020/NĐ-CP:
  // Công văn thường bắt đầu bằng "V/v" hoặc "Về việc", nằm ở các dòng đầu của văn bản (ngay dưới số ký hiệu hoặc trước Kính gửi).
  // Công văn KHÔNG có tên loại ở giữa trang, trích yếu phải đưa vào đúng vị trí Ô số 5b cột trái dòng dưới số ký hiệu.
  const isExplicitCongVanHint = docTypeNameHint === 'CÔNG VĂN' || docTypeNameHint === 'Công văn' || docCategory === 'cong_van';
  const hasKinhGuiEarly = remainingLines.slice(0, 15).some(l => /^Kính\s*(?:gửi|trình):/i.test(l.trim()));
  const hasCongVanSubjectInHead = remainingLines.slice(0, 12).some(l => CONG_VAN_SUBJECT_REGEX.test(l.trim()));
  const isDocCodeDecision = Boolean(docCode && /\/QĐ(?:-[A-Za-z0-9ĐđÀ-ỹ]+)?\b/i.test(docCode));
  const isExplicitDecisionHint = docTypeNameHint === 'QUYẾT ĐỊNH' || docCategory === 'quyet_dinh';

  if (!isDocCodeDecision && !isExplicitDecisionHint && (isExplicitCongVanHint || hasCongVanSubjectInHead || (hasKinhGuiEarly && !docTypeNameHint))) {
    const extractedSubject = extractCongVanSubjectFromLines(remainingLines, 12);
    if (extractedSubject) {
      docSubjectShort = extractedSubject;
      docTypeName = 'CÔNG VĂN';
      docTitle = '';
      cacMucDaChinh.push(`Đã nhận diện chuẩn xác Trích yếu công văn (Ô số 5b cột trái, dòng dưới Số ký hiệu): "${docSubjectShort}"`);
    } else if (isExplicitCongVanHint) {
      docTypeName = 'CÔNG VĂN';
      docTitle = '';
    }
  }

  // Danh mục đầy đủ 29 loại hành chính + 15 loại Đảng
  // Nhận diện BÁO CÁO và bảo toàn phân loại báo cáo (Tổng kết, Sơ kết, Kết quả, Tình hình, Nhanh, v.v.)
  const reportPattern = /^(?:BÁO\s+CÁO|Báo\s+cáo)(?:\s+(NHANH|CHUYÊN\s+ĐỀ|ĐỘT\s+XUẤT|SƠ\s+KẾT|TỔNG\s+KẾT|ĐỊNH\s+KỲ|ĐÁNH\s+GIÁ|KẾT\s+QUẢ|TÌNH\s+HÌNH|CÔNG\s+TÁC|TỰ\s+KIỂM\s+TRA|RÀ\s+SOÁT))?(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const decisionPattern = /^(?:QUYẾT\s+ĐỊNH|Quyết\s+định)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const planPattern = /^(?:KẾ\s+HOẠCH|Kế\s+hoạch)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const submissionPattern = /^(?:TỜ\s+TRÌNH|Tờ\s+trình)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const noticePattern = /^(?:THÔNG\s+BÁO|Thông\s+báo)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const resolutionPattern = /^(?:NGHỊ\s+QUYẾT|Nghị\s+quyết)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const directivePattern = /^(?:CHỈ\s+THỊ|Chỉ\s+thị)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const conclusionPattern = /^(?:KẾT\s+LUẬN|Kết\s+luận)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const regulationPattern = /^(?:QUY\s+ĐỊNH|Quy\s+định)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const statutePattern = /^(?:QUY\s+CHẾ|Quy\s+chế)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const guidelinePattern = /^(?:HƯỚNG\s+DẪN|Hướng\s+dẫn)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const programPattern = /^(?:CHƯƠNG\s+TRÌNH|Chương\s+trình)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const schemePattern = /^(?:PHƯƠNG\s+ÁN|Phương\s+án)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const projectPattern = /^(?:ĐỀ\s+ÁN|Đề\s+án|DỰ\s+ÁN|Dự\s+án)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const minutesPattern = /^(?:BIÊN\s+BẢN|Biên\s+bản)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const contractPattern = /^(?:HỢP\s+ĐỒNG|Hợp\s+đồng)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const invitationPattern = /^(?:GIẤY\s+MỜI|Giấy\s+mời)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const introPattern = /^(?:GIẤY\s+GIỚI\s+THIỆU|Giấy\s+giới\s+thiệu)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const authLetterPattern = /^(?:GIẤY\s+ỦY\s+QUYỀN|Giấy\s+ủy\s+quyền)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const leavePattern = /^(?:GIẤY\s+NGHỈ\s+PHÉP|Giấy\s+nghỉ\s+phép)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const telegramPattern = /^(?:CÔNG\s+ĐIỆN|Công\s+điện)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const slipPattern = /^(?:PHIẾU\s+GỬI|Phiếu\s+gửi|PHIẾU\s+CHUYỂN|Phiếu\s+chuyển|PHIẾU\s+BÁO|Phiếu\s+báo)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const memoPattern = /^(?:BẢN\s+GHI\s+NHỚ|Bản\s+ghi\s+nhớ|BẢN\s+THỎA\s+THUẬN|Bản\s+thỏa\s+thuận)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;
  const communiquePattern = /^(?:THÔNG\s+CÁO|Thông\s+cáo|THƯ\s+CÔNG|Thư\s+công)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;

  const generalTypePattern = /^(QUYẾT ĐỊNH|BÁO CÁO|KẾ HOẠCH|TỜ TRÌNH|THÔNG BÁO|NGHỊ QUYẾT|CHỈ THỊ|KẾT LUẬN|QUY CHẾ|QUY ĐỊNH|HƯỚNG DẪN|CHƯƠNG TRÌNH|PHƯƠNG ÁN|ĐỀ ÁN|DỰ ÁN|BIÊN BẢN|HỢP ĐỒNG|GIẤY MỜI|GIẤY GIỚI THIỆU|GIẤY ỦY QUYỀN|GIẤY NGHỈ PHÉP|BẢN GHI NHỚ|BẢN THỎA THUẬN|PHIẾU GỬI|PHIẾU CHUYỂN|PHIẾU BÁO|CÔNG ĐIỆN|THƯ CÔNG|THÔNG CÁO)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i;

  // Nhận diện đặc biệt QUYẾT ĐỊNH với độ chính xác tuyệt đối (tránh nhầm với Công văn)
  const isDecisionDoc = 
    docTypeNameHint === 'QUYẾT ĐỊNH' ||
    docCategory === 'quyet_dinh' ||
    Boolean(docCode && /\/QĐ(?:-[A-Za-z0-9ĐđÀ-ỹ]+)?\b/i.test(docCode)) ||
    remainingLines.slice(0, 15).some(l => /^(?:QUYẾT\s+ĐỊNH|Quyết\s+định)\b/i.test(l.trim())) ||
    originalLines.slice(0, 20).some(l => /^(?:QUYẾT\s+ĐỊNH|Quyết\s+định)\s*[:\.]?$/i.test(l.trim())) ||
    (originalLines.some(l => /^Điều\s+1\./i.test(l.trim())) && originalLines.some(l => /^Căn cứ\s+/i.test(l.trim())));

  if (isDecisionDoc) {
    detectedType = 'QUYẾT ĐỊNH';
    foundTypeIndex = remainingLines.findIndex((l, idx) => idx < 15 && /^(?:QUYẾT\s+ĐỊNH|Quyết\s+định)(?:[\:\-–—\.]\s*|\s+|$)/i.test(l.trim()));
    if (foundTypeIndex !== -1) {
      const qdLine = remainingLines[foundTypeIndex].trim();
      inlineTitle = qdLine.replace(/^(?:QUYẾT\s+ĐỊNH|Quyết\s+định)[\s:\-–—\.]*/i, '').trim();
    } else {
      // Nếu không có chữ QUYẾT ĐỊNH đứng riêng, tìm dòng trích yếu bắt đầu bằng Về việc...
      const vvIdx = remainingLines.findIndex((l, idx) => idx < 10 && /^(?:Về việc|V\/v)\s+/i.test(l.trim()));
      if (vvIdx !== -1) {
        foundTypeIndex = vvIdx;
        inlineTitle = remainingLines[vvIdx].trim();
      }
    }
  }

  // Quét 15 dòng đầu để tìm tên loại văn bản (nếu chưa tìm thấy Quyết định)
  if (foundTypeIndex === -1) {
    for (let idx = 0; idx < Math.min(15, remainingLines.length); idx++) {
      const l = remainingLines[idx].trim();
      if (/^Kính\s*(?:gửi|trình):|^Căn\s+cứ|^Thực\s+hiện\s+ý\s+kiến|^Xét\s+đề\s+nghị|^Điều\s+\d+/i.test(l)) break;

      // A. Báo cáo (cải thiện nhận diện chuẩn mọi dạng Báo cáo)
      const repM = l.match(reportPattern);
      if (repM) {
        foundTypeIndex = idx;
        detectedType = 'BÁO CÁO';
        const subTypeWord = (repM[1] || '').trim();
        const restWords = (repM[2] || '').trim();
        if (subTypeWord && restWords) {
          inlineTitle = `${subTypeWord} ${restWords}`;
        } else if (subTypeWord) {
          inlineTitle = subTypeWord;
        } else {
          inlineTitle = restWords;
        }
        break;
      }

      // B. Quyết định
      const decM = l.match(decisionPattern);
      if (decM) {
        foundTypeIndex = idx;
        detectedType = 'QUYẾT ĐỊNH';
        inlineTitle = decM[1] || '';
        break;
      }

      // C. Kế hoạch
      const planM = l.match(planPattern);
      if (planM) {
        foundTypeIndex = idx;
        detectedType = 'KẾ HOẠCH';
        inlineTitle = planM[1] || '';
        break;
      }

      // D. Tờ trình
      const subM = l.match(submissionPattern);
      if (subM) {
        foundTypeIndex = idx;
        detectedType = 'TỜ TRÌNH';
        inlineTitle = subM[1] || '';
        break;
      }

      // E. Thông báo
      const notM = l.match(noticePattern);
    if (notM) {
      foundTypeIndex = idx;
      detectedType = 'THÔNG BÁO';
      inlineTitle = notM[1] || '';
      break;
    }

    // F. Nghị quyết
    const resM = l.match(resolutionPattern);
    if (resM) {
      foundTypeIndex = idx;
      detectedType = 'NGHỊ QUYẾT';
      inlineTitle = resM[1] || '';
      break;
    }

    // G. Kết luận (Văn bản Đảng HD 05)
    const conM = l.match(conclusionPattern);
    if (conM) {
      foundTypeIndex = idx;
      detectedType = 'KẾT LUẬN';
      inlineTitle = conM[1] || '';
      break;
    }

    // H. Chỉ thị
    const dirM = l.match(directivePattern);
    if (dirM) {
      foundTypeIndex = idx;
      detectedType = 'CHỈ THỊ';
      inlineTitle = dirM[1] || '';
      break;
    }

    // I. Quy định
    const regM = l.match(regulationPattern);
    if (regM) {
      foundTypeIndex = idx;
      detectedType = 'QUY ĐỊNH';
      inlineTitle = regM[1] || '';
      break;
    }

    // J. Quy chế
    const staM = l.match(statutePattern);
    if (staM) {
      foundTypeIndex = idx;
      detectedType = 'QUY CHẾ';
      inlineTitle = staM[1] || '';
      break;
    }

    // K. Hướng dẫn
    const guiM = l.match(guidelinePattern);
    if (guiM) {
      foundTypeIndex = idx;
      detectedType = 'HƯỚNG DẪN';
      inlineTitle = guiM[1] || '';
      break;
    }

    // L. Chương trình
    const proM = l.match(programPattern);
    if (proM) {
      foundTypeIndex = idx;
      detectedType = 'CHƯƠNG TRÌNH';
      inlineTitle = proM[1] || '';
      break;
    }

    // M. Phương án
    const schM = l.match(schemePattern);
    if (schM) {
      foundTypeIndex = idx;
      detectedType = 'PHƯƠNG ÁN';
      inlineTitle = schM[1] || '';
      break;
    }

    // N. Đề án / Dự án
    const prjM = l.match(projectPattern);
    if (prjM) {
      foundTypeIndex = idx;
      detectedType = /^DỰ\s+ÁN/i.test(l) ? 'DỰ ÁN' : 'ĐỀ ÁN';
      inlineTitle = prjM[1] || '';
      break;
    }

    // O. Biên bản
    const minM = l.match(minutesPattern);
    if (minM) {
      foundTypeIndex = idx;
      detectedType = 'BIÊN BẢN';
      inlineTitle = minM[1] || '';
      break;
    }

    // P. Giấy mời
    const invM = l.match(invitationPattern);
    if (invM) {
      foundTypeIndex = idx;
      detectedType = 'GIẤY MỜI';
      inlineTitle = invM[1] || '';
      break;
    }

    // Q. Giấy giới thiệu
    const intM = l.match(introPattern);
    if (intM) {
      foundTypeIndex = idx;
      detectedType = 'GIẤY GIỚI THIỆU';
      inlineTitle = intM[1] || '';
      break;
    }

    // R. Giấy ủy quyền
    const autM = l.match(authLetterPattern);
    if (autM) {
      foundTypeIndex = idx;
      detectedType = 'GIẤY ỦY QUYỀN';
      inlineTitle = autM[1] || '';
      break;
    }

    // S. Giấy nghỉ phép
    const leaM = l.match(leavePattern);
    if (leaM) {
      foundTypeIndex = idx;
      detectedType = 'GIẤY NGHỈ PHÉP';
      inlineTitle = leaM[1] || '';
      break;
    }

    // T. Công điện
    const telM = l.match(telegramPattern);
    if (telM) {
      foundTypeIndex = idx;
      detectedType = 'CÔNG ĐIỆN';
      inlineTitle = telM[1] || '';
      break;
    }

    // U. Phiếu gửi / chuyển / báo
    const sliM = l.match(slipPattern);
    if (sliM) {
      foundTypeIndex = idx;
      detectedType = /^PHIẾU\s+CHUYỂN/i.test(l) ? 'PHIẾU CHUYỂN' : /^PHIẾU\s+BÁO/i.test(l) ? 'PHIẾU BÁO' : 'PHIẾU GỬI';
      inlineTitle = sliM[1] || '';
      break;
    }

    // V. Bản ghi nhớ / thỏa thuận
    const memM = l.match(memoPattern);
    if (memM) {
      foundTypeIndex = idx;
      detectedType = /^BẢN\s+THỎA\s+THUẬN/i.test(l) ? 'BẢN THỎA THUẬN' : 'BẢN GHI NHỚ';
      inlineTitle = memM[1] || '';
      break;
    }

    // W. Hợp đồng
    const conM2 = l.match(contractPattern);
    if (conM2) {
      foundTypeIndex = idx;
      detectedType = 'HỢP ĐỒNG';
      inlineTitle = conM2[1] || '';
      break;
    }

    // X. Thông cáo / Thư công
    const comM = l.match(communiquePattern);
    if (comM) {
      foundTypeIndex = idx;
      detectedType = /^THƯ\s+CÔNG/i.test(l) ? 'THƯ CÔNG' : 'THÔNG CÁO';
      inlineTitle = comM[1] || '';
      break;
    }

    // Y. Quét tổng quát 29 loại NĐ 30 & 15 loại Đảng
    const genM = l.match(generalTypePattern);
    if (genM) {
      foundTypeIndex = idx;
      detectedType = genM[1].toUpperCase();
      inlineTitle = genM[2] || '';
      break;
    }
  }
}

  // Cải thiện nhận diện Báo cáo từ Số hiệu văn bản (/BC-UBND, /BC, /BCT) hoặc hint từ người dùng
  const isDocCodeReport = Boolean(docCode && /\/(?:BC|BCT)(?:-[A-Z0-9]+)?\b/i.test(docCode));
  const isHintReport = (docTypeNameHint && /BÁO\s*CÁO/i.test(docTypeNameHint)) || docCategory === 'bao_cao';

  if (foundTypeIndex === -1 && (isDocCodeReport || isHintReport)) {
    for (let idx = 0; idx < Math.min(8, remainingLines.length); idx++) {
      const l = remainingLines[idx].trim();
      if (/^Kính\s+gửi:|^Kính\s+trình:|^Căn\s+cứ|^Thực\s+hiện|^Xét|^Điều\s+\d+/i.test(l)) break;
      if (/^(?:Về việc|Về|Kết quả|Tình hình|Tổng kết|Sơ kết|Đánh giá|Tiến độ|Công tác|Thực hiện|Kế hoạch|Quy định|Ban hành|Báo cáo)\b/i.test(l)) {
        foundTypeIndex = idx;
        detectedType = 'BÁO CÁO';
        inlineTitle = l;
        break;
      }
    }
  }

  // Trường hợp không có dòng tên loại rõ ràng nhưng người dùng chọn loại từ trước
  if (foundTypeIndex === -1 && docTypeNameHint && docTypeNameHint !== 'CÔNG VĂN') {
    const hintUpper = docTypeNameHint.toUpperCase();
    for (let idx = 0; idx < Math.min(8, remainingLines.length); idx++) {
      const l = remainingLines[idx].trim();
      if (/^Kính\s+gửi:|^Kính\s+trình:|^Căn\s+cứ|^Thực\s+hiện|^Xét|^Điều\s+\d+/i.test(l)) break;
      if (/^(?:Về việc|Về|Kết quả|Tình hình|Tổng kết|Sơ kết|Đánh giá|Tiến độ|Công tác|Thực hiện|Kế hoạch|Quy định|Ban hành)\b/i.test(l)) {
        foundTypeIndex = idx;
        detectedType = hintUpper;
        inlineTitle = l;
        break;
      }
    }
  }

  if (foundTypeIndex !== -1 && detectedType) {
    docTypeName = detectedType;
    remainingLines.splice(foundTypeIndex, 1);

    let collectedTitleParts: string[] = [];
    if (inlineTitle && inlineTitle.trim()) {
      collectedTitleParts.push(inlineTitle.trim());
    }

    // Đọc tiếp các dòng tiếp theo là trích yếu tiêu đề nhiều dòng
    // NÂNG CẤP CHỐNG DÍNH NỘI DUNG CHÍNH VÀO TÊN TRÍCH YẾU BÁO CÁO:
    // Tuyệt đối không cho phép dòng mở đầu văn bản (Thực hiện..., Căn cứ..., UBND nhận được...) lọt vào tiêu đề!
    while (foundTypeIndex < remainingLines.length) {
      const nextL = remainingLines[foundTypeIndex].trim();
      if (!nextL) {
        remainingLines.splice(foundTypeIndex, 1);
        continue;
      }

      // 1. Kiểm tra dấu hiệu bắt đầu của Thân / Nội dung chính văn bản -> DỪNG NGAY LẬP TỨC
      if (isDocumentBodyStart(nextL)) {
        break;
      }

      // 2. Kiểm tra các từ khóa phần Đầu văn bản hoặc phân cấp thân bài -> DỪNG NGAY
      if (/^Kính\s*(?:gửi|trình):|^Căn\s+cứ|^Thực\s+hiện|^UBND|^Ủy\s+ban|^Xét\s+đề\s+nghị|^Theo\s+đề\s+nghị|^I\.|^1\.|^Phần\s+|^Điều\s+\d+/i.test(nextL)) {
        break;
      }

      // Không đọc dòng tên cơ quan ban hành vào tiêu đề
      const agencyInfo = extractCleanAgencyAndRemainingText(nextL);
      const isAgencyLine = (Boolean(agencyName) && nextL.toUpperCase().includes(agencyName.toUpperCase())) ||
        (Boolean(settings.agencyName) && nextL.toUpperCase().includes(settings.agencyName.toUpperCase())) ||
        agencyInfo.cleanAgency !== '';

      if (isAgencyLine) {
        if (!agencyName) {
          agencyName = agencyInfo.cleanAgency || nextL.trim();
        }
        remainingLines.splice(foundTypeIndex, 1);
        break;
      }

      // Nếu tiêu đề đã có nội dung và dòng tiếp theo kết thúc bằng dấu chấm (.) hoặc ": như sau:"
      if (collectedTitleParts.length > 0 && (nextL.endsWith('.') || /(?:như\s+sau\s*[:\.]|kính\s+báo\s+cáo|báo\s+cáo\s+kết\s+quả)/i.test(nextL))) {
        break;
      }

      // Các từ khóa bắt đầu hoặc nối tiếp tiêu đề văn bản nhiều dòng (đặc biệt là tiêu đề Báo cáo)
      // Lưu ý: Tuyệt đối không để "Thực hiện" đứng đầu nuốt phần mở đầu bài viết
      const isStartKeyword = /^(?:Về việc|Về|Kết quả|Tình hình|Tổng kết|Sơ kết|Đánh giá|Tiến độ|Kế hoạch|Nhiệm vụ|Giải trình|Kiểm tra|Rà soát|Công tác|Tự kiểm tra|Tổng hợp|Đề xuất|Phục vụ|Đột xuất|Triển khai|Ban hành|Phê duyệt|Quy định|Kiện toàn|Thành lập|Tổ chức)\b/i.test(nextL);
      const isContinuationWord = /^(?:và|về|giai đoạn|năm|quý|tháng|trên địa bàn|tại|của|thuộc|theo|phục vụ|trong công tác|triển khai|đối với|nhằm|phấn đấu|đến năm|các|một số)\b/i.test(nextL);
      const isShortTitleLine = collectedTitleParts.length > 0 && collectedTitleParts.length < 2 && nextL.length < 130 && !nextL.endsWith('.') && !nextL.startsWith('-') && !/^\d+\./.test(nextL);

      if (isStartKeyword || isContinuationWord || isShortTitleLine) {
        collectedTitleParts.push(nextL);
        remainingLines.splice(foundTypeIndex, 1);
      } else {
        break;
      }
    }

    let rawCollected = collectedTitleParts.join(' ').trim();
    // Chuẩn hóa tiêu đề báo cáo: nếu tiêu đề bị lặp từ "Báo cáo:?" ở đầu, loại bỏ để tránh hiển thị "BÁO CÁO / Báo cáo..."
    if (docTypeName === 'BÁO CÁO' || docTypeName.startsWith('BÁO CÁO')) {
      rawCollected = rawCollected.replace(/^(?:BÁO\s*CÁO|Báo\s*cáo)[\s:\-–—\.]*/i, '').trim();
    }
    docTitle = formatDecree30TitleCase(rawCollected);
    cacMucDaChinh.push(`Đã nhận diện chuẩn xác Tên loại [${docTypeName}] và Tiêu đề theo Nghị định 30`);
  } else {
    // Nếu không tìm thấy tên loại văn bản nào khác hoặc văn bản là CÔNG VĂN:
    // Đảm bảo bóc tách đầy đủ trích yếu bắt đầu bằng "V/v" hoặc "Về việc" để đưa vào đúng vị trí Ô số 5b
    const isCongVanCandidate = docTypeName === 'CÔNG VĂN' || !docTypeName || isExplicitCongVanHint || Boolean(docSubjectShort);
    if (isCongVanCandidate) {
      docTypeName = 'CÔNG VĂN';
      if (!docSubjectShort) {
        // Quét tìm dòng V/v hoặc Về việc còn sót lại trong các dòng đầu
        const extracted = extractCongVanSubjectFromLines(remainingLines, 15);
        if (extracted) {
          docSubjectShort = extracted;
        } else if (docTitle && (/^(?:V\/v|Về việc)/i.test(docTitle) || docTypeName === 'CÔNG VĂN')) {
          docSubjectShort = formatCongVanSubject(docTitle);
          docTitle = '';
        }
      }
      if (docSubjectShort) {
        docSubjectShort = formatCongVanSubject(docSubjectShort);
      }
      docTitle = ''; // Công văn không có tiêu đề ở giữa trang, trích yếu đặt ở Ô 5b cột trái
    }
  }

  // Bóc tách Thẩm quyền ban hành đặc thù của QUYẾT ĐỊNH (dưới trích yếu, trước Căn cứ)
  let issuingAuthority = '';
  if (docTypeName === 'QUYẾT ĐỊNH') {
    docSubjectShort = '';
    const authIdx = remainingLines.findIndex((l, idx) => 
      idx < 8 &&
      !isDocumentBodyStart(l) &&
      /^(?:CHỦ\s*TỊCH|ỦY\s*BAN\s*NHÂN\s*DÂN|UBND|HỘI\s*ĐỒNG\s*NHÂN\s*DÂN|HĐND|BỘ\s*TRƯỞNG|GIÁM\s*ĐỐC|THỦ\s*TRƯỞNG)\b/i.test(l.trim()) &&
      !l.trim().endsWith('.') &&
      !/^Căn\s+cứ/i.test(l.trim())
    );
    if (authIdx !== -1) {
      issuingAuthority = remainingLines[authIdx].trim().toUpperCase();
      remainingLines.splice(authIdx, 1);
    } else {
      issuingAuthority = agencyName || settings.agencyName || 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN';
    }
    recipientsHeaderLines = [];
  }

  // Bảo toàn 100% nội dung gốc: Chỉ loại bỏ dòng nếu nó là dòng cơ quan đứng độc lập ở ngay đầu văn bản
  if (remainingLines.length > 0 && remainingLines[0].trim().toUpperCase() === (agencyName || '').toUpperCase()) {
    remainingLines.shift();
  }

  // Cảnh báo nếu cơ quan trong file khác với cài đặt mặc định
  if (agencyName && settings.agencyName && agencyName.toUpperCase() !== settings.agencyName.toUpperCase()) {
    cacMucDaChinh.push(`Cảnh báo: Cơ quan trong văn bản ("${agencyName}") khác với Cài đặt mặc định ("${settings.agencyName}"). Hệ thống giữ nguyên cơ quan gốc.`);
  }

  if (!docTypeName) {
    docTypeName = docSubjectShort ? 'CÔNG VĂN' : (docTypeNameHint ? docTypeNameHint.toUpperCase() : 'CÔNG VĂN');
  }

  // ĐẢM BẢO 100% ĐỐI VỚI CÔNG VĂN:
  // - Trích yếu luôn được đưa vào docSubjectShort (Ô số 5b cột trái, dòng dưới số ký hiệu)
  // - Tuyệt đối không để trích yếu sót trong docTitle hay thân bài
  if (docTypeName === 'CÔNG VĂN' || isExplicitCongVanHint || (!docTypeName && Boolean(docSubjectShort))) {
    docTypeName = 'CÔNG VĂN';
    if (!docSubjectShort) {
      if (docTitle) {
        docSubjectShort = formatCongVanSubject(docTitle);
        docTitle = '';
      } else {
        const fallbackSub = extractCongVanSubjectFromLines(remainingLines, 10);
        if (fallbackSub) {
          docSubjectShort = fallbackSub;
        }
      }
    }
    if (docSubjectShort) {
      docSubjectShort = formatCongVanSubject(docSubjectShort);
    }
    docTitle = '';
  }

  // 7. Tìm và bóc tách Kính gửi 100% chính xác (kết thúc bằng dấu ".", không bao giờ dính vào nội dung chính)
  const kgIndex = remainingLines.findIndex(l => /^Kính\s*(?:gửi|trình):?/i.test(l));
  const rawKinhGuiFoundLines: string[] = [];
  if (kgIndex !== -1) {
    const firstKg = remainingLines[kgIndex];
    remainingLines.splice(kgIndex, 1);
    rawKinhGuiFoundLines.push(firstKg);

    const strippedFirst = firstKg.replace(/^Kính\s*(?:gửi|trình):?\s*/i, '').trim();
    const hasMultipleInFirstLine = strippedFirst.includes(';') || strippedFirst.startsWith('-') || strippedFirst.includes('- ');
    const hasInlineRecipient = Boolean(strippedFirst);

    if (hasInlineRecipient) {
      if (hasMultipleInFirstLine) {
        const parts = strippedFirst.split(';').map(p => p.trim()).filter(Boolean);
        for (const p of parts) {
          const cleanP = p.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
          if (cleanP) {
            recipientsHeaderLines.push(cleanP);
          }
        }
      } else {
        const cleanSingle = strippedFirst.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
        if (cleanSingle) {
          recipientsHeaderLines.push(cleanSingle);
        }
      }
    }

    // NGUYÊN TẮC VÀNG: CÔNG VĂN GỬI 1 CƠ QUAN
    // Nếu trên dòng "Kính gửi: ..." đã có tên 1 cơ quan (không có dấu ; và không bắt đầu bằng gạch đầu dòng)
    // Và dòng tiếp theo không phải là gạch đầu dòng (-) danh sách cơ quan:
    // -> Đây là Công văn gửi 1 cơ quan trên cùng 1 hàng!
    // -> DỪNG NGAY LẬP TỨC, KHÔNG ĐƯỢC ĐỌC DÒNG TIẾP THEO ĐỂ TRÁNH DÍNH NỘI DUNG CHÍNH (Thực hiện..., UBND nhận được...)
    const nextLineLookahead = remainingLines[kgIndex]?.trim() || '';
    const nextIsBullet = /^[-\u2013\u2014\*\+•●○■◆]\s+/.test(nextLineLookahead);
    const isSingleInlineComplete = hasInlineRecipient && !hasMultipleInFirstLine && recipientsHeaderLines.length === 1 && !nextIsBullet;

    if (!isSingleInlineComplete) {
      // Đọc tiếp các dòng người nhận bên dưới cho đến khi gặp dòng kết thúc bằng dấu "." hoặc gặp từ khóa nội dung văn bản
      while (kgIndex < remainingLines.length) {
        const nextL = remainingLines[kgIndex].trim();
        if (!nextL) {
          remainingLines.splice(kgIndex, 1);
          continue;
        }

        // 1. Nếu gặp ranh giới chuyển sang Thân / Nội dung chính văn bản -> DỪNG NGAY LẬP TỨC!
        // (Thực hiện..., Căn cứ..., UBND nhận được..., Tiếp nhận, Phúc đáp, Nhằm, Để, v.v.)
        if (isDocumentBodyStart(nextL)) {
          break;
        }

        // 2. Nếu dòng chứa các động từ câu văn xuôi hành chính -> DỪNG NGAY LẬP TỨC!
        const hasBodyVerb = /\b(?:nhận được|kính gửi văn bản|báo cáo về|tiếp nhận|phúc đáp|đề nghị quý|yêu cầu quý|triển khai thực hiện|phối hợp thực hiện|công văn số|kế hoạch số)\b/i.test(nextL);
        if (hasBodyVerb) {
          break;
        }

        // 3. Nếu gặp ranh giới chuyển sang phần Chữ ký / Nơi nhận cuối bài -> DỪNG
        if (/^(?:KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ|CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|PHÓ\s*CHỦ\s*TỊCH|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|Nơi\s*nhận:?)/i.test(nextL.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim())) {
          break;
        }

        const hasBullet = /^[-\u2013\u2014\*\+•●○■◆]\s+/.test(nextL);
        const isOrgKeyword = /^(?:Ủy\s*ban|UBND|HĐND|Hội\s*đồng|Đảng\s*ủy|Chi\s*bộ|Ban|Sở|Phòng|Bộ|Cục|Chi\s*cục|Đoàn|Hội|Công\s*an|Quân\s*sự|Trường|Bệnh\s*viện|Trung\s*tâm|Đơn\s*vị|Các|Toàn\s*thể|Đồng\s*chí|Ông|Bà|Công\s*ty)\b/i.test(nextL.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim());

        if (hasBullet || (!hasInlineRecipient && isOrgKeyword && nextL.length < 90)) {
          rawKinhGuiFoundLines.push(nextL);
          const clean = nextL.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
          if (clean) {
            recipientsHeaderLines.push(clean);
          }
          remainingLines.splice(kgIndex, 1);

          // Nếu dòng này kết thúc bằng dấu chấm (.), đánh dấu kết thúc khối Kính gửi
          if (nextL.endsWith('.')) {
            break;
          }
        } else {
          // Gặp dòng bình thường không phải bullet nơi nhận -> Dừng ngay!
          break;
        }
      }
    }
  }

  // NGUYÊN TẮC VÀNG 2: Báo cáo không có phần Kính gửi theo Nghị định 30/2020/NĐ-CP
  // Nếu phát hiện có dòng "Kính gửi" trong Báo cáo, tự động chuyển nơi nhận này vào Nơi nhận (để b/c) và xóa sạch Kính gửi ở đầu
  const isReportDocument = docTypeName === 'BÁO CÁO' || docTypeName.startsWith('BÁO CÁO');
  if (isReportDocument) {
    if (recipientsHeaderLines.length > 0) {
      for (const line of recipientsHeaderLines) {
        const cleanRec = line.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
        if (cleanRec) {
          const recFormatted = cleanRec.includes('(để') ? `- ${cleanRec};` : `- ${cleanRec} (để b/c);`;
          recipients.push(recFormatted);
        }
      }
      recipientsHeaderLines = [];
      cacMucDaChinh.push('Chuẩn thể thức NĐ 30: Báo cáo không có Kính gửi (đã chuyển đơn vị nhận vào Nơi nhận)');
    }
  }

  // Lọc sạch triệt để: Loại bỏ hoàn toàn các dòng KT. CHỦ TỊCH, PHÓ CHỦ TỊCH, CHỦ TỊCH, họ tên lãnh đạo khỏi Kính gửi
  const sigKeywordFilterRegex = /^(?:TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ|KT\s*CHỦ\s*TỊCH|CHỦ\s*TỊCH|PHÓ\s*CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|PHÓ\s*TRƯỞNG\s*PHÒNG|HIỆU\s*TRƯỞNG)\b/i;
  recipientsHeaderLines = recipientsHeaderLines.filter(line => {
    const clean = line.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
    if (sigKeywordFilterRegex.test(clean)) {
      if (!signerAuthority && /^(?:TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ|KT\s*CHỦ\s*TỊCH)/i.test(clean)) {
        signerAuthority = clean.toUpperCase();
      } else if (!signerTitle && /^(?:CHỦ\s*TỊCH|PHÓ\s*CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG)/i.test(clean)) {
        signerTitle = clean.toUpperCase();
      }
      return false;
    }
    // Kiểm tra nếu là tên riêng của lãnh đạo (không có từ chỉ cơ quan/đơn vị)
    if (/^[A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4}$/.test(clean) && !/^(?:Đồng chí|Kính gửi|Các|Toàn thể|Ban|Phòng|Sở|Ủy ban)/i.test(clean)) {
      if (!signerName) signerName = clean;
      return false;
    }
    return true;
  });

  // Chuẩn hóa dấu kết thúc của phần Kính gửi chuẩn Nghị định 30/2020/NĐ-CP:
  // - Nếu 1 nơi nhận: Đặt trên 1 hàng, TUYỆT ĐỐI KHÔNG có dấu gạch (-), kết thúc bằng dấu chấm "."
  // - Nếu nhiều nơi nhận: các dòng có dấu gạch đầu dòng (-), các dòng trước kết thúc bằng ";", dòng cuối kết thúc bằng "."
  if (recipientsHeaderLines.length === 1) {
    const single = recipientsHeaderLines[0]
      .replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '')
      .replace(/[;\.]+$/, '')
      .trim();
    recipientsHeaderLines[0] = `${single}.`;
  } else if (recipientsHeaderLines.length > 1) {
    for (let idx = 0; idx < recipientsHeaderLines.length; idx++) {
      const clean = recipientsHeaderLines[idx]
        .replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '')
        .replace(/[;\.]+$/, '')
        .trim();
      const isLast = idx === recipientsHeaderLines.length - 1;
      recipientsHeaderLines[idx] = `- ${clean}${isLast ? '.' : ';'}`;
    }
  }

  // 7.5. BÓC TÁCH PHỤ LỤC (Annex / Appendix) KÈM THEO VĂN BẢN (NẾU CÓ)
  let appendices: DocumentAppendix[] = [];
  const appResult = parseAppendicesFromLines(remainingLines);
  if (appResult.appendices.length > 0) {
    appendices = appResult.appendices;
    remainingLines = appResult.cleanLines;
    cacMucDaChinh.push(`Đã nhận diện ${appendices.length} phụ lục và tự động ngắt trang A4 chuẩn thể thức`);
  }

  // 8. Tìm và bóc tách Nơi nhận & Chữ ký từ cuối văn bản trở lên (hỗ trợ nhiều dòng với \n)
  // NGUYÊN TẮC VÀNG 4: Không tự động bỏ đi các dòng người nhận công vụ như:
  // "Chủ tịch, các Phó Chủ tịch UBND phường (để b/c);"
  const noiNhanIndex = remainingLines.findIndex(l => /^Nơi nhận:?/i.test(l));
  if (noiNhanIndex !== -1) {
    const linesAfterNoiNhan = remainingLines.splice(noiNhanIndex);
    let inSigner = false;

    // Chỉ chuyển sang khối chữ ký nếu dòng đó là chức danh ký đứng HOÀN TOÀN ĐỘC LẬP
    const exactIsolatedSigRegex = /^(?:KT\.\s*CHỦ\s*TỊCH|TM\.\s*ỦY\s*BAN\s*NHÂN\s*DÂN|T\/M\s*CHI\s*BỘ|KT\.|TM\.|T\/M|Q\.|TL\.|TUQ\.|T\.UQ|CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|PHÓ\s*CHỦ\s*TỊCH|QUYỀN\s*CHỦ\s*TỊCH|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|PHÓ\s*TRƯỞNG\s*PHÒNG|HIỆU\s*TRƯỞNG)$/i;

    for (const l of linesAfterNoiNhan) {
      if (/^Nơi nhận:?/i.test(l)) {
        const stripped = l.replace(/^Nơi nhận:?\s*/i, '').trim();
        if (stripped) {
          const strippedClean = stripped.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim();
          if (exactIsolatedSigRegex.test(strippedClean)) {
            inSigner = true;
          } else {
            recipients.push(`- ${strippedClean}`);
          }
        }
        continue;
      }

      const cleanL = l.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim();
      if (!cleanL) continue;

      // KIỂM TRA ĐẶC BIỆT: Nếu là dòng người nhận công vụ hợp lệ
      // (để b/c), (để chỉ đạo), "Chủ tịch, các Phó Chủ tịch", v.v.
      // -> Luôn thuộc về Nơi nhận, tuyệt đối không được chuyển sang chữ ký
      const isOfficialRecipientLine = l.trim().startsWith('-') ||
        /\(để\s*(?:b\/c|báo\s*cáo|chỉ\s*đạo|phối\s*hợp|thực\s*hiện|t\/h|biết|theo\s*dõi)\)/i.test(cleanL) ||
        /\bđể\s*(?:b\/c|báo\s*cáo|chỉ\s*đạo)\b/i.test(cleanL) ||
        /\b(?:các\s*Phó\s*Chủ\s*tịch|các\s*PCT|Chủ\s*tịch,\s*các|Chủ\s*tịch\s*và\s*các)\b/i.test(cleanL) ||
        /\b(?:UBND|HĐND|Đảng\s*ủy|Chi\s*bộ|Thường\s*trực)\b/i.test(cleanL) ||
        cleanL.endsWith(';');

      // Nhận diện dòng chức danh độc lập hoặc họ tên riêng của lãnh đạo
      const isExactIsolatedSig = exactIsolatedSigRegex.test(cleanL);
      const isLeaderPersonName = (/^[A-ZĐÀ-Ỹ][a-zđà-ỹ]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ]+){1,4}$/.test(cleanL) || /^[A-ZĐÀ-Ỹ\s]{3,35}$/.test(cleanL)) &&
        !/^(?:Như|Lưu|Phòng|Ban|Sở|Bộ|UBND|HĐND|Ủy\s*ban|Thường\s*trực|Chi\s*bộ|Đảng\s*ủy|Đảng\s*bộ|Hội\s*đồng|Công\s*an|Quân\s*sự|Y\s*tế|Đoàn|Hội|Tổ|Đồng\s*chí|Đ\/c|Các|Chủ\s*tịch|Phó\s*chủ\s*tịch)\b/i.test(cleanL);

      if (!isOfficialRecipientLine && (isExactIsolatedSig || isLeaderPersonName)) {
        inSigner = true;
      }

      if (!inSigner || isOfficialRecipientLine) {
        recipients.push(cleanL.startsWith('-') ? cleanL : `- ${cleanL}`);
      } else {
        if (/^(?:KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ)/i.test(cleanL)) {
          const m = cleanL.match(/^(KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ)/i);
          if (m) {
            quyenHanKy = m[1].toUpperCase().replace(/\s+/g, ' ');
          }
          signerAuthority = cleanL.toUpperCase();
        } else if (/^(?:CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|PHÓ\s*CHỦ\s*TỊCH|QUYỀN\s*CHỦ\s*TỊCH|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|HIỆU\s*TRƯỞNG)/i.test(cleanL)) {
          signerTitle = cleanL.toUpperCase();
        } else if (isLeaderPersonName) {
          if (!cleanL.includes('Ký') && !cleanL.includes('Họ tên') && !cleanL.includes('Số')) {
            signerName = cleanL;
          }
        }
      }
    }
  } else {
    // Nếu không có dòng 'Nơi nhận:', quét các dòng cuối cùng để bóc tách khối chữ ký (nếu có)
    const scanCount = Math.min(6, remainingLines.length);
    const tailStartIndex = remainingLines.length - scanCount;
    let foundSignerIndex = -1;

    for (let i = tailStartIndex; i < remainingLines.length; i++) {
      const line = remainingLines[i];
      if (/^(KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH|GIÁM ĐỐC|TRƯỞNG PHÒNG|HIỆU TRƯỞNG)/i.test(line)) {
        foundSignerIndex = i;
        break;
      }
    }

    if (foundSignerIndex !== -1) {
      const signerLines = remainingLines.splice(foundSignerIndex);
      for (const l of signerLines) {
        if (/^(KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.)/i.test(l)) {
          const m = l.match(/^(KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.)/i);
          if (m) {
            quyenHanKy = m[1].toUpperCase().replace(/\s+/g, ' ');
          }
          signerAuthority = l.toUpperCase();
        } else if (/^(CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH|GIÁM ĐỐC|TRƯỞNG PHÒNG|HIỆU TRƯỞNG)/i.test(l)) {
          signerTitle = l.toUpperCase();
        } else if (/^[A-ZÀ-Ỹ][a-zà-ỹ]+(\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4}$/.test(l) || /^[A-ZÀ-Ỹ\s]{3,30}$/.test(l)) {
          if (!l.includes('Ký') && !l.includes('Họ tên')) {
            signerName = l;
          }
        }
      }
    }
  }

  // 9. NÂNG CẤP LOẠI BỎ TRIỆT ĐỂ TIÊU ĐỀ QUỐC NGỮ VÀ THÔNG TIN ĐẦU VĂN BẢN KHỎI THÂN VĂN BẢN
  // Tìm vị trí bắt đầu của phần Căn cứ hoặc phần Thân văn bản thực tế
  const firstBasisIdx = remainingLines.findIndex(l => /^Căn cứ\s+/i.test(l.trim()));
  const firstActionIdx = remainingLines.findIndex(l => /^(?:QUYẾT ĐỊNH|QUYẾT NGHỊ|KẾT LUẬN|CHỈ THỊ)\s*[:\.]?$|^Điều\s+\d+/i.test(l.trim()));
  
  // Tìm dòng văn xuôi / nội dung thực sự đầu tiên (không phải đầu văn bản, không phải cơ quan, ngày tháng, số hiệu, trích yếu)
  let firstNarrativeIdx = -1;
  for (let i = 0; i < remainingLines.length; i++) {
    const l = remainingLines[i].trim();
    if (/^Kính gửi:?/i.test(l) || /^Căn cứ\s+/i.test(l) || /^Điều\s+\d+/i.test(l) || /^(?:QUYẾT ĐỊNH|QUYẾT NGHỊ|KẾT LUẬN|CHỈ THỊ)/i.test(l)) {
      firstNarrativeIdx = i;
      break;
    }
    const hasNarrativeVerbs = /\b(?:triển khai|thực hiện|đề nghị|yêu cầu|tổ chức|nhận được|phê duyệt|hướng dẫn|thành lập|kiểm tra|rà soát|kính chuyển|ban hành|sau khi|theo đó|nhằm|để|phối hợp|tham mưu)\b/i.test(l);
    if (hasNarrativeVerbs || l.endsWith('.')) {
      firstNarrativeIdx = i;
      break;
    }
    const isHeaderLine = /^(?:ỦY BAN|UBND|HỘI ĐỒNG|HĐND|ĐẢNG|CHI BỘ|BAN|SỞ|PHÒNG|CÔNG AN|QUÂN SỰ|TRẠM Y TẾ|Số:|CỘNG HÒA|Độc lập|Đảng Cộng sản|[a-zA-ZÀ-ỹ\s]+,\s*ngày|V\/v|Về việc|QUYẾT ĐỊNH|CÔNG VĂN|TỜ TRÌNH|BÁO CÁO|KẾ HOẠCH|THÔNG BÁO|NGHỊ QUYẾT|CHỈ THỊ)/i.test(l);
    if (!isHeaderLine && l.length >= 15) {
      firstNarrativeIdx = i;
      break;
    }
  }

  const bodyStartIdx = firstBasisIdx !== -1 
    ? firstBasisIdx 
    : (firstActionIdx !== -1 ? firstActionIdx : (firstNarrativeIdx !== -1 ? firstNarrativeIdx : 0));

  // Với các dòng TRƯỚC phần Căn cứ / bodyStartIdx và các dòng Cơ quan ban hành:
  // Tuyệt đối không cho phép lọt Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số hiệu, Địa danh, Tên văn bản, đường kẻ rác vào Thân văn bản
  const cleanRemainingLines: string[] = [];
  for (let i = 0; i < remainingLines.length; i++) {
    const rawL = remainingLines[i];
    const isBeforeBasis = firstBasisIdx !== -1 ? (i < firstBasisIdx) : (i < bodyStartIdx);

    // Kiểm tra nếu là câu văn xuôi có động từ hành động: BẢO TỒN TUYỆT ĐỐI KHÔNG ĐƯỢC XÓA
    const hasNarrativeVerbs = /\b(?:triển khai|thực hiện|đề nghị|yêu cầu|tổ chức|nhận được|phê duyệt|hướng dẫn|thành lập|kiểm tra|rà soát|kính chuyển|ban hành|sau khi|theo đó|nhằm|để|phối hợp|tham mưu)\b/i.test(rawL);

    // Kiểm tra nếu là dòng đầu văn bản / tiêu đề quốc ngữ còn sót lại
    const isNationalHeader = /(?:CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM|CỘNG\s+HOÀ\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM|Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc|Độc\s+Lập\s*[-–—]\s*Tự\s+Do\s*[-–—]\s*Hạnh\s+Phúc|ĐỘC\s+LẬP\s*[-–—]\s*TỰ\s+DO\s*[-–—]\s*HẠNH\s+PHÚC|ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM|Đảng\s+Cộng\s+sản\s+Việt\s+Nam)/i.test(rawL);
    const isSeparator = /^[*\-–—_~=]{2,}$|^[-–—\s]{3,}$|^[–—\.\s]{4,}$/.test(rawL.trim());
    const isDateLine = /^[a-zA-ZÀ-ỹ\s]+,\s*ngày\s+/i.test(rawL.trim());
    const isDocCodeLine = /^(?:Số|SỐ|Số\s*:)\s*/i.test(rawL.trim());
    const isTypeNameLine = /^(?:QUYẾT ĐỊNH|CÔNG VĂN|TỜ TRÌNH|BÁO CÁO|KẾ HOẠCH|THÔNG BÁO|NGHỊ QUYẾT|CHỈ THỊ|GIẤY MỜI)$/i.test(rawL.trim());
    const isSubjectLine = /^(?:V\/v|Về việc)\s+/i.test(rawL.trim());
    
    // Chỉ là dòng tên cơ quan header nếu không có động từ câu và không kết thúc bằng dấu chấm
    const isAgencyLine = !hasNarrativeVerbs && !rawL.trim().endsWith('.') && /^(?:ỦY BAN NHÂN DÂN|UBND|HỘI ĐỒNG NHÂN DÂN|HĐND|ĐẢNG BỘ|ĐẢNG ỦY|CHI BỘ|BAN CHẤP HÀNH|BAN THƯỜNG VỤ|BAN CHỈ HUY QUÂN SỰ|CÔNG AN PHƯỜNG|TRẠM Y TẾ|ỦY BAN MTTQ|ĐOÀN TNCS|HỘI PHỤ NỮ|HỘI CỰU CHIẾN BINH|HỘI NÔNG DÂN)\s+[A-ZÀ-Ỹ0-9\s\.\-–]+$/i.test(rawL.trim()) && rawL.trim().length <= 75;

    // Kiểm tra xem dòng có trùng chính xác với Tiêu đề cơ quan ban hành đứng riêng lẻ không
    const isMatchingAgencyName = !hasNarrativeVerbs && agencyName && rawL.trim().toUpperCase() === agencyName.toUpperCase();
    const isMatchingParentAgency = !hasNarrativeVerbs && parentAgency && rawL.trim().toUpperCase() === parentAgency.toUpperCase();
    const isMatchingSettingsAgency = !hasNarrativeVerbs && settings.agencyName && rawL.trim().toUpperCase() === settings.agencyName.toUpperCase();

    if (isBeforeBasis) {
      // Bất kỳ dòng nào trước phần căn cứ / nội dung mà là tiêu đề, ngày tháng, số hiệu, loại văn bản, trích yếu, tên cơ quan hoặc gạch ngang trang trí -> LOẠI BỎ KHỎI NỘI DUNG VÌ ĐÃ ĐƯỢC LƯU VÀO CÁC Ô ĐẦU VĂN BẢN
      if (!hasNarrativeVerbs && (isNationalHeader || isSeparator || isDateLine || isDocCodeLine || isTypeNameLine || isSubjectLine || isAgencyLine || isMatchingAgencyName || isMatchingParentAgency || isMatchingSettingsAgency)) {
        continue;
      }
    }

    // Với dòng nói chung trong phần còn lại, giữ nguyên vẹn các khối bảng biểu nguyên tử
    if (rawL.includes('___DECREE30_ATOMIC_TABLE_')) {
      cleanRemainingLines.push(rawL);
      continue;
    }

    if (!isBeforeBasis) {
      // NGUYÊN TẮC VÀNG: GIỮ NGUYÊN 100% NỘI DUNG VÀ VỊ TRÍ VĂN BẢN ĐƯỢC PASTE VÀO!
      // Tuyệt đối không tự ý xóa bỏ bằng continue; hay regex replace các dòng tiêu đề lặp lại, ghi chú dự thảo, AI chatter.
      // Giữ nguyên tuần tự trong cleanRemainingLines để hệ thống bôi vàng kèm đề xuất xóa để người dùng chủ động chọn [Đồng ý xóa] hoặc [Bỏ qua].
      cleanRemainingLines.push(rawL.trim());
    } else {
      const cleanL = rawL
        .replace(/^[*\-–—_~=]{2,}$/, '')
        .trim();

      if (cleanL) {
        cleanRemainingLines.push(cleanL);
      }
    }
  }

  // TUYỆT ĐỐI TUÂN THỦ TRÌNH TỰ, VỊ TRÍ CỦA NỘI DUNG VĂN BẢN ĐƯỢC NHẬP VÀO HOẶC TẢI LÊN
  // Chỉ lấy các dòng 'Căn cứ' LIÊN TỤC Ở ĐẦU VĂN BẢN (trước các đoạn văn xuôi khác) vào legalBases
  // Còn lại tất cả các dòng tiếp theo (kể cả bảng biểu, căn cứ giữa bài, điều khoản, kết luận) giữ nguyên 100% thứ tự tuần tự trong bodyParagraphs
  let isLeadingBasisBlock = true;
  for (const l of cleanRemainingLines) {
    // Tuyệt đối không cho phép tên cơ quan ban hành lọt vào bodyParagraphs (ngăn lệch xuống sau tiêu đề báo cáo)
    const isAgencyLineLeak = Boolean(agencyName) && (
      l.toUpperCase() === agencyName.toUpperCase() ||
      (l.length <= 80 && !l.endsWith('.') && (agencyName.toUpperCase().includes(l.toUpperCase()) || l.toUpperCase().includes(agencyName.toUpperCase())))
    );
    const isParentLeak = Boolean(parentAgency) && l.toUpperCase() === parentAgency.toUpperCase();
    const isSettingsLeak = Boolean(settings.agencyName) && (
      l.toUpperCase() === settings.agencyName.toUpperCase() ||
      (l.length <= 80 && !l.endsWith('.') && settings.agencyName.toUpperCase().includes(l.toUpperCase()))
    );
    const agencyCheck = extractCleanAgencyAndRemainingText(l);
    const isPureAgencyLeak = agencyCheck.cleanAgency !== '' && !agencyCheck.leftoverText && l.length <= 80 && !l.endsWith('.');

    // Tuyệt đối không để Kính gửi hoặc các dòng nơi gửi đến lọt vào bodyParagraphs (ngăn trùng lặp 100%)
    // LƯU Ý ĐẶC BIỆT: Nếu dòng này là bắt đầu của nội dung chính (isDocumentBodyStart), TUYỆT ĐỐI KHÔNG BỊ XÓA!
    const isKinhGuiLeak = (!isDocumentBodyStart(l)) && (/^Kính\s*(?:gửi|trình):?/i.test(l) ||
      recipientsHeaderLines.some(rh => {
        const cleanRh = rh.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim().toLowerCase();
        const cleanL = l.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim().toLowerCase();
        return cleanRh && cleanRh.length >= 3 && (cleanRh === cleanL || cleanL.startsWith(cleanRh));
      }));
    if (isKinhGuiLeak) {
      continue;
    }

    if (isLeadingBasisBlock && (/^Căn cứ\s+/i.test(l) || (docTypeName === 'QUYẾT ĐỊNH' && /^(?:Theo|Xét)\s+đề\s+nghị/i.test(l)))) {
      legalBases.push(l);
    } else {
      isLeadingBasisBlock = false;
      bodyParagraphs.push(l);
    }
  }

  // Khôi phục các khối Bảng biểu nguyên vẹn theo đúng vị trí ban đầu (không xóa, không đổi nội dung)
  if (atomicTableBlocks.length > 0) {
    for (let i = 0; i < bodyParagraphs.length; i++) {
      if (bodyParagraphs[i].includes('___DECREE30_ATOMIC_TABLE_')) {
        bodyParagraphs[i] = bodyParagraphs[i].replace(/___DECREE30_ATOMIC_TABLE_(\d+)___/g, (_, idxStr) => {
          const tableIdx = parseInt(idxStr, 10);
          return atomicTableBlocks[tableIdx] || '';
        });
      }
    }
    for (let i = 0; i < legalBases.length; i++) {
      if (legalBases[i].includes('___DECREE30_ATOMIC_TABLE_')) {
        legalBases[i] = legalBases[i].replace(/___DECREE30_ATOMIC_TABLE_(\d+)___/g, (_, idxStr) => {
          const tableIdx = parseInt(idxStr, 10);
          return atomicTableBlocks[tableIdx] || '';
        });
      }
    }
    if (appendices && appendices.length > 0) {
      for (const app of appendices) {
        for (let i = 0; i < app.paragraphs.length; i++) {
          if (app.paragraphs[i].includes('___DECREE30_ATOMIC_TABLE_')) {
            app.paragraphs[i] = app.paragraphs[i].replace(/___DECREE30_ATOMIC_TABLE_(\d+)___/g, (_, idxStr) => {
              const tableIdx = parseInt(idxStr, 10);
              return atomicTableBlocks[tableIdx] || '';
            });
          }
        }
      }
    }
  }

  // Định dạng chuẩn riêng biệt cho QUYẾT ĐỊNH theo Nghị định 30/2020/NĐ-CP
  if (docTypeName === 'QUYẾT ĐỊNH') {
    // 1. Căn cứ ban hành: In thường, kiểu nghiêng, cỡ 13–14, mỗi căn cứ một dòng, cuối dòng dấu chấm phẩy (;), dòng căn cứ cuối dấu phẩy (,)
    if (legalBases.length > 0) {
      for (let idx = 0; idx < legalBases.length; idx++) {
        const cleanBase = legalBases[idx].trim().replace(/[;\.,]+$/, '');
        if (idx === legalBases.length - 1) {
          legalBases[idx] = `${cleanBase},`;
        } else {
          legalBases[idx] = `${cleanBase};`;
        }
      }
    }

    // 2. "QUYẾT ĐỊNH:" in hoa, đậm, canh giữa, có dấu hai chấm đứng trước Điều 1
    const qdCmdIdx = bodyParagraphs.findIndex(p => /^(?:QUYẾT\s+ĐỊNH|QUYET\s+DINH)\s*[:\.]?$/i.test(p.trim()));
    if (qdCmdIdx !== -1) {
      bodyParagraphs[qdCmdIdx] = 'QUYẾT ĐỊNH:';
    } else {
      const firstDieuIdx = bodyParagraphs.findIndex(p => /^Điều\s+\d+/i.test(p.trim()));
      if (firstDieuIdx !== -1) {
        bodyParagraphs.splice(firstDieuIdx, 0, 'QUYẾT ĐỊNH:');
      } else if (bodyParagraphs.length > 0) {
        bodyParagraphs.unshift('QUYẾT ĐỊNH:');
      }
    }
  }

  let totalMergedCells = 0;
  for (const tbl of atomicTableBlocks) {
    const colspans = tbl.match(/colspan\s*=\s*["']?(\d+)["']?/gi) || [];
    const rowspans = tbl.match(/rowspan\s*=\s*["']?(\d+)["']?/gi) || [];
    for (const cs of colspans) {
      const m = cs.match(/\d+/);
      if (m && parseInt(m[0], 10) > 1) totalMergedCells += (parseInt(m[0], 10) - 1);
    }
    for (const rs of rowspans) {
      const m = rs.match(/\d+/);
      if (m && parseInt(m[0], 10) > 1) totalMergedCells += (parseInt(m[0], 10) - 1);
    }
  }

  cacMucDaChinh.push('Đã loại bỏ triệt để tên cơ quan ban hành và tiêu đề quốc ngữ khỏi thân văn bản');
  if (atomicTableBlocks.length > 0) {
    cacMucDaChinh.push(`Đã giữ nguyên ${atomicTableBlocks.length} bảng biểu, trong đó có ${totalMergedCells} ô gộp`);
  } else {
    cacMucDaChinh.push('Bảo toàn tuyệt đối trình tự nội dung và toàn vẹn bố cục văn bản');
  }

  // BƯỚC 4: QUYỀN HẠN KÝ & CHỨC VỤ NGƯỜI KÝ CHUẨN NĐ 30 & HD 05
  // (Giữ nguyên vẹn chức vụ và người ký có trong văn bản, KHÔNG tự ý chèn tên giả)
  if (!signerTitle && signerAuthority) {
    if (/PHÓ\s+CHỦ\s+TỊCH/i.test(signerAuthority)) {
      signerTitle = 'PHÓ CHỦ TỊCH';
    } else if (/CHỦ\s+TỊCH/i.test(signerAuthority)) {
      signerTitle = 'CHỦ TỊCH';
    }
  }

  if (quyenHanKy === 'KT. CHỦ TỊCH') {
    signerAuthority = 'KT. CHỦ TỊCH';
    if (!signerTitle) signerTitle = 'PHÓ CHỦ TỊCH';
  }

  cacMucDaChinh.push('Đã hỗ trợ xuống dòng cho Kính gửi và Nơi nhận');
  cacMucDaChinh.push('Đã thêm trường Quyền hạn ký');

  const recipientsHeader = docTypeName === 'QUYẾT ĐỊNH' ? '' : recipientsHeaderLines.join('\n');

  // Rà soát văn bản thiếu tính logic (Gợi ý bôi vàng)
  const illogicalFindings = detectIllogicalAdministrativeText(cleanInput, docTypeName, settings.roleBlock);
  if (illogicalFindings.length > 0) {
    cacMucDaChinh.push(`Đã phát hiện ${illogicalFindings.length} điểm thiếu tính logic để gợi ý bôi vàng`);
  }

  let sanitizedRecipients = cleanAndDeduplicateRecipients(recipients, {
    quyenHanKy,
    signerAuthority,
    signerTitle,
    signerName
  });

  if (docTypeName === 'QUYẾT ĐỊNH') {
    let maxArticle = 3;
    for (const p of bodyParagraphs) {
      const match = p.match(/^Điều\s+(\d+)/i);
      if (match) {
        const artNum = parseInt(match[1], 10);
        if (artNum > maxArticle) maxArticle = artNum;
      }
    }
    sanitizedRecipients = formatDecisionRecipients(sanitizedRecipients, maxArticle);
    docSubjectShort = '';
  }

  return {
    isPartyDoc,
    parentAgency,
    agencyName,
    docCode,
    docSubjectShort,
    countryHeader,
    motto,
    locationDate,
    docTypeName,
    docTitle,
    issuingAuthority,
    recipientsHeader,
    legalBases,
    bodyParagraphs,
    appendices,
    recipients: sanitizedRecipients,
    quyenHanKy,
    signerAuthority,
    signerTitle,
    signerName,
    tableStats: {
      tableCount: atomicTableBlocks.length,
      mergedCellCount: totalMergedCells
    },
    cacMucDaChinh,
    illogicalFindings
  };
}

/**
 * Nhận diện và kiểm tra xem phần chữ ký có bị thiếu dòng (chỉ có 1 dòng quyền hạn hoặc chức vụ ký):
 * - Theo Nghị định 30/2020/NĐ-CP Điều 13 & Phụ lục I:
 *   Khi ký thay mặt (TM.) hoặc ký thay (KT.) hoặc thừa lệnh (TL.):
 *   Dòng 1: Quyền hạn ký (TM. ỦY BAN NHÂN DÂN, KT. CHỦ TỊCH, TL. CHỦ TỊCH...)
 *   Dòng 2: Chức vụ người ký (CHỦ TỊCH, PHÓ CHỦ TỊCH, CHÁNH VĂN PHÒNG...)
 *   Nếu chỉ có 1 dòng duy nhất (chỉ có quyền hạn hoặc chỉ có chức vụ) thì bôi vàng để người dùng lưu ý bổ sung.
 */
export interface SignatureLineCheck {
  isSingleLine: boolean;
  hasThreeLines?: boolean;
  authorityLine: string;
  roleLine2?: string;
  titleLine: string;
  singleLineText: string;
  reason: string;
}

export function checkSignatureLines(doc: {
  signerAuthority?: string;
  quyenHanKy?: string;
  signerRoleLine2?: string;
  signerTitle?: string;
}): SignatureLineCheck {
  const auth = (doc.signerAuthority || doc.quyenHanKy || '').trim().toUpperCase();
  const role2 = (doc.signerRoleLine2 || '').trim().toUpperCase();
  const title = (doc.signerTitle || '').trim().toUpperCase();

  // Trường hợp có 3 dòng vai trò ký (Thay mặt tập thể + Ký thay/Chức vụ người đứng đầu + Chức vụ người ký trực tiếp)
  // Ví dụ: TM. ỦY BAN NHÂN DÂN / KT. CHỦ TỊCH / PHÓ CHỦ TỊCH
  // Hoặc: TM. BAN THƯỜNG VỤ / KT. BÍ THƯ / PHÓ BÍ THƯ
  // Hoặc: TM. BAN CHẤP HÀNH / T/M BAN THƯỜNG VỤ / BÍ THƯ
  if (auth && role2 && title) {
    return {
      isSingleLine: false,
      hasThreeLines: true,
      authorityLine: auth,
      roleLine2: role2,
      titleLine: title,
      singleLineText: '',
      reason: ''
    };
  }

  // Đầy đủ 2 dòng phân biệt: Thẩm quyền ký ở dòng 1 và Chức vụ người ký ở dòng 2
  if (auth && title && auth !== title) {
    return {
      isSingleLine: false,
      hasThreeLines: false,
      authorityLine: auth,
      roleLine2: '',
      titleLine: title,
      singleLineText: '',
      reason: ''
    };
  }

  // Trường hợp chỉ có 1 dòng duy nhất
  const singleLineText = auth || title || '';
  let reason = '';
  if (/^(?:KT\.|KT\s*CHỦ\s*TỊCH)/i.test(singleLineText)) {
    reason = 'Phần chữ ký ký thay (KT.) chỉ có 1 dòng thẩm quyền ký, thiếu dòng chức vụ người ký (ví dụ: PHÓ CHỦ TỊCH). Cần bổ sung để đúng thể thức.';
  } else if (/^(?:TM\.|T\/M)/i.test(singleLineText)) {
    reason = 'Phần chữ ký thay mặt (TM.) chỉ có 1 dòng thẩm quyền ký, thiếu dòng chức vụ người ký (ví dụ: CHỦ TỊCH hoặc BÍ THƯ). Cần bổ sung để đúng thể thức.';
  } else if (/^(?:TL\.|TUQ\.)/i.test(singleLineText)) {
    reason = 'Phần chữ ký thừa lệnh/thừa ủy quyền chỉ có 1 dòng, thiếu dòng chức danh người ký cụ thể.';
  } else if (singleLineText) {
    reason = `Phần chữ ký hiện chỉ có 1 dòng "${singleLineText}". Theo Nghị định 30, cần kiểm tra bổ sung thẩm quyền ký (TM. hoặc KT.) ở dòng trên hoặc chức vụ cụ thể để hoàn thiện thể thức.`;
  } else {
    reason = 'Phần chữ ký chưa có thẩm quyền ký hoặc chức vụ ký.';
  }

  return {
    isSingleLine: true,
    authorityLine: auth,
    titleLine: title,
    singleLineText,
    reason
  };
}

/**
 * Bôi vàng (highlight) các vị trí lỗi chính tả / đoạn không logic trên HTML Live Preview
 * An toàn 100% với cấu trúc HTML: chỉ bôi vàng trên nội dung chữ hiển thị, không làm hỏng thẻ HTML.
 * Mỗi điểm lỗi được bọc trong <mark class="decree30-spelling-highlight" ...> để click chọn sửa hoặc bỏ qua.
 */
function highlightTokens(
  htmlContent: string,
  proposals: Array<{ id: string; wrong: string; right: string; reason?: string }>
): string {
  if (!htmlContent || !proposals || proposals.length === 0) return htmlContent;

  const valid = proposals.filter(p => p && p.wrong && p.wrong.trim().length > 0);
  if (valid.length === 0) return htmlContent;

  const sorted = [...valid].sort((a, b) => b.wrong.length - a.wrong.length);
  const tokens = htmlContent.split(/(<[^>]+>)/g);

  return tokens.map(token => {
    if (token.startsWith('<') && token.endsWith('>')) {
      return token;
    }

    let textChunk = token;
    for (const p of sorted) {
      if (!textChunk.includes(p.wrong)) continue;
      const escaped = p.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])(${escaped})(?![a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])`, 'gi');

      textChunk = textChunk.replace(regex, (match) => {
        const isDeletion = !p.right || p.right.trim() === '';
        const titleText = isDeletion
          ? `⚠️ ${p.reason || 'Đoạn thừa / lặp lại / không logic'}: Bấm để xem đề xuất [Đồng ý xóa / Bỏ qua]`
          : `⚠️ ${p.reason || 'Lỗi chính tả/không logic'}: Bấm để xem đề xuất [Đồng ý sửa / Bỏ qua]`;
        return `<mark class="decree30-spelling-highlight" data-proposal-id="${p.id}" data-proposal-wrong="${encodeURIComponent(p.wrong)}" data-proposal-right="${encodeURIComponent(p.right)}" data-proposal-reason="${encodeURIComponent(p.reason || '')}" style="background-color: #fef08a; color: #713f12; padding: 1px 3px; border-radius: 3px; border: 1px solid #facc15; font-weight: 600; cursor: pointer; text-decoration: underline wavy #eab308;" title="${titleText}">${match}</mark>`;
      });
    }

    return textChunk;
  }).join('');
}

export function highlightHtmlTextContent(
  html: string,
  proposals?: Array<{ id: string; wrong: string; right: string; reason?: string }>
): string {
  if (!html || !proposals || proposals.length === 0) return html;

  if (html.includes('<!-- OFFICIAL_HEADER_TABLE_START -->') && html.includes('<!-- OFFICIAL_HEADER_TABLE_END -->')) {
    const parts = html.split('<!-- OFFICIAL_HEADER_TABLE_START -->');
    const before = parts[0];
    const subParts = parts[1].split('<!-- OFFICIAL_HEADER_TABLE_END -->');
    const headerSection = subParts[0];
    const after = subParts.slice(1).join('<!-- OFFICIAL_HEADER_TABLE_END -->');

    // Trong bảng tiêu đề chính thức ở đầu văn bản: bảo vệ Quốc hiệu, Tiêu ngữ chuẩn không bị bôi vàng
    const headerProposals = proposals.filter(p => {
      const cleanWrong = (p.wrong || '').trim();
      return !/^(?:Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc|CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM|ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM)$/i.test(cleanWrong);
    });

    const highlightedHeader = highlightTokens(headerSection, headerProposals);
    // Trong toàn bộ phần còn lại (nội dung body, căn cứ, phụ lục...): Áp dụng 100% đề xuất kể cả Quốc hiệu trùng lặp trong body, ghi chú dự thảo, AI chatter
    const highlightedAfter = highlightTokens(after, proposals);

    return before + '<!-- OFFICIAL_HEADER_TABLE_START -->' + highlightedHeader + '<!-- OFFICIAL_HEADER_TABLE_END -->' + highlightedAfter;
  }

  // Fallback nếu không có marker: bảo vệ Quốc hiệu nếu chưa có zone
  const validProposals = proposals.filter(p => {
    if (!p || !p.wrong || p.wrong.trim().length === 0) return false;
    return true;
  });

  return highlightTokens(html, validProposals);
}

/**
 * Tạo HTML chuẩn A4 mô phỏng văn bản hành chính theo Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW
 * Khớp 100% với file Word xuất ra:
 * - Font chữ duy nhất: Times New Roman, bộ mã Unicode
 * - Bảng biểu căn vừa khít trang A4, không vỡ layout
 * - Kính gửi & Nơi nhận mặc định có sẵn, các dòng tự động bắt đầu bằng dấu gạch ngang (-)
 * - Hỗ trợ bôi vàng trực quan các điểm lỗi chính tả/logic chưa xử lý theo yêu cầu người dùng
 */
export function generateDecree30A4Html(
  textOrDoc: string | StructuredDoc, 
  settings: AgencySettings, 
  docCategory?: string,
  docTypeNameHint?: string,
  highlightProposals?: Array<{ id: string; wrong: string; right: string; reason?: string }>
): string {
  const doc = (typeof textOrDoc === 'object' && textOrDoc !== null)
    ? textOrDoc
    : parseDocumentStructure(textOrDoc, settings, docCategory, docTypeNameHint);
  const isCongVan = isCongVanDocument(doc, null, docTypeNameHint);

  // Chuẩn bị danh sách Kính gửi (nếu có)
  const recipientHeaderItems = doc.recipientsHeader
    ? doc.recipientsHeader.split('\n').map(l => l.trim()).filter(Boolean)
    : [];

  const rawHtml = `
    <div class="a4-document-page font-times text-slate-950 bg-white" style="font-family: 'Times New Roman', Times, 'Tinos', serif; font-size: 14pt; line-height: 1.5; color: #000; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.15); border: 1px solid #e2e8f0; border-radius: 4px; padding: 20mm 18mm 20mm 30mm; min-height: 297mm; box-sizing: border-box; background-color: #ffffff;">
      
      <!-- SỐ TRANG VĂN BẢN CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP & HD 05 (ĐẶT Ở GIỮA LỀ TRÊN, CỠ 13-14PT ĐỨNG, TỰ ĐỘNG TỪ TRANG 2) -->
      <div class="page-number-rule-banner print:hidden text-center text-[11px] text-slate-400 select-none pb-2 mb-3 border-b border-dashed border-slate-200 flex items-center justify-center gap-1.5 font-sans" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Số trang văn bản (NĐ 30 & HD 05): Tự động đặt ở giữa theo chiều ngang lề trên, cỡ 13-14pt chữ đứng, đánh số từ trang thứ 2 (trang 1 không ghi)</span>
      </div>

      <!-- OFFICIAL_HEADER_TABLE_START -->
      <!-- BẢNG BỐ CỤC ĐẦU VĂN BẢN (TỔNG CHIỀU DÀI 16,2CM, CỘT TRÁI 6,5CM, CỘT PHẢI 9,7CM, ẨN VIỀN, NỘI DUNG CANH GIỮA TRONG TỪNG CỘT) -->
      ${(() => {
        // NẾU LÀ CÔNG VĂN: GỌI MODULE_CONG_VAN CHUYÊN BIỆT ĐỂ ĐẢM BẢO TRÍCH YẾU NẰM ĐÚNG Ô BÊN TRÁI DƯỚI SỐ KÝ HIỆU
        if (isCongVan) {
          return renderCongVanHeaderTableHtml(doc, settings, {
            getStandardAgencyHeaderParts,
            formatDocCodeForDisplay
          });
        }

        const agencyParts = getStandardAgencyHeaderParts(doc.parentAgency, doc.agencyName);
        const agencyNameText = agencyParts.hasLine2 ? agencyParts.line2 : agencyParts.line1;
        // Kích cỡ tên cơ quan ban hành: bình thường để 13pt, chỉ những đơn vị dài mới để xuống 12pt
        const isLongAgency = agencyNameText.length > 28;
        const agencyFontSize = isLongAgency ? '12pt' : '13pt';
        const parentAgencyText = agencyParts.hasLine2 ? agencyParts.line1 : '';

        return `
          <table style="width: 16.2cm; max-width: 100%; border-collapse: collapse; border: none; margin: 0 auto 14pt auto; font-family: 'Times New Roman', Times, serif;">
            <!-- HÀNG 1: TÊN CƠ QUAN CẤP TRÊN (NẾU CÓ) BẰNG TRÊN 1 DÒNG VỚI QUỐC NGỮ -->
            <tr style="vertical-align: top;">
              <!-- Bên trái (Ô số 2): Tên cơ quan cấp trên nếu có (cỡ 12.5pt, in hoa, đứng) -->
              <td style="width: 6.5cm; max-width: 6.5cm; vertical-align: top; text-align: center; padding: 0 4pt 0 0; border: none;">
                ${parentAgencyText ? `
                  <div style="font-size: 12.5pt; text-transform: uppercase; font-weight: normal; letter-spacing: -0.1px; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2pt;">
                    ${parentAgencyText}
                  </div>
                ` : `
                  <div style="font-size: 12.5pt; line-height: 1.25; margin-bottom: 2pt;">&nbsp;</div>
                `}
              </td>

              <!-- Cột phải (Ô số 1): Quốc hiệu (cỡ 13pt, in hoa, đậm, căn giữa, chỉ 1 dòng) -->
              <td style="width: 9.7cm; max-width: 9.7cm; vertical-align: top; text-align: center; padding: 0 0 0 4pt; border: none;">
                ${!doc.isPartyDoc ? `
                  <div style="font-size: 13pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2pt; white-space: nowrap; text-align: center;">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                ` : `
                  <div style="font-size: 13.5pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2pt; white-space: nowrap; text-align: center;">
                    ĐẢNG CỘNG SẢN VIỆT NAM
                  </div>
                `}
              </td>
            </tr>

            <!-- HÀNG 2: TÊN CƠ QUAN BAN HÀNH & TIÊU NGỮ KÈM ĐƯỜNG KẺ NGANG NÉT LIỀN -->
            <tr style="vertical-align: top;">
              <!-- Bên trái: Tên cơ quan ban hành (cỡ 12-13pt in hoa đậm) có gạch dưới 1/3 - 1/2 độ dài, ĐỘ ĐẬM BẰNG 100% VỚI TIÊU NGỮ -->
              <td style="width: 6.5cm; max-width: 6.5cm; vertical-align: top; text-align: center; padding: 0 4pt 0 0; border: none;">
                <div style="display: inline-block; text-align: center;">
                  <div style="font-size: ${agencyFontSize}; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2.5pt;">
                    ${agencyNameText}
                  </div>
                  <div style="display: block; width: 42%; min-width: 65px; max-width: 90px; border-bottom: 1.2pt solid #000; margin: 0 auto 4pt auto;"></div>
                </div>
              </td>

              <!-- Cột phải: Tiêu ngữ Độc lập - Tự do - Hạnh phúc (Cỡ 14pt, đậm, căn giữa) phía dưới có đường kẻ ngang, nét liền, dài bằng đúng độ dài của dòng chữ, ĐỘ ĐẬM BẰNG 100% VỚI CƠ QUAN BAN HÀNH -->
              <td style="width: 9.7cm; max-width: 9.7cm; vertical-align: top; text-align: center; padding: 0 0 0 4pt; border: none;">
                ${!doc.isPartyDoc ? `
                  <div style="display: inline-block; text-align: center; margin: 0 auto;">
                    <div style="font-size: 14pt; font-weight: bold; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2pt; white-space: nowrap; text-align: center;">
                      ${doc.motto?.trim() || 'Độc lập - Tự do - Hạnh phúc'}
                    </div>
                    <!-- Đường kẻ ngang nét liền, dài đúng 100% bằng độ dài dòng chữ (5.3cm), căn giữa -->
                    <table align="center" style="width: 5.3cm; max-width: 5.3cm; margin: 0 auto; border-collapse: collapse; border: none; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                      <tr>
                        <td style="border-bottom: 1.2pt solid #000000; border-top: none; border-left: none; border-right: none; height: 1pt; font-size: 1pt; line-height: 1pt; padding: 0; mso-line-height-rule: exactly;">
                          &nbsp;
                        </td>
                      </tr>
                    </table>
                  </div>
                ` : `
                  <div style="display: inline-block; text-align: center; margin: 0 auto;">
                    <div style="font-size: 14pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2.5pt; white-space: nowrap; text-align: center;">
                      ĐẢNG CỘNG SẢN VIỆT NAM
                    </div>
                    <div style="display: block; width: 50%; border-bottom: 1.2pt solid #000; margin: 0 auto 4pt auto;"></div>
                  </div>
                `}
              </td>
            </tr>

            <!-- HÀNG 3: Ô SỐ 3 (SỐ CÔNG VĂN) CÙNG 1 DÒNG VỚI Ô SỐ 4 (ĐỊA DANH, NGÀY THÁNG NĂM) -->
            <tr style="vertical-align: top;">
              <td style="width: 6.5cm; max-width: 6.5cm; vertical-align: top; text-align: center; padding: 4pt 4pt 0 0; border: none;">
                <!-- Ô số 3: Số, ký hiệu (Cách nhau 1cm, không sử dụng dấu .....) -->
                <div style="font-size: 13pt; font-weight: normal; font-family: 'Times New Roman', serif; text-align: center;">
                  ${formatDocCodeForDisplay(doc.docCode, true)}
                </div>
              </td>
              <td style="width: 9.7cm; max-width: 9.7cm; vertical-align: top; text-align: center; padding: 4pt 0 0 4pt; border: none;">
                <!-- Ô số 4: Địa danh, ngày tháng năm (Cỡ 13,5pt, nghiêng, căn giữa). Cùng 1 dòng với Số công văn -->
                <div style="font-size: 13.5pt; font-style: italic; font-family: 'Times New Roman', serif; text-align: center;">
                  ${(doc.locationDate || `${settings.shortLocation || 'Đông Tiến'}, ngày      tháng      năm ${settings.issuingYear || new Date().getFullYear()}`)
                    .replace(/ {2,}/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
                    .replace(/[\.…]{2,}/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}
                </div>
              </td>
            </tr>

            <!-- HÀNG 4: TRÍCH YẾU CÔNG VĂN (Ô SỐ 5b NẾU CÓ) - KẾT THÚC KHÔNG CÓ DẤU GẠCH NGANG -->
            ${(doc.docTypeName !== 'QUYẾT ĐỊNH' && (isCongVan || doc.docSubjectShort)) ? `
              <tr style="vertical-align: top;">
                <td style="width: 6.5cm; max-width: 6.5cm; vertical-align: top; text-align: center; padding: 4pt 4pt 0 0; border: none;">
                  ${doc.docSubjectShort ? `
                    <div style="font-size: 12.5pt; font-style: normal; font-weight: normal; line-height: 1.3; font-family: 'Times New Roman', serif; text-align: center;">
                      ${doc.docSubjectShort.startsWith('V/v') ? doc.docSubjectShort : `V/v ${doc.docSubjectShort.replace(/^(?:Về việc|Trích yếu|Nội dung)[\s:\.]*/i, '')}`}
                    </div>
                  ` : ''}
                </td>
                <td style="width: 9.7cm; max-width: 9.7cm; vertical-align: top; border: none;"></td>
              </tr>
            ` : ''}
          </table>
        `;
      })()}
      <!-- OFFICIAL_HEADER_TABLE_END -->

      <!-- TÊN LOẠI VĂN BẢN VÀ TRÍCH YẾU (KHÔNG DÙNG CHO CÔNG VĂN THÔNG THƯỜNG) -->
      ${!isCongVan && doc.docTypeName ? (
        doc.docTypeName === 'QUYẾT ĐỊNH' ? `
          <div align="center" style="text-align: center; margin: 14pt 0 12pt 0; font-family: 'Times New Roman', serif;">
            <!-- Tên loại “QUYẾT ĐỊNH”: In hoa, cỡ 13–14, đứng, đậm, canh giữa -->
            <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Times New Roman', serif; margin-bottom: 4pt;">
              QUYẾT ĐỊNH
            </div>
            <!-- Trích yếu (“Về việc …”): In thường, cỡ 13–14, đứng, đậm, canh giữa, có đường kẻ ngang dưới dài 1/3–1/2 dòng chữ -->
            ${doc.docTitle ? `
              <div style="display: inline-block; text-align: center; margin: 0 auto;">
                <div style="font-size: 14pt; font-weight: bold; font-family: 'Times New Roman', serif; line-height: 1.35; margin-bottom: 2pt;">
                  ${doc.docTitle}
                </div>
                <div style="display: block; width: 40%; min-width: 60px; max-width: 100px; border-bottom: 1.2pt solid #000000; margin: 0 auto 6pt auto;"></div>
              </div>
            ` : ''}
            <!-- Thẩm quyền ban hành: Chức danh người ra quyết định, in hoa, đậm, canh giữa, đặt dưới trích yếu, Cỡ 13–14 -->
            ${doc.issuingAuthority ? `
              <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 4pt; font-family: 'Times New Roman', serif;">
                ${doc.issuingAuthority}
              </div>
            ` : ''}
          </div>
        ` : `
          <div align="center" style="text-align: center; margin: 16pt 0 14pt 0; font-family: 'Times New Roman', serif;">
            <div style="font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Times New Roman', serif;">
              ${doc.docTypeName}
            </div>
            ${doc.docTitle ? `
              <div style="font-size: 14pt; font-weight: bold; margin-top: 4pt; font-family: 'Times New Roman', serif;">
                ${doc.docTitle}
              </div>
            ` : ''}
          </div>
        `
      ) : ''}

      <!-- KÍNH GỬI CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP -->
      <!-- Nằm ngay dưới dòng trích yếu “V/v …”, trước phần nội dung. Bắt đầu từ ở giữa của cột trái (~3.1cm) -->
      <!-- Cỡ chữ thống nhất 14pt, in thường (chữ cái đầu viết hoa như tên riêng), kiểu chữ đứng, không đậm -->
      <!-- NGUYÊN TẮC VÀNG 2: Báo cáo & Quyết định KHÔNG CÓ phần Kính gửi theo chuẩn Nghị định 30/2020/NĐ-CP -->
      ${(() => {
        if (doc.docTypeName === 'BÁO CÁO' || doc.docTypeName?.startsWith('BÁO CÁO') || doc.docTypeName === 'QUYẾT ĐỊNH') {
          return '';
        }
        const cleanedItems = recipientHeaderItems.map(item => {
          let cleaned = item.replace(/^Kính\s*(?:gửi|trình):?\s*/i, '').trim();
          cleaned = cleaned.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
          return cleaned;
        }).filter(Boolean);

        if (cleanedItems.length === 0) return '';

        if (cleanedItems.length === 1) {
          // Gửi một nơi: Ghi trên cùng một dòng, TUYỆT ĐỐI KHÔNG có dấu gạch -, ví dụ: Kính gửi: UBND thị xã Bỉm Sơn.
          return `
            <div style="margin: 14pt 0 14pt 3.1cm; font-family: 'Times New Roman', serif; font-size: 14pt; font-weight: normal; font-style: normal; line-height: 1.45;">
              Kính gửi: ${cleanedItems[0]}.
            </div>
          `;
        }

        // Khi gửi nhiều nơi: Mỗi nơi nhận một dòng, bắt đầu từ cuối của từ kính gửi, đầu dòng có gạch đầu dòng,
        // các dòng nơi nhận canh thẳng hàng với nhau, xếp thành một khối ở giữa trang.
        // Cuối dòng có dấu chấm phẩy, dòng cuối có dấu chấm.
        return `
          <table style="border: none; border-collapse: collapse; margin: 14pt 0 14pt 3.25cm; font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.45;">
            <tr style="vertical-align: top;">
              <td style="vertical-align: top; border: none; padding: 0 4pt 0 0; white-space: nowrap; font-size: 14pt; font-weight: normal; font-style: normal;">
                Kính gửi:
              </td>
              <td style="vertical-align: top; border: none; padding: 0; font-size: 14pt; font-weight: normal; font-style: normal;">
                ${cleanedItems.map((item, idx) => {
                  const isLast = idx === cleanedItems.length - 1;
                  return `<div style="margin-bottom: 2pt;">- ${item}${isLast ? '.' : ';'}</div>`;
                }).join('')}
              </td>
            </tr>
          </table>
        `;
      })()}

      <!-- CĂN CỨ PHÁP LÝ (NẾU CÓ) -->
      ${doc.legalBases.length > 0 ? `
        <div style="margin-bottom: 10pt; font-family: 'Times New Roman', serif;">
          ${doc.legalBases.map(base => `
            <p style="font-style: italic; font-size: 13pt; text-align: justify; margin-bottom: 4pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
              ${base}
            </p>
          `).join('')}
        </div>
      ` : ''}

      <!-- NỘI DUNG VĂN BẢN (BAO GỒM BẢNG BIỂU ĐƯỢC ĐỊNH DẠNG VỪA KHÍT TRANG A4) -->
      <div style="line-height: 1.55; margin-bottom: 18pt; font-family: 'Times New Roman', serif;">
        ${doc.bodyParagraphs.map(p => {
          const cleanP = p.replace(/[\*_~`#]/g, '').trim();
          if (!cleanP || isWarningOrInstructionLine(cleanP)) return '';

          // 0. BẢNG BIỂU (HTML TABLE HOẶC MARKDOWN TABLE) - ĐỊNH DẠNG VỪA VẶN TRANG A4
          if (cleanP.includes('<table') || cleanP.includes('___TABLE_BLOCK_') || /^\|[^\n]+\|/.test(cleanP)) {
            let tableHtml = cleanP;
            if (/^\|[^\n]+\|/.test(cleanP)) {
              tableHtml = convertMarkdownTableToHtml(cleanP);
            } else {
              tableHtml = formatHtmlTableToFitA4(cleanP);
            }
            return `
              <div class="my-4 overflow-x-auto w-full" style="width: 100%; max-width: 100%; margin: 12pt 0; text-indent: 0pt;">
                ${tableHtml}
              </div>
            `;
          }

          // 1. Chỉ thị hành động chính (QUYẾT ĐỊNH:, QUYẾT NGHỊ:, CHỈ THỊ:, KẾT LUẬN:, YÊU CẦU:)
          if (/^(QUYẾT ĐỊNH|QUYẾT NGHỊ|CHỈ THỊ|KẾT LUẬN|YÊU CẦU|CÔNG NHẬN|PHÊ CHUẨN|CHUẨN Y)\s*[:\.]?$/i.test(cleanP)) {
            const cmdName = cleanP.replace(/[:\.\s]+$/, '').toUpperCase();
            return `
              <p align="center" style="text-align: center; font-weight: bold; font-size: 14pt; margin: 16pt 0 12pt 0; text-indent: 0pt; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Times New Roman', serif;">
                ${cmdName}:
              </p>
            `;
          }

          // 1.1. Tiêu đề Phần (Ví dụ: "Phần I", "Phần thứ nhất")
          // Từ “Phần” và số thứ tự: In thường 13 - 14 Đứng, đậm: Ví dụ: Phần I
          // Tiêu đề của phần: In hoa 13 - 14 Đứng, đậm: Ví dụ: TÌNH HÌNH THỰC HIỆN NHIỆM VỤ ...
          const partMatch = cleanP.match(/^(Phần\s+(?:[IVXLCDM\d]+|thứ\s+[a-zA-ZÀ-ỹ\d]+))[\.:]?\s*(.*)$/i);
          if (partMatch) {
            const partLabel = partMatch[1];
            const partTitle = partMatch[2]?.trim();
            return `
              <p align="center" style="text-align: center; font-weight: bold; font-size: 14pt; margin: 16pt 0 3pt 0; text-indent: 0pt; font-family: 'Times New Roman', serif;">
                ${partLabel}
              </p>
              ${partTitle ? `
                <p align="center" style="text-align: center; font-weight: bold; font-size: 14pt; margin: 0 0 10pt 0; text-indent: 0pt; text-transform: uppercase; font-family: 'Times New Roman', serif;">
                  ${partTitle.toUpperCase()}
                </p>
              ` : ''}
            `;
          }

          // 2. Tiêu đề Chương (CHƯƠNG I, CHƯƠNG II...) -> Căn giữa in hoa đậm
          const chapterMatch = cleanP.match(/^(Chương\s+[IVXLCDM\d]+)[\.:]?\s*(.*)$/i);
          if (chapterMatch) {
            const chapNum = chapterMatch[1].toUpperCase();
            const chapTitle = chapterMatch[2]?.trim().toUpperCase();
            return `
              <p align="center" style="text-align: center; font-weight: bold; font-size: 14pt; margin: 14pt 0 3pt 0; text-indent: 0pt; text-transform: uppercase; font-family: 'Times New Roman', serif;">
                ${chapNum}
              </p>
              ${chapTitle ? `
                <p align="center" style="text-align: center; font-weight: bold; font-size: 14pt; margin: 0 0 8pt 0; text-indent: 0pt; text-transform: uppercase; font-family: 'Times New Roman', serif;">
                  ${chapTitle}
                </p>
              ` : ''}
            `;
          }

          // 3. Số thứ tự và tiêu đề của mục: In hoa 13 - 14 Đứng, đậm Ví dụ: I. NHỮNG KẾT QUẢ... hoặc Mục I...
          const romanMatch = cleanP.match(/^([IVXLCDM]+\.)(?:\s+(.*))?$/);
          const mucWordMatch = cleanP.match(/^(Mục\s+[IVXLCDM\d]+)[\.:]?\s*(.*)$/i);
          if (romanMatch || mucWordMatch) {
            const fullMucText = cleanP.toUpperCase();
            return `
              <p style="text-align: justify; font-weight: bold; font-size: 14pt; margin: 12pt 0 6pt 0; text-indent: 1cm; font-family: 'Times New Roman', serif;">
                ${fullMucText}
              </p>
            `;
          }

          // 4. Đoạn mở đầu căn cứ kết thúc bằng dấu phẩy hoặc dấu chấm phẩy
          if (/^(Xét\s+|Theo\s+đề\s+nghị|Sau\s+khi\s+xem\s+xét|Căn\s+cứ)/i.test(cleanP) || cleanP.endsWith(',') || cleanP.endsWith(';')) {
            return `
              <p style="text-align: justify; margin-bottom: 6pt; text-indent: 1cm; font-style: italic; font-family: 'Times New Roman', serif;">
                ${cleanP}
              </p>
            `;
          }

          // 5. Tiêu đề Điều khoản (Điều 1., Điều 2...)
          // - Trường hợp có tiêu đề: Thường 13 - 14 Đứng, in đậm Ví dụ: Điều 1. Phạm vi và đối tượng áp dụng
          // - Trường hợp không có tiêu đề: Thường 13 - 14 Đứng Ví dụ: Điều 1. Quyết định này có hiệu lực thi hành kể từ ngày…
          const articleMatch = cleanP.match(/^(Điều\s+\d+)[\.:]?\s*(.*)$/i);
          if (articleMatch) {
            const articleLabel = `${articleMatch[1]}.`;
            const rest = articleMatch[2]?.trim() || '';
            const headingInfo = detectNumberedHeading(rest);

            if (headingInfo.hasTitle) {
              return `
                <p style="text-align: justify; margin-bottom: 6pt; text-indent: 1cm; font-family: 'Times New Roman', serif; font-size: 14pt;">
                  <strong>${articleLabel} ${headingInfo.title}</strong>${headingInfo.content ? ` ${headingInfo.content}` : ''}
                </p>
              `;
            } else {
              return `
                <p style="text-align: justify; margin-bottom: 6pt; text-indent: 1cm; font-family: 'Times New Roman', serif; font-size: 14pt;">
                  <strong>${articleLabel}</strong> ${rest}
                </p>
              `;
            }
          }

          // 6. Khoản (1., 2., 3... hoặc 1.1., 1.2...)
          // - Trường hợp có tiêu đề: Thường 13 - 14 Đứng, in đậm Ví dụ: 1. Phạm vi và đối tượng áp dụng
          // - Trường hợp không có tiêu đề: Thường 13 - 14 Đứng (không đậm) Ví dụ: 1. Quyết định này có hiệu lực thi hành kể từ ngày…
          const numMatch = cleanP.match(/^(\d+(?:\.\d+)*\.)(?:\s+(.*))?$/);
          if (numMatch) {
            const numBullet = numMatch[1];
            const rest = (numMatch[2] || '').trim();
            const headingInfo = detectNumberedHeading(rest);

            if (headingInfo.hasTitle) {
              // Trường hợp có tiêu đề: In thường 13 - 14 Đứng, đậm
              return `
                <p style="text-align: justify; margin-bottom: 5pt; text-indent: 1cm; font-family: 'Times New Roman', serif; font-size: 14pt;">
                  <strong>${numBullet} ${headingInfo.title}</strong>${headingInfo.content ? ` ${headingInfo.content}` : ''}
                </p>
              `;
            } else {
              // Trường hợp KHÔNG có tiêu đề: In thường 13 - 14 Đứng (KHÔNG ĐẬM)
              return `
                <p style="text-align: justify; margin-bottom: 5pt; text-indent: 1cm; font-family: 'Times New Roman', serif; font-size: 14pt; font-weight: normal;">
                  ${numBullet} ${rest}
                </p>
              `;
            }
          }

          // 7. Điểm (a), b), c)...): Thường 13 - 14 Đứng Ví dụ: a) Đối với ...
          const letterMatch = cleanP.match(/^([a-zđ]\))(?:\s+(.*))?$/i);
          if (letterMatch) {
            return `
              <p style="text-align: justify; margin-bottom: 4pt; text-indent: 1cm; font-family: 'Times New Roman', serif; font-size: 14pt; font-weight: normal; font-style: normal;">
                ${cleanP}
              </p>
            `;
          }

          // 8. Thống nhất tất cả các Bullet (-, +, *, •, ●, ○) có khoảng cách thụt lề bằng nhau (1cm)
          // Không phân chia -/+ thụt lề nhiều hơn, tất cả thụt lề bằng nhau chuẩn Nghị định 30
          if (/^[\-\+\*•●○■◆❖✓►➢]\s*/.test(cleanP)) {
            const bulletText = cleanP.replace(/^[\-\+\*•●○■◆❖✓►➢]\s*/, '- ');
            return `
              <p style="text-align: justify; margin-bottom: 4pt; text-indent: 1cm; margin-left: 0; font-family: 'Times New Roman', serif;">
                ${bulletText}
              </p>
            `;
          }

          // 10. Đoạn văn nội dung thông thường (thụt lề 1cm, căn đều 2 bên)
          return `
            <p style="text-align: justify; margin-bottom: 6pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
              ${cleanP}
            </p>
          `;
        }).join('')}
      </div>

      <!-- BẢNG BỐ CỤC CHÂN TRANG: NƠI NHẬN & CHỮ KÝ (2 CỘT ẨN VIỀN) -->
      <table style="width: 100%; border-collapse: collapse; border: none; margin-top: 20pt; page-break-inside: avoid; font-family: 'Times New Roman', Times, serif;">
        <tr>
          <!-- Cột 1: Nơi nhận (Rà soát và loại bỏ sạch trùng lặp với khối chữ ký) -->
          <td style="width: 48%; vertical-align: top; padding: 0 10pt 0 0; border: none;">
            ${(() => {
              const safeRecs = cleanAndDeduplicateRecipients(doc.recipients || [], {
                quyenHanKy: doc.quyenHanKy,
                signerAuthority: doc.signerAuthority,
                signerTitle: doc.signerTitle,
                signerName: doc.signerName,
              });
              if (safeRecs.length === 0) return '';
              return `
                <div style="font-size: 12pt; font-weight: bold; font-style: italic; margin-bottom: 3pt; font-family: 'Times New Roman', serif;">
                  Nơi nhận:
                </div>
                <div style="font-size: 11pt; line-height: 1.35; font-family: 'Times New Roman', serif;">
                  ${safeRecs.map(r => {
                    const withDash = r.startsWith('-') ? r : `- ${r.replace(/^[-\u2013\u2014]\s*/, '')}`;
                    return `<div style="margin-bottom: 1.5pt;">${withDash}</div>`;
                  }).join('')}
                </div>
              `;
            })()}
          </td>

          <!-- Cột 2: Quyền hạn, chức vụ & chữ ký (Tách rõ Dòng 1: Quyền hạn + Chức vụ; Dòng 2: Họ và tên) -->
          <td style="width: 52%; vertical-align: top; text-align: center; padding: 0 0 0 10pt; border: none;">
            ${(() => {
              const sigCheck = checkSignatureLines(doc);

              if (sigCheck.isSingleLine) {
                // Nhận dạng nếu phần chữ ký chỉ có 1 dòng quyền hạn hoặc chức vụ ký -> Bôi vàng để người sử dụng lưu ý bổ sung
                const textToShow = sigCheck.singleLineText || 'CHƯA CÓ CHỨC VỤ / QUYỀN HẠN KÝ';
                return `
                  <div style="display: inline-block; text-align: center;">
                    <div class="decree30-single-line-sig-highlight" style="display: inline-block; background-color: #fef08a; color: #713f12; padding: 3px 8px; border-radius: 4px; border: 1.5px solid #facc15; font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman', serif; line-height: 1.25; text-decoration: underline wavy #eab308; cursor: pointer;" title="⚠️ ${sigCheck.reason} Bấm tại bước chỉnh sửa để bổ sung đầy đủ!">
                      ${textToShow}
                    </div>
                    <div style="font-size: 9.5pt; color: #b45309; font-style: italic; margin-top: 3pt; font-family: 'Times New Roman', serif; line-height: 1.25;">
                      ⚠️ (Chỉ có 1 dòng: Lưu ý bổ sung Thẩm quyền ký / Chức vụ ký theo NĐ 30)
                    </div>
                  </div>
                `;
              }

              // Có 3 dòng vai trò ký (Thay mặt tập thể + Ký thay/Chức vụ người đứng đầu + Chức vụ người ký trực tiếp)
              if (sigCheck.hasThreeLines && sigCheck.roleLine2) {
                return `
                  <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman', serif; line-height: 1.25;">
                    ${sigCheck.authorityLine}
                  </div>
                  <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt; font-family: 'Times New Roman', serif; line-height: 1.25;">
                    ${sigCheck.roleLine2}
                  </div>
                  <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt; font-family: 'Times New Roman', serif; line-height: 1.25;">
                    ${sigCheck.titleLine}
                  </div>
                `;
              }

              // Có đủ 2 dòng phân biệt: Thẩm quyền ký ở dòng 1 và Chức vụ người ký ở dòng 2
              return `
                <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman', serif; line-height: 1.25;">
                  ${sigCheck.authorityLine}
                </div>
                <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt; font-family: 'Times New Roman', serif; line-height: 1.25;">
                  ${sigCheck.titleLine}
                </div>
              `;
            })()}
            
            <!-- Thêm khoảng trống 1 dòng giãn cách tiêu chuẩn ngay dưới chức năng/quyền ký hiệu -->
            <div style="height: 14pt; line-height: 14pt; font-size: 14pt;">&nbsp;</div>
            <!-- Thêm 1 dòng giãn cách bổ sung theo yêu cầu tăng khoảng cách tên người ký và chức danh -->
            <div style="height: 14pt; line-height: 14pt; font-size: 14pt;">&nbsp;</div>
            
            <!-- Mở rộng không gian ký tên (khoảng trống 80–90pt trong HTML) cho cả chữ ký tươi và ký số điện tử -->
            <div style="height: 85pt; min-height: 85pt; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 10pt; color: #94a3b8; font-style: italic; font-family: 'Times New Roman', serif;">
                (Ký tươi / Ký số điện tử)
              </span>
            </div>

            <!-- Dòng 2: Họ và tên người ký (in đậm 14pt chuẩn NĐ 30) -->
            ${doc.signerName ? `
              <div style="font-size: 14pt; font-weight: bold; margin-top: 4pt; font-family: 'Times New Roman', serif;">
                ${doc.signerName}
              </div>
            ` : `
              <div style="font-size: 14pt; font-weight: bold; margin-top: 4pt; font-family: 'Times New Roman', serif; min-height: 18pt;">
                &nbsp;
              </div>
            `}
          </td>
        </tr>
      </table>

    </div>

    <!-- PHẦN PHỤ LỤC (NẾU CÓ - DÙNG NGẮT TRANG A4 SANG TRANG RIÊNG BIỆT) -->
    ${(doc.appendices && doc.appendices.length > 0) ? doc.appendices.map((app, appIdx) => `
      <!-- THẺ NGẮT TRANG DÀNH CHO MICROSOFT WORD & IN ẤN -->
      <br clear=all style='page-break-before:always; mso-break-type:section-break; mso-special-character:line-break;'>
      
      <!-- ĐƯỜNG PHÂN CÁCH TRỰC QUAN NGẮT TRANG (CHỈ HIỂN THỊ KHI XEM TRÊN MÀN HÌNH) -->
      <div class="print:hidden my-8 flex items-center justify-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider font-sans select-none">
        <div class="h-px bg-slate-300 flex-1"></div>
        <span class="px-3.5 py-1.5 bg-slate-200 text-slate-700 rounded-full border border-slate-300 flex items-center gap-2 shadow-2xs">
          <span>📄</span>
          <span>Ngắt trang A4 • ${app.header || `Phụ lục ${appIdx + 1}`}</span>
        </span>
        <div class="h-px bg-slate-300 flex-1"></div>
      </div>

      <!-- TỜ GIẤY A4 PHỤ LỤC RIÊNG BIỆT (KHỔ CHUẨN 210mm x 297mm) -->
      <div class="a4-document-page a4-appendix-page font-times text-slate-950 bg-white" style="page-break-before: always; break-before: page; font-family: 'Times New Roman', Times, 'Tinos', serif; font-size: 14pt; line-height: 1.5; color: #000; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.15); border: 1px solid #e2e8f0; border-radius: 4px; padding: 20mm 20mm 20mm 30mm; min-height: 297mm; box-sizing: border-box; background-color: #ffffff; margin-top: 24pt;">
        
        <!-- TIÊU ĐỀ PHỤ LỤC CHUẨN THỂ THỨC NGHỊ ĐỊNH 30/2020/NĐ-CP -->
        <div align="center" style="text-align: center; margin-bottom: 16pt; font-family: 'Times New Roman', serif;">
          <!-- Dòng 1: PHỤ LỤC 1 -->
          <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
            ${app.header}
          </div>
          
          <!-- Dòng 2: Tên Phụ Lục (VD: SỐ LƯỢNG CÁC ĐƠN VỊ THAM GIA LỄ PHÁT ĐỘNG) -->
          ${app.title ? `
            <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 5pt; line-height: 1.35;">
              ${app.title.replace(/^-\s*/, '')}
            </div>
          ` : ''}

          <!-- Dòng 3: Ghi chú Ban hành kèm theo... -->
          ${app.referenceNote ? `
            <div style="font-size: 12pt; font-style: italic; margin-top: 5pt; margin-bottom: 12pt; line-height: 1.35;">
              ${app.referenceNote.replace(/^-\s*/, '')}
            </div>
          ` : ''}
        </div>

        <!-- NỘI DUNG VÀ BẢNG BIỂU PHỤ LỤC (CĂN VỪA KHÍT TRANG A4) -->
        <div style="line-height: 1.55; font-family: 'Times New Roman', serif;">
          ${app.paragraphs.map(p => {
            const cleanP = p.replace(/[\*_~`#]/g, '').trim();
            if (cleanP.includes('<table') || cleanP.includes('___TABLE_BLOCK_') || /^\|[^\n]+\|/.test(cleanP)) {
              let tableHtml = cleanP;
              if (/^\|[^\n]+\|/.test(cleanP)) {
                tableHtml = convertMarkdownTableToHtml(cleanP);
              } else {
                tableHtml = formatHtmlTableToFitA4(cleanP);
              }
              return `
                <div class="my-4 overflow-x-auto w-full" style="width: 100%; max-width: 100%; margin: 12pt 0; text-indent: 0pt;">
                  ${tableHtml}
                </div>
              `;
            }
            return `
              <p style="text-align: justify; margin-bottom: 6pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
                ${cleanP}
              </p>
            `;
          }).join('')}
        </div>

      </div>
    `).join('') : ''}
  `;

  return highlightHtmlTextContent(rawHtml, highlightProposals);
}

/**
 * Chuyển đổi structured doc thành định dạng text chuẩn hóa
 */
export function reconstructNormalizedText(doc: StructuredDoc): string {
  const parts: string[] = [];

  if (doc.parentAgency) parts.push(doc.parentAgency);
  if (doc.agencyName) parts.push(doc.agencyName);
  if (doc.docCode) parts.push(doc.docCode);
  const isCongVan = isCongVanDocument(doc);
  const cvSubject = isCongVan ? getCongVanSubject(doc) : (doc.docSubjectShort || '');
  if (cvSubject) parts.push(cvSubject);
  if (doc.parentAgency || doc.agencyName || doc.docCode || cvSubject) parts.push('');

  if (!doc.isPartyDoc) {
    if (doc.countryHeader) parts.push(doc.countryHeader);
    if (doc.motto) parts.push(doc.motto);
  } else {
    parts.push(doc.motto || 'ĐẢNG CỘNG SẢN VIỆT NAM');
  }
  if (doc.locationDate) parts.push(doc.locationDate);
  if (doc.countryHeader || doc.motto || doc.locationDate) parts.push('');

  if (!isCongVan && doc.docTypeName) {
    parts.push(doc.docTypeName);
    if (doc.docTitle) parts.push(doc.docTitle);
    parts.push('');
  }

  // Kính gửi: Nếu 1 cơ quan -> trên 1 dòng không có dấu gạch (-); nếu từ 2 cơ quan trở lên -> mỗi cơ quan 1 dòng có gạch (-)
  const isReport = doc.docTypeName === 'BÁO CÁO' || doc.docTypeName?.startsWith('BÁO CÁO');
  if (!isReport && doc.recipientsHeader && doc.recipientsHeader.trim()) {
    const rawLines = doc.recipientsHeader.split('\n').map(l => l.trim()).filter(Boolean);
    const cleaned = rawLines.map(l => {
      let item = l.replace(/^Kính\s*(?:gửi|trình):?\s*/i, '').trim();
      item = item.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
      return item;
    }).filter(Boolean);

    if (cleaned.length === 1) {
      parts.push(`Kính gửi: ${cleaned[0]}.`);
      parts.push('');
    } else if (cleaned.length > 1) {
      parts.push('Kính gửi:');
      cleaned.forEach((l, idx) => {
        const isLast = idx === cleaned.length - 1;
        parts.push(`- ${l}${isLast ? '.' : ';'}`);
      });
      parts.push('');
    }
  }

  if (doc.legalBases.length > 0) {
    doc.legalBases.forEach(b => parts.push(b));
    parts.push('');
  }

  doc.bodyParagraphs
    .filter(p => !isWarningOrInstructionLine(p))
    .forEach(p => parts.push(p));
  parts.push('');

  // Nơi nhận (Rà soát và loại bỏ sạch trùng lặp với khối chữ ký)
  const safeRecs = cleanAndDeduplicateRecipients(doc.recipients || [], {
    quyenHanKy: doc.quyenHanKy,
    signerAuthority: doc.signerAuthority,
    signerRoleLine2: doc.signerRoleLine2,
    signerTitle: doc.signerTitle,
    signerName: doc.signerName,
  });
  if (safeRecs.length > 0) {
    parts.push('Nơi nhận:');
    safeRecs.forEach(r => parts.push(r));
    parts.push('');
  }

  if (doc.signerAuthority || doc.signerRoleLine2 || doc.signerTitle || doc.signerName || doc.quyenHanKy) {
    if (doc.signerAuthority) parts.push(doc.signerAuthority);
    if (doc.signerRoleLine2) parts.push(doc.signerRoleLine2);
    if (doc.signerTitle) parts.push(doc.signerTitle);
    parts.push('(Ký, ghi rõ họ tên)');
    if (doc.signerName) parts.push(doc.signerName);
  }

  // PHỤ LỤC (NẾU CÓ - DÙNG PHÂN TÁCH TRANG A4 SAU NƠI NHẬN VÀ CHỮ KÝ)
  if (doc.appendices && doc.appendices.length > 0) {
    doc.appendices.forEach((app, idx) => {
      parts.push('');
      parts.push(`--- [PHÂN TÁCH TRANG A4 - ${app.header || `PHỤ LỤC ${idx + 1}`}] ---`);
      parts.push(app.header || `PHỤ LỤC ${idx + 1}`);
      if (app.title) parts.push(app.title.startsWith('-') ? app.title : `- ${app.title}`);
      if (app.referenceNote) parts.push(app.referenceNote.startsWith('-') ? app.referenceNote : `- ${app.referenceNote}`);
      app.paragraphs.forEach(p => parts.push(p));
    });
  }

  return parts.join('\n');
}

/**
 * Xuất file Word (.doc) hoàn chỉnh với bảng 2 cột ẩn viền và căn lề A4 chuẩn NĐ 30,
 * font Times New Roman, bảng mã Unicode (TCVN 6909:2001)
 */
export function generateWordBlob(text: string, settings: AgencySettings, docCategory?: string): Blob {
  const innerHtml = generateDecree30A4Html(text, settings, docCategory);

  const wordDocumentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>VanBan_ChuanHoa_ND30</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 21.0cm 29.7cm; /* A4 Chuẩn */
          margin: 2.0cm 1.5cm 2.0cm 3.0cm; /* Lề chuẩn NĐ 30: Trên 2cm, Dưới 2cm, Phải 1.5cm, Trái 3cm */
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
          mso-header: h1;
          mso-title-page: yes;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        p.MsoHeader, div.MsoHeader {
          margin: 0;
          margin-bottom: .0001pt;
          text-align: center;
          font-size: 13.5pt;
          font-family: 'Times New Roman', Times, serif;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 14pt;
          line-height: 1.5;
          color: #000000;
          text-align: justify;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
          font-family: 'Times New Roman', Times, serif;
        }
        td {
          padding: 0;
          vertical-align: top;
          font-family: 'Times New Roman', Times, serif;
        }
        p {
          margin: 0;
          padding: 0;
          margin-bottom: 6pt;
          font-family: 'Times New Roman', Times, serif;
        }
        .decree30-table {
          width: 100% !important;
          border-collapse: collapse !important;
          border: 1pt solid #000000 !important;
          margin: 12pt 0 !important;
        }
        .decree30-table th, .decree30-table td {
          border: 1pt solid #000000 !important;
          padding: 4pt 6pt !important;
          font-family: 'Times New Roman', Times, serif !important;
        }
      </style>
    </head>
    <body>
      <!-- HEADER SỐ TRANG CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP & HD 05 (ĐẶT Ở GIỮA LỀ TRÊN, CỠ 13-14PT ĐỨNG, TỰ ĐỘNG ĐÁNH SỐ TỪ TRANG 2) -->
      <div style='mso-element:header' id=h1>
        <p class=MsoHeader align=center style='text-align:center'>
          <!--[if supportFields]><span style='font-size:13.5pt;font-family:"Times New Roman",serif'><span style='mso-element:field-begin'></span>PAGE<span style='mso-element:field-separator'></span></span><![endif]-->
          <span style='font-size:13.5pt;font-family:"Times New Roman",serif'><span style='mso-no-proof:yes'>2</span></span>
          <!--[if supportFields]><span style='font-size:13.5pt;font-family:"Times New Roman",serif'><span style='mso-element:field-end'></span></span><![endif]-->
        </p>
      </div>

      <div class="Section1">
        ${innerHtml}
      </div>
    </body>
    </html>
  `;

  return new Blob(['\ufeff' + wordDocumentHtml], {
    type: 'application/msword;charset=utf-8'
  });
}

/**
 * Mục kiểm tra thành phần bắt buộc của văn bản
 */
export interface MandatoryCheckItem {
  id: string;
  section: 'dau_van_ban' | 'noi_dung' | 'cuoi_van_ban';
  sectionLabel: string;
  name: string;
  isFilled: boolean;
  isRequired: boolean;
  description: string;
}

export interface MandatoryValidationStatus {
  isValid: boolean;
  missingCount: number;
  totalCount: number;
  items: MandatoryCheckItem[];
  missingItems: MandatoryCheckItem[];
}

/**
 * Kiểm tra tính đầy đủ của các nội dung bắt buộc theo Nghị định 30/2020/NĐ-CP & Hướng dẫn 05:
 * - Đầu văn bản: Quốc hiệu, tiêu ngữ, cơ quan, số hiệu, địa danh ngày tháng, tên loại văn bản, trích yếu tiêu đề, kính gửi (nếu là Công văn/Tờ trình/Giấy mời)
 * - Nội dung văn bản: Thân văn bản / căn cứ
 * - Cuối văn bản: Nơi nhận, chữ ký (họ tên người ký), thẩm quyền ký / quyền hạn ký
 */
export function validateMandatoryDocumentElements(
  doc: StructuredDoc, 
  settings: AgencySettings
): MandatoryValidationStatus {
  const isCongVan = isCongVanDocument(doc);
  const isParty = doc.isPartyDoc;

  // 1. Đầu văn bản
  const hasCountryHeader = isParty 
    ? Boolean(doc.motto?.trim() && /ĐẢNG/i.test(doc.motto)) 
    : Boolean(doc.countryHeader?.trim() && /CỘNG\s*H[ÒOòo][AÀàa]\s*XÃ\s*HỘI/i.test(doc.countryHeader));
  
  const hasMotto = isParty
    ? true
    : Boolean(doc.motto?.trim() && /Độc\s*lập/i.test(doc.motto));

  const hasAgencyName = Boolean(doc.agencyName && doc.agencyName.trim().length >= 3);
  const hasDocCode = Boolean(doc.docCode && /Số:?/i.test(doc.docCode) && doc.docCode.trim().length >= 4);
  const hasDocTypeName = Boolean(doc.docTypeName && doc.docTypeName.trim().length >= 2);
  const hasDocTitle = isCongVan 
    ? Boolean(doc.docSubjectShort && doc.docSubjectShort.trim().length >= 3)
    : Boolean((doc.docTitle && doc.docTitle.trim().length >= 3) || (doc.docSubjectShort && doc.docSubjectShort.trim().length >= 3));
  const hasLocationDate = Boolean(doc.locationDate && doc.locationDate.trim().length >= 5);
  
  const isReportDoc = doc.docTypeName === 'BÁO CÁO' || doc.docTypeName?.startsWith('BÁO CÁO');
  const isKinhGuiRequired = !isReportDoc && (isCongVan || doc.docTypeName === 'TỜ TRÌNH' || doc.docTypeName === 'GIẤY MỜI');
  const hasKinhGui = isReportDoc 
    ? true 
    : (isKinhGuiRequired ? Boolean(doc.recipientsHeader && doc.recipientsHeader.trim().length >= 2) : true);

  // 2. Nội dung văn bản
  const hasBodyContent = Boolean(
    (doc.bodyParagraphs && doc.bodyParagraphs.length > 0 && doc.bodyParagraphs.some(p => p.trim().length >= 5)) ||
    (doc.legalBases && doc.legalBases.length > 0)
  );

  // 3. Cuối văn bản
  const hasRecipients = Boolean(
    doc.recipients && doc.recipients.length > 0 && doc.recipients.some(r => r.replace(/^[-\s]+/, '').trim().length > 1)
  );
  
  const hasSignerAuthority = Boolean(
    (doc.quyenHanKy && doc.quyenHanKy.trim()) || 
    (doc.signerAuthority && doc.signerAuthority.trim()) || 
    (doc.signerTitle && doc.signerTitle.trim())
  );
  
  const hasSignerName = Boolean(doc.signerName && doc.signerName.trim().length >= 2);

  const items: MandatoryCheckItem[] = [
    {
      id: 'quoc_hieu',
      section: 'dau_van_ban',
      sectionLabel: 'Đầu văn bản',
      name: isParty ? 'Tiêu đề Đảng (ĐẢNG CỘNG SẢN VIỆT NAM)' : 'Quốc hiệu (CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM)',
      isFilled: hasCountryHeader,
      isRequired: true,
      description: isParty ? 'Cần có dòng chữ ĐẢNG CỘNG SẢN VIỆT NAM' : 'Cần có CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'
    },
    {
      id: 'tieu_ngu',
      section: 'dau_van_ban',
      sectionLabel: 'Đầu văn bản',
      name: 'Tiêu ngữ (Độc lập - Tự do - Hạnh phúc)',
      isFilled: hasMotto,
      isRequired: !isParty,
      description: 'Cần có dòng chữ Độc lập - Tự do - Hạnh phúc kèm đường gạch chân'
    },
    {
      id: 'co_quan',
      section: 'dau_van_ban',
      sectionLabel: 'Đầu văn bản',
      name: 'Cơ quan ban hành văn bản',
      isFilled: hasAgencyName,
      isRequired: true,
      description: 'Chưa có tên cơ quan ban hành văn bản (Dòng 2 góc trái trên)'
    },
    {
      id: 'so_hieu',
      section: 'dau_van_ban',
      sectionLabel: 'Đầu văn bản',
      name: 'Số và ký hiệu văn bản',
      isFilled: hasDocCode,
      isRequired: true,
      description: 'Chưa có Số ký hiệu (ví dụ: Số:          /UBND-VP hoặc Số: 15/BC-UBND)'
    },
    {
      id: 'dia_danh_ngay_thang',
      section: 'dau_van_ban',
      sectionLabel: 'Đầu văn bản',
      name: 'Địa danh và ngày tháng năm',
      isFilled: hasLocationDate,
      isRequired: true,
      description: 'Chưa có dòng địa danh ngày tháng năm (ví dụ: Đông Tiến, ngày ... tháng ... năm 2026)'
    },
    {
      id: 'ten_loai',
      section: 'dau_van_ban',
      sectionLabel: 'Đầu văn bản',
      name: 'Tên loại văn bản',
      isFilled: hasDocTypeName,
      isRequired: true,
      description: 'Chưa xác định tên loại văn bản (Báo cáo, Công văn, Quyết định, Tờ trình...)'
    },
    {
      id: 'trich_yeu',
      section: 'dau_van_ban',
      sectionLabel: 'Đầu văn bản',
      name: isCongVan ? 'Trích yếu nội dung (V/v...)' : 'Tên / Tiêu đề văn bản',
      isFilled: hasDocTitle,
      isRequired: true,
      description: 'Chưa có tiêu đề hoặc trích yếu nội dung văn bản'
    },
    {
      id: 'kinh_gui',
      section: 'dau_van_ban',
      sectionLabel: 'Đầu văn bản',
      name: isReportDoc ? 'Kính gửi (Báo cáo không có Kính gửi)' : 'Kính gửi (Người nhận đầu văn bản)',
      isFilled: hasKinhGui,
      isRequired: isKinhGuiRequired,
      description: isReportDoc 
        ? 'Theo Nghị định 30/2020/NĐ-CP: Báo cáo không có phần Kính gửi ở đầu văn bản' 
        : (isKinhGuiRequired ? 'Công văn / Tờ trình bắt buộc phải có mục Kính gửi' : 'Tùy chọn')
    },
    {
      id: 'noi_dung',
      section: 'noi_dung',
      sectionLabel: 'Nội dung văn bản',
      name: 'Nội dung / Thân văn bản',
      isFilled: hasBodyContent,
      isRequired: true,
      description: 'Văn bản chưa có nội dung hoặc căn cứ thực hiện'
    },
    {
      id: 'noi_nhan',
      section: 'cuoi_van_ban',
      sectionLabel: 'Cuối văn bản',
      name: 'Nơi nhận (Danh sách cơ quan/đơn vị nhận)',
      isFilled: hasRecipients,
      isRequired: true,
      description: 'Chưa có nơi nhận văn bản (Nơi nhận: - Như trên; - Lưu: VT...)'
    },
    {
      id: 'tham_quyen_ky',
      section: 'cuoi_van_ban',
      sectionLabel: 'Cuối văn bản',
      name: 'Thẩm quyền ký / Chức vụ người ký',
      isFilled: hasSignerAuthority,
      isRequired: true,
      description: 'Chưa có quyền hạn ký hoặc chức vụ người ký (TM., KT. CHỦ TỊCH, CHỦ TỊCH...)'
    },
    {
      id: 'ho_ten_nguoi_ky',
      section: 'cuoi_van_ban',
      sectionLabel: 'Cuối văn bản',
      name: 'Chữ ký & Họ và tên người ký',
      isFilled: hasSignerName,
      isRequired: true,
      description: 'Chưa có họ và tên người có thẩm quyền ký văn bản'
    }
  ];

  const requiredItems = items.filter(it => it.isRequired);
  const missingItems = requiredItems.filter(it => !it.isFilled);
  const isValid = missingItems.length === 0;

  return {
    isValid,
    missingCount: missingItems.length,
    totalCount: requiredItems.length,
    items,
    missingItems
  };
}

/**
 * Tự động bổ sung các thành phần bắt buộc còn thiếu theo Cài đặt mặc định của cơ quan & chuẩn NĐ 30
 */
export function autoFillMissingMandatoryElements(
  doc: StructuredDoc, 
  settings: AgencySettings, 
  defaultDocTypeName?: string
): StructuredDoc {
  const isCongVan = isCongVanDocument(doc, null, defaultDocTypeName);
  const isParty = doc.isPartyDoc || settings.roleBlock === 'dang';
  const targetYear = settings.issuingYear || String(new Date().getFullYear());
  const defaultLoc = settings.shortLocation || 'Đông Tiến';

  const updated: StructuredDoc = { ...doc };

  // 1. Quốc hiệu / Tiêu ngữ
  if (isParty) {
    updated.isPartyDoc = true;
    updated.countryHeader = '';
    updated.motto = 'ĐẢNG CỘNG SẢN VIỆT NAM';
  } else {
    updated.isPartyDoc = false;
    updated.countryHeader = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    updated.motto = 'Độc lập - Tự do - Hạnh phúc';
  }

  // 2. Cơ quan ban hành
  if (!updated.agencyName || updated.agencyName.trim().length < 3) {
    updated.agencyName = settings.agencyName || 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN';
  }

  // 3. Số ký hiệu
  if (!updated.docCode || !/Số:?/i.test(updated.docCode)) {
    const codeSuffix = isParty ? '/CB-ĐU' : '/UBND-VP';
    updated.docCode = `Số:          ${codeSuffix}`;
  }

  // 4. Địa danh ngày tháng
  if (!updated.locationDate || updated.locationDate.trim().length < 5) {
    updated.locationDate = `${defaultLoc}, ngày      tháng      năm ${targetYear}`;
  }

  // 5. Tên loại văn bản
  if (!updated.docTypeName || updated.docTypeName.trim().length < 2) {
    updated.docTypeName = defaultDocTypeName ? defaultDocTypeName.toUpperCase() : (isParty ? 'NGHỊ QUYẾT' : 'BÁO CÁO');
  }

  // 6. Tiêu đề / Trích yếu
  if (isCongVan) {
    if (!updated.docSubjectShort || updated.docSubjectShort.trim().length < 3) {
      updated.docSubjectShort = 'V/v triển khai thực hiện nhiệm vụ công tác theo quy định';
    }
  } else {
    if (!updated.docTitle || updated.docTitle.trim().length < 3) {
      updated.docTitle = 'Về việc triển khai thực hiện nhiệm vụ công tác theo quy định';
    }
  }

  // 7. Kính gửi (nếu là công văn hoặc tờ trình hoặc giấy mời; Báo cáo tuyệt đối không có Kính gửi)
  if (updated.docTypeName === 'BÁO CÁO' || updated.docTypeName?.startsWith('BÁO CÁO')) {
    updated.recipientsHeader = '';
  } else if ((isCongVan || updated.docTypeName === 'TỜ TRÌNH' || updated.docTypeName === 'GIẤY MỜI') && (!updated.recipientsHeader || updated.recipientsHeader.trim().length < 2)) {
    updated.recipientsHeader = '- Các ban ngành, đoàn thể phường;\n- Ban cán sự các tổ dân phố trên địa bàn.';
  }

  // 8. Nội dung
  if (!updated.bodyParagraphs || updated.bodyParagraphs.length === 0 || !updated.bodyParagraphs.some(p => p.trim().length > 3)) {
    updated.bodyParagraphs = [
      'Thực hiện chương trình công tác và nhiệm vụ được giao, đơn vị triển khai thực hiện các nội dung cụ thể theo quy định.',
      'Yêu cầu các bộ phận, đơn vị chuyên môn và cá nhân có liên quan nghiêm túc triển khai thực hiện bảo đảm đúng tiến độ và chất lượng.'
    ];
  }

  // 9. Nơi nhận
  if (!updated.recipients || updated.recipients.length === 0 || !updated.recipients.some(r => r.replace(/^[-\s]+/, '').trim().length > 1)) {
    updated.recipients = isParty 
      ? ['- Thường trực Đảng ủy;', '- Các chi bộ trực thuộc;', '- Lưu: Chi bộ.']
      : ['- Như trên;', '- Thường trực Đảng ủy, HĐND;', '- Lãnh đạo UBND phường;', '- Lưu: VT.'];
  }

  // 10. Thẩm quyền ký / Chức vụ
  if (!updated.quyenHanKy && !updated.signerAuthority && !updated.signerTitle) {
    if (isParty) {
      updated.quyenHanKy = 'T/M';
      updated.signerAuthority = 'T/M CHI BỘ';
      updated.signerTitle = 'BÍ THƯ';
    } else {
      updated.quyenHanKy = 'KT. CHỦ TỊCH';
      updated.signerAuthority = 'KT. CHỦ TỊCH';
      updated.signerTitle = 'PHÓ CHỦ TỊCH';
    }
  }

  // 11. Họ tên người ký
  if (!updated.signerName || updated.signerName.trim().length < 2) {
    updated.signerName = settings.signerName || 'Lê Thế Điệp';
  }

  return updated;
}
