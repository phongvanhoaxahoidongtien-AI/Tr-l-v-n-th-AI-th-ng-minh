/**
 * Tiện ích làm sạch văn bản chuyên sâu khi sao chép từ AI (ChatGPT, DeepSeek, Claude, Gemini...)
 * và file văn bản Word, chuyển đổi tự động font chữ về Times New Roman, Bảng mã Unicode (NFC),
 * bảo toàn bảng biểu vừa vặn với trang A4, tự động gỡ bỏ tiêu đề quốc ngữ thừa đã được hệ thống tạo sẵn.
 */

// Bảng ánh xạ chuyển đổi font chữ TCVN3 (ABC / .VnTime / .VnTimeH) sang Unicode dựng sẵn (NFC)
const TCVN3_TO_UNICODE_MAP: Record<string, string> = {
  // Nguyên âm thường
  'µ': 'à', '¸': 'á', '¶': 'ả', '·': 'ã', '¹': 'ạ',
  '¨': 'ă', '»': 'ằ', '¾': 'ắ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
  '©': 'â', 'Ç': 'ầ', 'Ê': 'ấ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
  'ª': 'ê', 'Ì': 'ề', 'Í': 'ế', 'Î': 'ể', 'Ï': 'ễ', 'Ð': 'ệ',
  '«': 'ô', 'Ò': 'ồ', 'Ó': 'ố', 'Ô': 'ổ', 'Õ': 'ỗ', 'Ö': 'ộ',
  '¬': 'ơ', '×': 'ờ', 'Ø': 'ớ', 'Ù': 'ở', 'Ü': 'ỡ', 'Þ': 'ợ',
  '­': 'ư', 'ß': 'ừ', 'ä': 'ự',
  '®': 'đ',

  // Nguyên âm hoa trong bảng mã ABC / .VnTimeH
  '¡': 'Ă', '¢': 'Â', '§': 'Đ', '£': 'Ê', '¤': 'Ô', '¥': 'Ơ', '¦': 'Ư'
};

// Ánh xạ VNI-Windows sang Unicode dựng sẵn
const VNI_TO_UNICODE_MAP: Array<[RegExp, string]> = [
  [/a\u00f9/gi, 'à'], [/a\u00f8/gi, 'ả'], [/a\u00fa/gi, 'á'], [/a\u00f5/gi, 'ã'], [/a\u00ef/gi, 'ạ'],
  [/a\u00e2/gi, 'â'], [/a\u00ea/gi, 'ă'], [/e\u00f9/gi, 'è'], [/e\u00fa/gi, 'é'], [/e\u00f8/gi, 'ẻ'],
  [/e\u00ea/gi, 'ê'], [/o\u00f9/gi, 'ò'], [/o\u00fa/gi, 'ó'], [/o\u00f8/gi, 'ỏ'], [/o\u00f5/gi, 'õ'],
  [/o\u00f4/gi, 'ô'], [/o\u00a1/gi, 'ơ'], [/u\u00f9/gi, 'ù'], [/u\u00fa/gi, 'ú'], [/u\u00a1/gi, 'ư'],
  [/i\u00f9/gi, 'ì'], [/i\u00fa/gi, 'í'], [/i\u00f8/gi, 'ỉ'], [/i\u00ef/gi, 'ị'], [/y\u00fa/gi, 'ý'],
  [/y\u00f9/gi, 'ỳ'], [/y\u00f8/gi, 'ỷ'], [/y\u00f5/gi, 'ỹ'], [/y\u00ef/gi, 'ỵ'], [/d\u00f1/gi, 'đ']
];

/**
 * Chuyển mã ký tự TCVN3 (.VnTime) sang Unicode NFC
 */
export function convertTCVN3ToUnicode(str: string): string {
  if (!str) return '';
  if (!/[µ¸¶·¹¨»¾¼½Æ©ÇÊÈÉËªÌÍÎÏÐ«ÒÓÔÕÖ¬×ØÙÜÞ­ß®¡¢§£¤¥¦]/.test(str)) {
    return str;
  }
  return str.split('').map(char => TCVN3_TO_UNICODE_MAP[char] || char).join('');
}

