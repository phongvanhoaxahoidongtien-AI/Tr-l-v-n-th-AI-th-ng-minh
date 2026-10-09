import { AgencySettings, IllogicalSegment, DocumentAppendix } from '../types';
import { convertMarkdownTableToHtml, formatHtmlTableToFitA4 } from '../utils/cleanAIText';
import { detectIllogicalAdministrativeText } from '../utils/illogicalTextDetector';

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
  recipientsHeader: string; // Kính gửi (hỗ trợ nhiều dòng với \n)
  legalBases: string[];
  bodyParagraphs: string[];
  appendices?: DocumentAppendix[]; // Phụ lục (ngắt sang trang riêng)
  recipients: string[]; // Nơi nhận (hỗ trợ nhiều dòng với \n)
  quyenHanKy: string; // TM. | T/M | KT. | Q. | KT. CHỦ TỊCH
  signerAuthority: string; // TM. ỦY BAN NHÂN DÂN / KT. CHỦ TỊCH / T/M CHI BỘ
  signerTitle: string; // CHỦ TỊCH / PHÓ CHỦ TỊCH / BÍ THƯ
  signerName: string;
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
export function renderAgencyHeaderHtml(parentAgency: string, agencyName: string): string {
  const cleanParent = parentAgency?.trim();
  const cleanAgency = agencyName?.trim();

  if (cleanParent) {
    return `
      <div style="font-size: 12pt; text-transform: uppercase; font-weight: normal; margin-bottom: 2pt; letter-spacing: -0.1px; font-family: 'Times New Roman', serif;">
        ${cleanParent}
      </div>
      <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif;">
        ${cleanAgency}
      </div>
    `;
  }

  if (cleanAgency) {
    if (cleanAgency.includes('\n')) {
      const parts = cleanAgency.split('\n').map(p => p.trim()).filter(Boolean);
      return `
        <div style="font-size: 12pt; text-transform: uppercase; font-weight: normal; margin-bottom: 2pt; letter-spacing: -0.1px; font-family: 'Times New Roman', serif;">
          ${parts[0]}
        </div>
        ${parts[1] ? `
          <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif;">
            ${parts[1]}
          </div>
        ` : ''}
      `;
    }

    const ubndMatch = cleanAgency.match(/^(?:ỦY\s+BAN\s+NHÂN\s+DÂN|UBND)\s+(.+)$/i);
    if (ubndMatch) {
      return `
        <div style="font-size: 12pt; text-transform: uppercase; font-weight: normal; margin-bottom: 2pt; letter-spacing: -0.1px; font-family: 'Times New Roman', serif;">
          ỦY BAN NHÂN DÂN
        </div>
        <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif;">
          ${ubndMatch[1].toUpperCase()}
        </div>
      `;
    }

    return `
      <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif;">
        ${cleanAgency}
      </div>
    `;
  }

  return `
    <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif;">
      ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN
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

  const agencyRegex = /^(?:ỦY BAN NHÂN DÂN|UBND|HỘI ĐỒNG NHÂN DÂN|HĐND|TỈNH ỦY|THÀNH ỦY|HUYỆN ỦY|QUẬN ỦY|THỊ ỦY|ĐẢNG BỘ|ĐẢNG ỦY|CHI BỘ|BAN CHẤP HÀNH|BAN THƯỜNG VỤ|ỦY BAN KIỂM TRA|ỦY BAN MTTQ|MẶT TRẬN TỔ QUỐC|CÔNG ĐOÀN|ĐOÀN TNCS|HỘI CỰU CHIẾN BINH|HỘI PHỤ NỮ|HỘI NÔNG DÂN|SỞ|PHÒNG|BỘ|BAN|TRƯỜNG|TRUNG TÂM|BỆNH VIỆN|CÔNG TY|TỔNG CÔNG TY|TẬP ĐOÀN|VIỆN|HỌC VIỆN|CỤC|CHI CỤC|TỔNG CỤC|VỤ|VĂN PHÒNG|BỘ PHẬN|TỔ CÔNG TÁC|ĐOÀN KIỂM TRA|ĐOÀN CÔNG TÁC|BAN CHỈ ĐẠO|TRẠM Y TẾ|TRẠM|CÔNG AN|BỘ CHỈ HUY|BAN CHỈ HUY|KHO BẠC|BẢO HIỂM|NGÂN HÀNG)\b(?:\s+[A-ZÀ-Ỹ0-9\s\.\-–]+)?/i;
  
  // Tách khi gặp ranh giới: 2 dấu cách trở lên, hoặc dấu chấm/hai chấm/chấm phẩy theo sau là chữ, hoặc từ khóa chuyển tiếp
  const splitBoundary = /^(.*?)(?:\s{2,}|[\.\:\;]\s+|\s+(?:Số:|Số\s+|Kính gửi|V\/v|Về việc|Căn cứ|Thực hiện|Báo cáo|Thông báo|Quyết định|Xét|Điều\s+\d+|Theo\s+đề\s+nghị))(.*)$/i;
  
  const splitMatch = line.match(splitBoundary);
  if (splitMatch) {
    const potentialAgency = splitMatch[1].trim();
    const potentialRest = line.substring(potentialAgency.length).trim();
    if (agencyRegex.test(potentialAgency) && potentialAgency.length <= 75) {
      return { cleanAgency: potentialAgency, leftoverText: potentialRest };
    }
  }

  // Nếu cả dòng khớp từ khóa cơ quan và độ dài hợp lý (<= 75 ký tự, không chứa từ chỉ nội dung câu)
  const isActionOrBodySentence = /báo cáo về|thông báo về|kính gửi|căn cứ vào|thực hiện kế hoạch|xét đề nghị|như sau|yêu cầu các/i.test(line);
  if (agencyRegex.test(line) && line.length <= 75 && !isActionOrBodySentence) {
    return { cleanAgency: line, leftoverText: '' };
  }

  // Nếu dòng quá dài (> 75 ký tự) nhưng bắt đầu bằng tên cơ quan
  const prefixMatch = line.match(/^(?:ỦY BAN NHÂN DÂN|UBND|HỘI ĐỒNG NHÂN DÂN|HĐND|ĐẢNG ỦY|CHI BỘ|BAN CHẤP HÀNH|BAN THƯỜNG VỤ|SỞ|PHÒNG|BỘ|BAN|TRƯỜNG|TRUNG TÂM|BỆNH VIỆN)\s+[A-ZÀ-Ỹa-zà-ỹ0-9\s\-–]+?(?=\s+(?:thông báo|báo cáo|kính gửi|căn cứ|về việc|thực hiện|xét|quyết định|yêu cầu|đề nghị|ban hành))/i);
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
  const appendixRegex = /^(?:PHỤ\s*LỤC|Phụ\s*lục)\s*(?:\d+|[0-9IVXLCDM]+)?(?:\s*[\:\-–—\.]\s*(.*))?$/i;
  const breakMarkerRegex = /^---\s*\[NGẮT\s+TRANG\s+A4\s*-\s*PHỤ\s+LỤC/i;

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

  for (let idx = 0; idx < appendixIndices.length; idx++) {
    const start = appendixIndices[idx];
    const end = idx + 1 < appendixIndices.length ? appendixIndices[idx + 1] : lines.length;
    const rawAppLines = lines.slice(start, end).map(l => l.trim()).filter(Boolean);

    if (rawAppLines.length === 0) continue;

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

    // Nhận diện Header phụ lục (e.g. PHỤ LỤC 1)
    const headerMatch = headerLine.match(/^(?:PHỤ\s*LỤC|Phụ\s*lục)\s*([0-9IVXLCDM]*)(?:\s*[\:\-–—\.]\s*(.*))?$/i);
    let appHeader = '';
    if (headerMatch) {
      const num = headerMatch[1]?.trim() || String(idx + 1);
      appHeader = `PHỤ LỤC ${num}`.toUpperCase().trim();
      if (headerMatch[2]?.trim()) {
        title = headerMatch[2].trim();
      }
    } else {
      appHeader = headerLine.toUpperCase();
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

  return { cleanLines, appendices };
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
  // Chuẩn hóa và làm sạch dòng thô
  const cleanInput = text.replace(/[\*_~`#]/g, '');
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
  const recipientsHeaderLines: string[] = [];
  const legalBases: string[] = [];
  const bodyParagraphs: string[] = [];
  const recipients: string[] = [];
  let quyenHanKy = '';
  let signerAuthority = '';
  let signerTitle = '';
  let signerName = '';
  const cacMucDaChinh: string[] = [];

  // BƯỚC 1: TÁCH VÀ XÓA TRIỆT ĐỂ QUỐC HIỆU / TIÊU NGỮ / TIÊU ĐỀ ĐẢNG KHỎI TOÀN BỘ CÁC DÒNG
  // (Đảm bảo không bị lọt vào Tên cơ quan hay Thân văn bản)
  let remainingLines: string[] = [];
  for (const line of originalLines) {
    const strippedLine = line
      .replace(/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi, '')
      .replace(/Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi, '')
      .replace(/ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi, '')
      .replace(/^[*\-–—_]{3,}$/, '')
      .trim();

    if (strippedLine) {
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

  // 3. Tìm Số và ký hiệu văn bản (Số: .../...)
  const docCodeRegex = /^Số:\s*([0-9A-Za-z\-\/\.…\s]+)/i;
  const codeIndex = remainingLines.findIndex((l, idx) => idx < 12 && docCodeRegex.test(l));
  if (codeIndex !== -1) {
    docCode = remainingLines[codeIndex];
    remainingLines.splice(codeIndex, 1);
  }

  // 4. Tìm Trích yếu nội dung của Công văn: V/v ... hoặc Về việc ...
  const subjectIndex = remainingLines.findIndex((l, idx) => idx < 12 && /^V\/v\s+/i.test(l));
  if (subjectIndex !== -1) {
    docSubjectShort = remainingLines[subjectIndex];
    remainingLines.splice(subjectIndex, 1);
    if (!docTypeName) {
      docTypeName = 'CÔNG VĂN';
    }
  }

  // 5. Tìm Tên loại văn bản (QUYẾT ĐỊNH, TỜ TRÌNH, NGHỊ QUYẾT, BÁO CÁO, KẾ HOẠCH...)
  const typeKeywords = /^(QUYẾT ĐỊNH|TỜ TRÌNH|NGHỊ QUYẾT|THÔNG BÁO|KẾ HOẠCH|BÁO CÁO|GIẤY MỜI|GIẤY GIỚI THIỆU|BIÊN BẢN|HỢP ĐỒNG|CHỈ THỊ|QUY CHẾ|QUY ĐỊNH|HƯỚNG DẪN|CHƯƠNG TRÌNH|PHƯƠNG ÁN|ĐỀ ÁN|DỰ ÁN|BẢN GHI NHỚ|GIẤY ỦY QUYỀN|PHIẾU CHUYỂN|PHIẾU BÁO|THƯ CÔNG)$/i;
  const typeIndex = remainingLines.findIndex((l, idx) => idx < 10 && typeKeywords.test(l));
  if (typeIndex !== -1) {
    docTypeName = remainingLines[typeIndex].toUpperCase();
    remainingLines.splice(typeIndex, 1);

    // Dòng tiếp theo ngay dưới Tên loại nếu có 'Về việc...' hoặc 'Ban hành...' là Trích yếu docTitle
    if (typeIndex < remainingLines.length && /^(Về việc|Ban hành|Phê duyệt|Quy định)/i.test(remainingLines[typeIndex])) {
      docTitle = remainingLines[typeIndex];
      remainingLines.splice(typeIndex, 1);
    }
  }

  // BƯỚC 2: TÁCH TÊN CƠ QUAN BAN HÀNH CỰC MẠNH (NGĂN NỘI DUNG BỊ ĐẨY VÀO Ô CƠ QUAN BAN HÀNH)
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
    parentAgency = foundAgencies[0].text.trim();
    agencyName = foundAgencies[1].text.trim();
    // Xóa các dòng cơ quan đã tìm thấy từ dưới lên trên (descending index) để không làm lệch chỉ số mảng
    const sortedFound = [...foundAgencies].sort((a, b) => b.index - a.index);
    for (const item of sortedFound) {
      if (item.leftover && item.leftover.trim()) {
        remainingLines[item.index] = item.leftover.trim();
      } else {
        remainingLines.splice(item.index, 1);
      }
    }
    cacMucDaChinh.push('Đã ngăn nội dung không bị đẩy vào ô Cơ quan ban hành');
  } else if (foundAgencies.length === 1) {
    agencyName = foundAgencies[0].text.trim();
    parentAgency = ''; // Tuyệt đối không tự ý thêm cơ quan cấp trên
    if (foundAgencies[0].leftover && foundAgencies[0].leftover.trim()) {
      remainingLines[foundAgencies[0].index] = foundAgencies[0].leftover.trim();
    } else {
      remainingLines.splice(foundAgencies[0].index, 1);
    }
    cacMucDaChinh.push('Đã ngăn nội dung không bị đẩy vào ô Cơ quan ban hành');
  }

  // Nếu chưa tìm thấy agencyName trong foundAgencies, quét lại các dòng đầu tiên trước Số: / Kính gửi:
  if (!agencyName && remainingLines.length > 0) {
    for (let i = 0; i < Math.min(4, remainingLines.length); i++) {
      const l = remainingLines[i].trim();
      if (/^Kính gửi:|^Số:|^Căn cứ|^V\/v|^Về việc/i.test(l)) break;
      if (/^(?:ỦY BAN|UBND|HỘI ĐỒNG|HĐND|ĐẢNG|CHI BỘ|BAN|SỞ|PHÒNG|BỘ|TRƯỜNG|TRUNG TÂM|BỆNH VIỆN|CÔNG TY|TỔNG CÔNG TY|TẬP ĐOÀN|VIỆN|CỤC|CHI CỤC|CÔNG AN|KHO BẠC|NGÂN HÀNG|BỘ PHẬN|TỔ|ĐOÀN)/i.test(l) && l.length <= 75) {
        agencyName = l.toUpperCase();
        remainingLines.splice(i, 1);
        break;
      }
    }
  }

  // Bảo vệ tuyệt đối: nếu agencyName vẫn dính câu văn hoặc dấu chấm, cắt gọt sạch
  if (agencyName && (agencyName.length > 75 || /báo cáo|thông báo|kính gửi/i.test(agencyName))) {
    const cleaned = agencyName.split(/[\.\;\:]/)[0].trim();
    if (cleaned.length <= 75) {
      agencyName = cleaned;
    } else {
      agencyName = '';
    }
  }

  // Nếu văn bản chưa có cơ quan ban hành, tự động điền từ Cài đặt người dùng
  if (!agencyName && settings.agencyName) {
    agencyName = settings.agencyName;
  }
  // Cơ quan cấp trên (parentAgency): Tuyệt đối không tự ý thêm cơ quan cấp trên!
  // Hệ thống không tự ý thêm cấp trên; chỉ hiển thị nếu người dùng nhập hoặc văn bản gốc có 2 dòng cơ quan
  if (!parentAgency) {
    parentAgency = '';
  }

  // Cảnh báo nếu cơ quan trong file khác với cài đặt mặc định
  if (agencyName && settings.agencyName && agencyName.toUpperCase() !== settings.agencyName.toUpperCase()) {
    cacMucDaChinh.push(`Cảnh báo: Cơ quan trong văn bản ("${agencyName}") khác với Cài đặt mặc định ("${settings.agencyName}"). Hệ thống giữ nguyên cơ quan gốc.`);
  }

  if (!docTypeName) {
    docTypeName = docSubjectShort ? 'CÔNG VĂN' : (docTypeNameHint ? docTypeNameHint.toUpperCase() : 'CÔNG VĂN');
  }

  // 7. Tìm và bóc tách Kính gửi (hỗ trợ nhiều dòng với \n)
  const kgIndex = remainingLines.findIndex(l => /^Kính gửi:?/i.test(l));
  if (kgIndex !== -1) {
    const firstKg = remainingLines[kgIndex];
    remainingLines.splice(kgIndex, 1);

    const strippedFirst = firstKg.replace(/^Kính gửi:?\s*/i, '').trim();
    if (strippedFirst) {
      const lineWithDash = strippedFirst.startsWith('-') ? strippedFirst : `- ${strippedFirst.replace(/^[-\u2013\u2014]\s*/, '')}`;
      recipientsHeaderLines.push(lineWithDash);
    }

    // Lấy tiếp các dòng người nhận bên dưới (mặc định định dạng có dấu - ở đầu)
    while (kgIndex < remainingLines.length) {
      const nextL = remainingLines[kgIndex];
      if (/^[-\u2013\u2014]\s+/.test(nextL) || (nextL.endsWith(';') && !nextL.startsWith('Căn cứ') && !nextL.startsWith('Điều'))) {
        const clean = nextL.trim();
        const lineWithDash = clean.startsWith('-') ? clean : `- ${clean.replace(/^[-\u2013\u2014]\s*/, '')}`;
        recipientsHeaderLines.push(lineWithDash);
        remainingLines.splice(kgIndex, 1);
      } else {
        break;
      }
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
  const noiNhanIndex = remainingLines.findIndex(l => /^Nơi nhận:?/i.test(l));
  if (noiNhanIndex !== -1) {
    const linesAfterNoiNhan = remainingLines.splice(noiNhanIndex);
    let inSigner = false;

    for (const l of linesAfterNoiNhan) {
      if (/^Nơi nhận:?/i.test(l)) {
        const stripped = l.replace(/^Nơi nhận:?\s*/i, '').trim();
        if (stripped) {
          const lineWithDash = stripped.startsWith('-') ? stripped : `- ${stripped.replace(/^[-\u2013\u2014]\s*/, '')}`;
          recipients.push(lineWithDash);
        }
        continue;
      }

      // Nhận diện phần ký (TM., T/M, KT., Q., KT. CHỦ TỊCH, CHỦ TỊCH, BÍ THƯ...)
      if (/^(KT\.\s*CHỦ\s*TỊCH|T\/M|TM\.|KT\.|Q\.|CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH|QUYỀN CHỦ TỊCH|GIÁM ĐỐC|TRƯỞNG PHÒNG|HIỆU TRƯỞNG)/i.test(l)) {
        inSigner = true;
      }

      if (!inSigner) {
        if (l.trim()) {
          const clean = l.trim();
          const lineWithDash = clean.startsWith('-') ? clean : `- ${clean.replace(/^[-\u2013\u2014]\s*/, '')}`;
          recipients.push(lineWithDash);
        }
      } else {
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
    const isNationalHeader = /CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM|Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc|ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/i.test(rawL);
    const isSeparator = /^[*\-–—_~=]{2,}$|^[-–—\s]{3,}$|^[–—\.\s]{4,}$/.test(rawL.trim());
    const isDateLine = /^[a-zA-ZÀ-ỹ\s]+,\s*ngày\s+/i.test(rawL.trim());
    const isDocCodeLine = /^Số:\s*/i.test(rawL.trim());
    const isTypeNameLine = /^(?:QUYẾT ĐỊNH|CÔNG VĂN|TỜ TRÌNH|BÁO CÁO|KẾ HOẠCH|THÔNG BÁO|NGHỊ QUYẾT|CHỈ THỊ|GIẤY MỜI)$/i.test(rawL.trim());
    const isSubjectLine = /^(?:V\/v|Về việc)\s+/i.test(rawL.trim());
    
    // Chỉ là dòng tên cơ quan header nếu không có động từ câu và không kết thúc bằng dấu chấm
    const isAgencyLine = !hasNarrativeVerbs && !rawL.trim().endsWith('.') && /^(?:ỦY BAN NHÂN DÂN|UBND|HỘI ĐỒNG NHÂN DÂN|HĐND|ĐẢNG BỘ|ĐẢNG ỦY|CHI BỘ|BAN CHẤP HÀNH|BAN THƯỜNG VỤ|BAN CHỈ HUY QUÂN SỰ|CÔNG AN PHƯỜNG|TRẠM Y TẾ|ỦY BAN MTTQ|ĐOÀN TNCS|HỘI PHỤ NỮ|HỘI CỰU CHIẾN BINH|HỘI NÔNG DÂN)\s+[A-ZÀ-Ỹ0-9\s\.\-–]+$/i.test(rawL.trim()) && rawL.trim().length <= 75;

    // Kiểm tra xem dòng có trùng chính xác với Tiêu đề cơ quan ban hành đứng riêng lẻ không
    const isMatchingAgencyName = !hasNarrativeVerbs && agencyName && rawL.trim().toUpperCase() === agencyName.toUpperCase();
    const isMatchingParentAgency = !hasNarrativeVerbs && parentAgency && rawL.trim().toUpperCase() === parentAgency.toUpperCase();
    const isMatchingSettingsAgency = !hasNarrativeVerbs && settings.agencyName && rawL.trim().toUpperCase() === settings.agencyName.toUpperCase();

    if (isBeforeBasis) {
      // Bất kỳ dòng nào trước phần căn cứ / nội dung mà là tiêu đề, ngày tháng, số hiệu, loại văn bản, trích yếu, tên cơ quan hoặc gạch ngang trang trí -> LOẠI BỎ HOÀN TOÀN
      if (!hasNarrativeVerbs && (isNationalHeader || isSeparator || isDateLine || isDocCodeLine || isTypeNameLine || isSubjectLine || isAgencyLine || isMatchingAgencyName || isMatchingParentAgency || isMatchingSettingsAgency)) {
        continue;
      }
    } else {
      // Sau bodyStartIdx, nếu dòng này là dòng tiêu đề cơ quan đứng riêng lẻ hoặc tiêu đề quốc ngữ lặp lại
      if (isMatchingAgencyName || isMatchingParentAgency || isMatchingSettingsAgency || isAgencyLine || isNationalHeader || isDateLine || isDocCodeLine) {
        continue;
      }
    }

    // Với dòng nói chung trong phần còn lại, lọc bỏ các chuỗi Quốc hiệu / Tiêu ngữ nếu bị dính trong dòng
    const cleanL = rawL
      .replace(/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi, '')
      .replace(/Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi, '')
      .replace(/ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi, '')
      .replace(/^[*\-–—_]{2,}$/, '')
      .trim();

    if (cleanL) {
      cleanRemainingLines.push(cleanL);
    }
  }

  // Phân loại thành Căn cứ pháp lý vs Thân văn bản (bodyParagraphs)
  for (const l of cleanRemainingLines) {
    if (/^Căn cứ\s+/i.test(l)) {
      legalBases.push(l);
    } else {
      bodyParagraphs.push(l);
    }
  }
  cacMucDaChinh.push('Đã loại bỏ triệt để tên cơ quan ban hành và tiêu đề quốc ngữ khỏi thân văn bản');

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

  const recipientsHeader = recipientsHeaderLines.join('\n');

  // Rà soát văn bản thiếu tính logic (Gợi ý bôi vàng)
  const illogicalFindings = detectIllogicalAdministrativeText(cleanInput, docTypeName, settings.roleBlock);
  if (illogicalFindings.length > 0) {
    cacMucDaChinh.push(`Đã phát hiện ${illogicalFindings.length} điểm thiếu tính logic để gợi ý bôi vàng`);
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
    recipientsHeader,
    legalBases,
    bodyParagraphs,
    appendices,
    recipients,
    quyenHanKy,
    signerAuthority,
    signerTitle,
    signerName,
    cacMucDaChinh,
    illogicalFindings
  };
}

/**
 * Tạo HTML chuẩn A4 mô phỏng văn bản hành chính theo Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW
 * Khớp 100% với file Word xuất ra:
 * - Font chữ duy nhất: Times New Roman, bộ mã Unicode
 * - Bảng biểu căn vừa khít trang A4, không vỡ layout
 * - Kính gửi & Nơi nhận mặc định có sẵn, các dòng tự động bắt đầu bằng dấu gạch ngang (-)
 */
export function generateDecree30A4Html(
  textOrDoc: string | StructuredDoc, 
  settings: AgencySettings, 
  docCategory?: string,
  docTypeNameHint?: string
): string {
  const doc = (typeof textOrDoc === 'object' && textOrDoc !== null)
    ? textOrDoc
    : parseDocumentStructure(textOrDoc, settings, docCategory, docTypeNameHint);
  const isCongVan = doc.docTypeName === 'CÔNG VĂN' || (!doc.docTypeName && Boolean(doc.docSubjectShort));

  // Chuẩn bị danh sách Kính gửi (nếu có)
  const recipientHeaderItems = doc.recipientsHeader
    ? doc.recipientsHeader.split('\n').map(l => l.trim()).filter(Boolean)
    : [];

  return `
    <div class="a4-document-page font-times text-slate-950 bg-white" style="font-family: 'Times New Roman', Times, 'Tinos', serif; font-size: 14pt; line-height: 1.5; color: #000; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.15); border: 1px solid #e2e8f0; border-radius: 4px; padding: 20mm 15mm 20mm 30mm; min-height: 297mm; box-sizing: border-box; background-color: #ffffff;">
      
      <!-- BẢNG BỐ CỤC ĐẦU VĂN BẢN (2 CỘT ẨN VIỀN CHUẨN NĐ 30 & HD 05) -->
      <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 14pt; font-family: 'Times New Roman', Times, serif;">
        <tr>
          <!-- Cột 1: Cơ quan ban hành & Số ký hiệu -->
          <td style="width: 45%; vertical-align: top; text-align: center; padding: 0 8pt 0 0; border: none;">
            ${renderAgencyHeaderHtml(doc.parentAgency, doc.agencyName)}
            
            <!-- Đường kẻ ngang dưới tên cơ quan (1/3 đến 1/2 độ dài) chuẩn NĐ 30 -->
            <div style="width: 40%; margin: 2.5pt auto 4pt auto; border-bottom: 1.2pt solid #000;"></div>
            
            <div style="font-size: 13pt; margin-top: 5pt; font-weight: normal; font-family: 'Times New Roman', serif;">
              ${formatDocCodeForDisplay(doc.docCode, true)}
            </div>

            ${doc.docSubjectShort ? `
              <div style="font-size: 12pt; font-style: italic; margin-top: 4pt; line-height: 1.3; font-family: 'Times New Roman', serif;">
                ${doc.docSubjectShort}
              </div>
            ` : ''}
          </td>

          <!-- Cột 2: Quốc hiệu & Tiêu ngữ HOẶC Tiêu đề Đảng -->
          <td style="width: 55%; vertical-align: top; text-align: center; padding: 0 0 0 8pt; border: none;">
            ${!doc.isPartyDoc ? `
              <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif;">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <!-- Tiêu ngữ: Gạch chân chuẩn NĐ 30 bằng đúng 100% độ dài của dòng chữ, khoảng cách khít thanh thoát -->
              <div style="font-size: 13pt; font-weight: bold; margin-top: 2pt; font-family: 'Times New Roman', serif; text-align: center;">
                <span style="display: inline-block; border-bottom: 1.2pt solid #000; padding-bottom: 2pt; line-height: 1.15;">
                  Độc lập - Tự do - Hạnh phúc
                </span>
              </div>
            ` : `
              <div style="font-size: 13pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; font-family: 'Times New Roman', serif;">
                ĐẢNG CỘNG SẢN VIỆT NAM
              </div>
              <!-- Nét gạch nhỏ dưới tiêu đề Đảng theo HD 05 (1/3 đến 1/2 độ dài dòng chữ) -->
              <div style="width: 38%; margin: 2.5pt auto 4pt auto; border-bottom: 1.2pt solid #000;"></div>
            `}

            <div style="font-size: 13pt; font-style: italic; margin-top: 5pt; font-family: 'Times New Roman', serif;">
              ${(doc.locationDate || `${settings.shortLocation || 'Đông Tiến'}, ngày      tháng      năm ${settings.issuingYear || new Date().getFullYear()}`)
                .replace(/ {2,}/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
                .replace(/[\.…]{2,}/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}
            </div>
          </td>
        </tr>
      </table>

      <!-- TÊN LOẠI VĂN BẢN VÀ TRÍCH YẾU (KHÔNG DÙNG CHO CÔNG VĂN THÔNG THƯỜNG) -->
      ${!isCongVan && doc.docTypeName ? `
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
      ` : ''}

      <!-- KÍNH GỬI (MẶC ĐỊNH CÁC DÒNG CÓ DẤU - Ở ĐẦU) -->
      ${recipientHeaderItems.length > 0 ? `
        <div style="margin: 12pt 0 10pt 0; font-family: 'Times New Roman', serif;">
          <div style="text-indent: 1cm; font-size: 14pt; text-align: left; font-weight: bold; margin-bottom: 3pt;">
            Kính gửi:
          </div>
          ${recipientHeaderItems.map(item => {
            const withDash = item.startsWith('-') ? item : `- ${item.replace(/^[-\u2013\u2014]\s*/, '')}`;
            return `
              <div style="text-indent: 1.5cm; font-size: 14pt; text-align: left; margin-bottom: 2pt;">
                ${withDash}
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

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

          // 3. Tiêu đề Mục (Mục 1, Mục 2...) -> Căn giữa in hoa đậm
          if (/^(Mục\s+\d+)[\.:]?\s*/i.test(cleanP)) {
            return `
              <p align="center" style="text-align: center; font-weight: bold; font-size: 13pt; margin: 10pt 0 4pt 0; text-indent: 0pt; text-transform: uppercase; font-family: 'Times New Roman', serif;">
                ${cleanP}
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

          // 5. Tiêu đề Điều khoản (Điều 1., Điều 2...) -> In đậm tên Điều, thụt đầu dòng 1cm
          const articleMatch = cleanP.match(/^(Điều\s+\d+)[\.:]?\s*(.*)$/i);
          if (articleMatch) {
            const articleLabel = articleMatch[1] + '.';
            const rest = articleMatch[2]?.trim();
            return `
              <p style="text-align: justify; margin-bottom: 6pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
                <strong>${articleLabel}</strong> ${rest}
              </p>
            `;
          }

          // 6. Khoản (1., 2., 3... hoặc 1.1., 1.2...) -> TỰ ĐỘNG TÔ ĐẬM ĐẦU DÒNG BULLET
          const numMatch = cleanP.match(/^(\d+(?:\.\d+)*\.)(?:\s+(.*))?$/);
          if (numMatch) {
            const numBullet = numMatch[1];
            const rest = numMatch[2] || '';
            const colonMatch = rest.match(/^([^:]{2,45}:)\s*(.*)$/);
            if (colonMatch) {
              return `
                <p style="text-align: justify; margin-bottom: 5pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
                  <strong>${numBullet} ${colonMatch[1]}</strong> ${colonMatch[2]}
                </p>
              `;
            }
            return `
              <p style="text-align: justify; margin-bottom: 5pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
                <strong>${numBullet}</strong> ${rest}
              </p>
            `;
          }

          // 6.1. Số La Mã (I., II., III...) -> TỰ ĐỘNG TÔ ĐẬM ĐẦU DÒNG BULLET
          const romanMatch = cleanP.match(/^([IVXLCDM]+\.)(?:\s+(.*))?$/);
          if (romanMatch) {
            const romanBullet = romanMatch[1];
            const rest = romanMatch[2] || '';
            const colonMatch = rest.match(/^([^:]{2,50}:)\s*(.*)$/);
            if (colonMatch) {
              return `
                <p style="text-align: justify; margin-bottom: 6pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
                  <strong>${romanBullet} ${colonMatch[1]}</strong> ${colonMatch[2]}
                </p>
              `;
            }
            return `
              <p style="text-align: justify; margin-bottom: 6pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
                <strong>${romanBullet}</strong> ${rest}
              </p>
            `;
          }

          // 7. Điểm (a), b), c)...) -> TỰ ĐỘNG TÔ ĐẬM ĐẦU DÒNG BULLET
          const letterMatch = cleanP.match(/^([a-zđ]\))(?:\s+(.*))?$/i);
          if (letterMatch) {
            const letterBullet = letterMatch[1];
            const rest = letterMatch[2] || '';
            const colonMatch = rest.match(/^([^:]{2,40}:)\s*(.*)$/);
            if (colonMatch) {
              return `
                <p style="text-align: justify; margin-bottom: 4pt; text-indent: 1.25cm; font-family: 'Times New Roman', serif;">
                  <strong>${letterBullet} ${colonMatch[1]}</strong> ${colonMatch[2]}
                </p>
              `;
            }
            return `
              <p style="text-align: justify; margin-bottom: 4pt; text-indent: 1.25cm; font-family: 'Times New Roman', serif;">
                <strong>${letterBullet}</strong> ${rest}
              </p>
            `;
          }

          // 8. Gạch đầu dòng (-)
          if (/^-\s+/.test(cleanP)) {
            return `
              <p style="text-align: justify; margin-bottom: 4pt; text-indent: 1.5cm; font-family: 'Times New Roman', serif;">
                ${cleanP}
              </p>
            `;
          }

          // 9. Dấu cộng (+)
          if (/^\+\s+/.test(cleanP)) {
            return `
              <p style="text-align: justify; margin-bottom: 4pt; text-indent: 1.75cm; font-family: 'Times New Roman', serif;">
                ${cleanP}
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
          <!-- Cột 1: Nơi nhận (MẶC ĐỊNH CÁC DÒNG CÓ DẤU - Ở ĐẦU) -->
          <td style="width: 48%; vertical-align: top; padding: 0 10pt 0 0; border: none;">
            ${(doc.recipients && doc.recipients.length > 0) ? `
              <div style="font-size: 12pt; font-weight: bold; font-style: italic; margin-bottom: 3pt; font-family: 'Times New Roman', serif;">
                Nơi nhận:
              </div>
              <div style="font-size: 11pt; line-height: 1.35; font-family: 'Times New Roman', serif;">
                ${doc.recipients.map(r => {
                  const withDash = r.startsWith('-') ? r : `- ${r.replace(/^[-\u2013\u2014]\s*/, '')}`;
                  return `<div style="margin-bottom: 1.5pt;">${withDash}</div>`;
                }).join('')}
              </div>
            ` : ''}
          </td>

          <!-- Cột 2: Quyền hạn, chức vụ & chữ ký -->
          <td style="width: 52%; vertical-align: top; text-align: center; padding: 0 0 0 10pt; border: none;">
            ${(doc.quyenHanKy === 'KT. CHỦ TỊCH' || doc.signerAuthority === 'KT. CHỦ TỊCH') ? `
              <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman', serif;">
                KT. CHỦ TỊCH
              </div>
              <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt; font-family: 'Times New Roman', serif;">
                ${doc.signerTitle || 'PHÓ CHỦ TỊCH'}
              </div>
            ` : (doc.quyenHanKy === 'Q.' || doc.signerAuthority.startsWith('Q.')) ? `
              <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman', serif;">
                ${doc.signerAuthority || 'Q. CHỦ TỊCH'}
              </div>
            ` : (doc.signerAuthority || doc.quyenHanKy || doc.signerTitle) ? `
              ${(doc.signerAuthority || doc.quyenHanKy) ? `
                <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman', serif;">
                  ${doc.signerAuthority || doc.quyenHanKy}
                </div>
              ` : ''}
              ${doc.signerTitle ? `
                <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt; font-family: 'Times New Roman', serif;">
                  ${doc.signerTitle}
                </div>
              ` : ''}
            ` : ''}
            
            ${(doc.signerName || doc.signerAuthority || doc.signerTitle || doc.quyenHanKy) ? `
              <!-- Khoảng trống ký tên & đóng dấu -->
              <div style="height: 50pt; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 10pt; color: #94a3b8; font-style: italic; font-family: 'Times New Roman', serif;">
                  (Ký, ghi rõ họ tên / Ký số)
                </span>
              </div>

              ${doc.signerName ? `
                <div style="font-size: 14pt; font-weight: bold; margin-top: 4pt; font-family: 'Times New Roman', serif;">
                  ${doc.signerName}
                </div>
              ` : ''}
            ` : ''}
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
      <div class="a4-document-page a4-appendix-page font-times text-slate-950 bg-white" style="page-break-before: always; break-before: page; font-family: 'Times New Roman', Times, 'Tinos', serif; font-size: 14pt; line-height: 1.5; color: #000; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.15); border: 1px solid #e2e8f0; border-radius: 4px; padding: 20mm 15mm 20mm 30mm; min-height: 297mm; box-sizing: border-box; background-color: #ffffff; margin-top: 24pt;">
        
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
}

/**
 * Chuyển đổi structured doc thành định dạng text chuẩn hóa
 */
export function reconstructNormalizedText(doc: StructuredDoc): string {
  const parts: string[] = [];

  if (doc.parentAgency) parts.push(doc.parentAgency);
  if (doc.agencyName) parts.push(doc.agencyName);
  if (doc.docCode) parts.push(doc.docCode);
  if (doc.docSubjectShort) parts.push(doc.docSubjectShort);
  if (doc.parentAgency || doc.agencyName || doc.docCode || doc.docSubjectShort) parts.push('');

  if (!doc.isPartyDoc) {
    if (doc.countryHeader) parts.push(doc.countryHeader);
    if (doc.motto) parts.push(doc.motto);
  } else {
    parts.push(doc.motto || 'ĐẢNG CỘNG SẢN VIỆT NAM');
  }
  if (doc.locationDate) parts.push(doc.locationDate);
  if (doc.countryHeader || doc.motto || doc.locationDate) parts.push('');

  const isCongVan = doc.docTypeName === 'CÔNG VĂN' || (!doc.docTypeName && Boolean(doc.docSubjectShort));

  if (!isCongVan && doc.docTypeName) {
    parts.push(doc.docTypeName);
    if (doc.docTitle) parts.push(doc.docTitle);
    parts.push('');
  }

  // Kính gửi (mặc định các dòng có dấu - ở đầu)
  if (doc.recipientsHeader && doc.recipientsHeader.trim()) {
    parts.push('Kính gửi:');
    const kLines = formatBulletLines(doc.recipientsHeader);
    kLines.forEach(l => parts.push(l));
    parts.push('');
  }

  if (doc.legalBases.length > 0) {
    doc.legalBases.forEach(b => parts.push(b));
    parts.push('');
  }

  doc.bodyParagraphs.forEach(p => parts.push(p));
  parts.push('');

  // Nơi nhận (mặc định các dòng có dấu - ở đầu)
  if (doc.recipients && doc.recipients.length > 0) {
    parts.push('Nơi nhận:');
    const rLines = formatBulletLines(doc.recipients);
    rLines.forEach(r => parts.push(r));
    parts.push('');
  }

  if (doc.signerAuthority || doc.signerTitle || doc.signerName || doc.quyenHanKy) {
    if (doc.quyenHanKy === 'KT. CHỦ TỊCH' || doc.signerAuthority === 'KT. CHỦ TỊCH') {
      parts.push('KT. CHỦ TỊCH');
      if (doc.signerTitle) parts.push(doc.signerTitle);
    } else if (doc.quyenHanKy === 'Q.' || doc.signerAuthority.startsWith('Q.')) {
      parts.push(doc.signerAuthority || 'Q. CHỦ TỊCH');
    } else {
      if (doc.signerAuthority) parts.push(doc.signerAuthority);
      if (doc.signerTitle) parts.push(doc.signerTitle);
    }
    parts.push('(Ký, ghi rõ họ tên)');
    if (doc.signerName) parts.push(doc.signerName);
  }

  // PHỤ LỤC (NẾU CÓ - DÙNG NGẮT TRANG SANG PHỤ LỤC)
  if (doc.appendices && doc.appendices.length > 0) {
    doc.appendices.forEach((app, idx) => {
      parts.push('');
      parts.push(`--- [NGẮT TRANG A4 - ${app.header || `PHỤ LỤC ${idx + 1}`}] ---`);
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
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
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