/**
 * Chuyển mã ký tự VNI-Windows sang Unicode NFC
 */
export function convertVNIToUnicode(str: string): string {
  if (!str) return '';
  let result = str;
  for (const [pattern, repl] of VNI_TO_UNICODE_MAP) {
    result = result.replace(pattern, repl);
  }
  return result;
}

/**
 * Chuyển đổi Markdown Table thành bảng HTML định dạng vừa với trang A4
 */
export function convertMarkdownTableToHtml(markdownTableText: string): string {
  const lines = markdownTableText.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return markdownTableText;

  const headerLine = lines[0];
  const separatorLine = lines[1];

  // Kiểm tra xem dòng 2 có phải là divider |---|---| không
  if (!/^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/.test(separatorLine)) {
    return markdownTableText;
  }

  const parseCells = (row: string) => {
    return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  };

  const headers = parseCells(headerLine);
  const rows = lines.slice(2).map(parseCells);

  const html = `
<table class="decree30-table" style="width: 100% !important; max-width: 100%; border-collapse: collapse; margin: 12pt 0; table-layout: auto; word-break: break-word; font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.3;" border="1" cellpadding="5" cellspacing="0">
  <thead>
    <tr style="background-color: #f1f5f9;">
      ${headers.map(h => `<th style="border: 1px solid #000; padding: 5pt; font-weight: bold; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 11pt;">${h}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${rows.map(r => `
      <tr>
        ${r.map(cell => `<td style="border: 1px solid #000; padding: 4pt 6pt; font-family: 'Times New Roman', Times, serif; font-size: 11pt; vertical-align: top;">${cell}</td>`).join('')}
      </tr>
    `).join('')}
  </tbody>
</table>`.trim();

  return html;
}

/**
 * Chuẩn hóa bảng biểu HTML để luôn vừa khít trang A4
 */
export function formatHtmlTableToFitA4(tableHtml: string): string {
  return tableHtml
    .replace(/<table\b[^>]*>/gi, '<table class="decree30-table" style="width: 100% !important; max-width: 100%; border-collapse: collapse; margin: 12pt 0; table-layout: auto; word-break: break-word; font-family: \'Times New Roman\', Times, serif; font-size: 11pt; line-height: 1.3;" border="1" cellpadding="5" cellspacing="0">')
    .replace(/<th\b[^>]*>/gi, '<th style="border: 1px solid #000; padding: 5pt; font-weight: bold; text-align: center; background-color: #f1f5f9; font-family: \'Times New Roman\', Times, serif; font-size: 11pt;">')
    .replace(/<td\b[^>]*>/gi, '<td style="border: 1px solid #000; padding: 4pt 6pt; font-family: \'Times New Roman\', Times, serif; font-size: 11pt; vertical-align: top;">');
}

/**
 * Xóa bỏ toàn bộ Tiêu đề Quốc ngữ được nhập vào (Quốc hiệu & Tiêu ngữ Nhà nước NĐ 30 hoặc Đảng HD 05)
 * kèm các dòng gạch nối / hoa thị dưới tiêu đề để tránh bị lặp lại trong nội dung
 */
export function stripImportedNationalHeaders(text: string): { cleanedText: string; strippedFound: boolean } {
  let strippedFound = false;

  // Pattern Quốc hiệu & Tiêu ngữ Nhà nước (Cộng hòa / Cộng hoà xã hội chủ nghĩa Việt Nam)
  const stateHeaderRegex = /^[ \t]*(?:CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM|Cộng\s+h[òo]a\s+xã\s+hội\s+chủ\s+nghĩa\s+Việt\s+Nam)[ \t]*\r?\n?/gim;
  const stateMottoRegex = /^[ \t]*(?:Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc|ĐỘC\s+LẬP\s*[-–—]\s*TỰ\s+DO\s*[-–—]\s*HẠNH\s+PHÚC)[\.:]?[ \t]*\r?\n?/gim;
  
  // Pattern Tiêu đề Đảng (Đảng Cộng sản Việt Nam)
  const partyHeaderRegex = /^[ \t]*(?:ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM|Đảng\s+Cộng\s+sản\s+Việt\s+Nam)[ \t]*\r?\n?/gim;

  // Dòng kẻ gạch dưới tiêu đề nhập vào: ---, -------, *******, ______
  const dividerRegex = /^[ \t]*[*\-–—_]{3,}[ \t]*\r?\n?/gm;

  if (stateHeaderRegex.test(text) || stateMottoRegex.test(text) || partyHeaderRegex.test(text)) {
    strippedFound = true;
  }

  let cleaned = text
    .replace(stateHeaderRegex, '')
    .replace(stateMottoRegex, '')
    .replace(partyHeaderRegex, '')
    .replace(dividerRegex, '');

  return { cleanedText: cleaned, strippedFound };
}

/**
 * Hàm làm sạch văn bản toàn diện
 */
export function cleanAIText(rawText: string, options?: { preserveTables?: boolean; stripNationalHeader?: boolean }): string {
  if (!rawText) return '';

  const preserveTables = options?.preserveTables !== false; // mặc định giữ nguyên bảng biểu
  const stripHeader = options?.stripNationalHeader !== false; // mặc định tự động gỡ tiêu đề quốc ngữ thừa

  // 1. Chuyển đổi mã TCVN3 / VNI (nếu có) và chuẩn hóa toàn bộ về Unicode chuẩn NFC (TCVN 6909:2001)
  let text = convertTCVN3ToUnicode(rawText);
  text = convertVNIToUnicode(text);
  text = text.normalize('NFC');

  // 2. Loại bỏ các ký tự điều khiển ẩn và BOM lạ
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  text = text.replace(/\u00A0/g, ' '); // Non-breaking space thành space thường

  // 3. Tự động nhận diện và bảo toàn khối Bảng biểu (HTML table hoặc Markdown table)
  // Thay thế bảng biểu bằng placeholder tạm thời để không bị regex text làm hỏng
  const tablePlaceholders: string[] = [];

  if (preserveTables) {
    // A. Bảng HTML (<table>...</table>)
    text = text.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (match) => {
      const cleanTable = formatHtmlTableToFitA4(match);
      const placeholder = `___TABLE_BLOCK_${tablePlaceholders.length}___`;
      tablePlaceholders.push(cleanTable);
      return `\n\n${placeholder}\n\n`;
    });

    // B. Bảng Markdown (| ... | ... |)
    const mdTableRegex = /(?:^|\n)(\|[^\n]+\|\r?\n\|[\s:-|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g;
    text = text.replace(mdTableRegex, (match) => {
      const cleanTable = convertMarkdownTableToHtml(match);
      const placeholder = `___TABLE_BLOCK_${tablePlaceholders.length}___`;
      tablePlaceholders.push(cleanTable);
      return `\n\n${placeholder}\n\n`;
    });
  }

  // 4. Loại bỏ các khối code block của Markdown (```markdown ... ```)
  text = text.replace(/^```[a-zA-Z0-9_-]*\s*/gm, '');
  text = text.replace(/```\s*$/gm, '');

  // 5. Loại bỏ các lời mở đầu / chào hỏi hay gặp của chatbot AI (ChatGPT, DeepSeek, Claude...)
  const aiChatterIntros = [
    /^(?:Dưới đây là|Sau đây là|Tôi xin gửi|Gửi bạn|Đây là|Theo yêu cầu của bạn|Chào bạn|Kính gửi đồng chí).*?(?:dự thảo|văn bản|nội dung|quyết định|công văn|tờ trình|mẫu|bản chuẩn hóa).*?[:\.]\s*\n+/gim,
    /^(?:Dưới đây là toàn bộ|Dưới đây là bản|Sau đây là dự thảo).*?[:\.]\s*\n+/gim,
    /^(?:Tôi đã (?:chuẩn hóa|rà soát|soạn thảo|sửa lại)).*?[:\.]\s*\n+/gim,
    /^(?:Dưới đây là nội dung chi tiết).*?[:\.]\s*\n+/gim
  ];
  for (const regex of aiChatterIntros) {
    text = text.replace(regex, '');
  }

  // Loại bỏ lời kết luận / chúc mừng ở cuối của chatbot AI
  const aiChatterOutros = [
    /\n+(?:Hy vọng|Chúc bạn|Chúc đồng chí|Lưu ý khi ban hành|Lưu ý thêm|Nếu cần chỉnh sửa|Bạn có thể thay đổi|Ghi chú:).*$/gims,
    /\n+(?:Trên đây là dự thảo|Mọi thắc mắc|Cần hỗ trợ thêm).*$/gims
  ];
  for (const regex of aiChatterOutros) {
    text = text.replace(regex, '');
  }

  // 6. Tự động xóa bỏ đi Tiêu đề Quốc ngữ được nhập vào (vì hệ thống đã tạo tiêu đề quốc ngữ chuẩn ở 2 cột)
  if (stripHeader) {
    const { cleanedText } = stripImportedNationalHeaders(text);
    text = cleanedText;
  }

  // 7. Loại bỏ Markdown formatting
  text = text.replace(/^#{1,6}\s+/gm, ''); // Headers
  text = text.replace(/^>\s+/gm, ''); // Blockquotes
  text = text.replace(/\*\*(.*?)\*\*/g, '$1'); // In đậm
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/(^|[^\w*])\*([^*\n]+)\*([^\w*]|$)/g, '$1$2$3'); // In nghiêng
  text = text.replace(/(^|[^\w_])_([^_\n]+)_([^\w_]|$)/g, '$1$2$3');
  text = text.replace(/~~(.*?)~~/g, '$1'); // Gạch ngang
  text = text.replace(/`([^`\n]+)`/g, '$1'); // Inline code

  // Thẻ HTML thông dụng KHÔNG PHẢI BẢNG (<p>, <br>, <b>, <strong>, <i>, <span>, <div>, <font>...)
  text = text.replace(/<\/?(?:p|br|b|strong|i|em|span|div|font|ul|ol|li)\b[^>]*>/gi, '');

  // 8. Loại bỏ Emoji biểu tượng cảm xúc không phù hợp văn bản hành chính
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}]/gu, '');

  // 9. Xử lý từng dòng để chuẩn hóa phân cấp Nghị định 30/2020/NĐ-CP & Hướng dẫn 05:
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (!line.trim()) {
      cleanedLines.push('');
      continue;
    }

    // Nếu dòng này là placeholder của bảng biểu thì giữ nguyên
    if (line.includes('___TABLE_BLOCK_')) {
      cleanedLines.push(line);
      continue;
    }

    const leadingSpaces = (line.match(/^[ \t]+/) || [''])[0].length;
    let trimmed = line.trim();

    // A. Chỉ thị hành động (QUYẾT ĐỊNH:, QUYẾT NGHỊ:, CHỈ THỊ:)
    if (/^(QUYẾT ĐỊNH|QUYẾT NGHỊ|CHỈ THỊ|KẾT LUẬN|YÊU CẦU)\s*[:\.]?$/i.test(trimmed)) {
      const cmd = trimmed.replace(/[:\.\s]+$/, '').toUpperCase();
      cleanedLines.push('');
      cleanedLines.push(`${cmd}:`);
      cleanedLines.push('');
      continue;
    }

    // B. Chuẩn hóa Điều: "* Điều 1:" hoặc "• Điều 1:" hoặc "- Điều 1:" -> "Điều 1."
    if (/^[•●○■◆❖✓►➢*+\-–—]?\s*(Điều\s+\d+)[\.:]?\s*/i.test(trimmed)) {
      trimmed = trimmed.replace(/^[•●○■◆❖✓►➢*+\-–—]?\s*(Điều\s+\d+)[\.:]?\s*/i, '$1. ');
      cleanedLines.push(trimmed);
      continue;
    }

    // C. Chuẩn hóa Chương / Mục / Phần: "* Chương I:" -> "Chương I."
    if (/^[•●○■◆❖✓►➢*+\-–—]?\s*(Chương\s+[IVXLCDM\d]+)[\.:]?\s*/i.test(trimmed)) {
      trimmed = trimmed.replace(/^[•●○■◆❖✓►➢*+\-–—]?\s*(Chương\s+[IVXLCDM\d]+)[\.:]?\s*/i, '$1. ');
      cleanedLines.push(trimmed);
      continue;
    }
    if (/^[•●○■◆❖✓►➢*+\-–—]?\s*(Mục\s+\d+)[\.:]?\s*/i.test(trimmed)) {
      trimmed = trimmed.replace(/^[•●○■◆❖✓►➢*+\-–—]?\s*(Mục\s+\d+)[\.:]?\s*/i, '$1. ');
      cleanedLines.push(trimmed);
      continue;
    }

    // D. Chuẩn hóa Khoản: "* 1." hoặc "• 1." hoặc "- 1." -> "1."
    if (/^[•●○■◆❖✓►➢*+\-–—]\s*(\d+\.)\s*/.test(trimmed)) {
      trimmed = trimmed.replace(/^[•●○■◆❖✓►➢*+\-–—]\s*(\d+\.)\s*/, '$1 ');
      cleanedLines.push(trimmed);
      continue;
    }

    // E. Chuẩn hóa Điểm: "* a)" hoặc "• a)" hoặc "- a)" -> "a)"
    if (/^[•●○■◆❖✓►➢*+\-–—]\s*([a-zđ]\))\s*/i.test(trimmed)) {
      trimmed = trimmed.replace(/^[•●○■◆❖✓►➢*+\-–—]\s*([a-zđ]\))\s*/i, '$1 ');
      cleanedLines.push(trimmed);
      continue;
    }

    // F. Linh hoạt điều chỉnh bullet phân cấp:
    const bulletMatch = trimmed.match(/^[•●○■◆❖✓►➢*+\-–—]{1,2}\s+(.*)$/);
    if (bulletMatch) {
      const itemContent = bulletMatch[1].trim();
      if (leadingSpaces >= 2 || trimmed.startsWith('+')) {
        trimmed = `+ ${itemContent}`;
      } else {
        trimmed = `- ${itemContent}`;
      }
      cleanedLines.push(trimmed);
      continue;
    }

    // G. Gạch đầu dòng dính liền chữ: "-Nội dung" -> "- Nội dung"
    if (/^-\s*([^\s\-])/.test(trimmed)) {
      trimmed = trimmed.replace(/^-\s*([^\s\-])/, '- $1');
      cleanedLines.push(trimmed);
      continue;
    }

    // H. Dấu cộng dính liền chữ: "+Nội dung" -> "+ Nội dung"
    if (/^\+\s*([^\s\+])/.test(trimmed)) {
      trimmed = trimmed.replace(/^\+\s*([^\s\+])/, '+ $1');
      cleanedLines.push(trimmed);
      continue;
    }

    // I. Xóa khoảng trắng kép giữa dòng
    trimmed = trimmed.replace(/[ \t]{2,}/g, ' ');

    cleanedLines.push(trimmed);
  }

  let result = cleanedLines.join('\n');

  // Khôi phục lại các bảng biểu HTML đã bảo toàn
  if (tablePlaceholders.length > 0) {
    for (let i = 0; i < tablePlaceholders.length; i++) {
      result = result.replace(`___TABLE_BLOCK_${i}___`, tablePlaceholders[i]);
    }
  }

  // 10. Xóa các dòng trống liên tiếp vượt quá 2 dòng
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}
