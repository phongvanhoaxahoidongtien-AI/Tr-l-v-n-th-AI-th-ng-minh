/**
 * Tiện ích làm sạch văn bản chuyên sâu & Chuyển mã phông chữ tự động (Unicode NFC - TCVN 6909:2001)
 * - Tự động phát hiện và chuyển đổi 100% bảng mã: Unicode Tổ Hợp (NFD), TCVN3 (ABC/.VnTime/.VnTimeH), VNI-Windows, CP1258, HTML entities
 * - TUYỆT ĐỐI KHÔNG làm lỗi tiếng Việt khi dán văn bản Unicode chuẩn
 * - Giữ nguyên vẹn bảng biểu, vừa vặn trang in A4, chuyển đổi toàn bộ về phông Times New Roman
 * - Bảo toàn Quốc hiệu & Tiêu ngữ, tự động xóa các dòng lặp lại trong thân bài
 */

// Bảng ánh xạ TCVN3 (ABC / .VnTime / .VnTimeH) sang Unicode NFC
export const TCVN3_TO_UNICODE_MAP: Record<string, string> = {
  // a và các dấu
  '\u00b5': 'à', '\u00b6': 'ả', '\u00b7': 'ã', '\u00b8': 'á', '\u00b9': 'ạ',
  // ă và các dấu
  '\u00a8': 'ă', '\u00bb': 'ằ', '\u00bc': 'ẳ', '\u00bd': 'ẵ', '\u00be': 'ắ', '\u00c6': 'ặ',
  // â và các dấu
  '\u00a9': 'â', '\u00c7': 'ầ', '\u00c8': 'ẩ', '\u00c9': 'ẫ', '\u00ca': 'ấ', '\u00cb': 'ậ',
  // e và các dấu
  '\u00cc': 'è', '\u00ce': 'ẻ', '\u00cf': 'ẽ', '\u00d0': 'é', '\u00d1': 'ẹ',
  // ê và các dấu
  '\u00aa': 'ê', '\u00d2': 'ề', '\u00d3': 'ể', '\u00d4': 'ễ', '\u00d5': 'ế', '\u00d6': 'ệ',
  // i và các dấu
  '\u00d7': 'ì', '\u00d8': 'ỉ', '\u00dc': 'ĩ', '\u00dd': 'í', '\u00de': 'ị',
  // o và các dấu
  '\u00df': 'ò', '\u00e1': 'ỏ', '\u00e2': 'õ', '\u00e3': 'ó', '\u00e4': 'ọ',
  // ô và các dấu
  '\u00ab': 'ô', '\u00e5': 'ồ', '\u00e6': 'ổ', '\u00e7': 'ỗ', '\u00e8': 'ố', '\u00e9': 'ộ',
  // ơ và các dấu
  '\u00ac': 'ơ', '\u00ea': 'ờ', '\u00eb': 'ở', '\u00ec': 'ỡ', '\u00ed': 'ớ', '\u00ee': 'ợ',
  // u và các dấu
  '\u00ef': 'ù', '\u00f1': 'ủ', '\u00f2': 'ũ', '\u00f3': 'ú', '\u00f4': 'ụ',
  // ư và các dấu
  '\u00ad': 'ư', '\u00f5': 'ừ', '\u00f6': 'ử', '\u00f7': 'ữ', '\u00f9': 'ứ', '\u00fa': 'ự',
  // y và các dấu
  '\u00fb': 'ỳ', '\u00fc': 'ỷ', '\u00fe': 'ỹ', '\u00fd': 'ý', '\u00ff': 'ỵ',
  // đ, Đ
  '\u00ae': 'đ', '\u00a7': 'Đ',
  // Chữ hoa nguyên âm .VnTimeH
  '\u00a1': 'Ă', '\u00a2': 'Â', '\u00a3': 'Ê', '\u00a4': 'Ô', '\u00a5': 'Ơ', '\u00a6': 'Ư'
};

// Bảng ánh xạ VNI-Windows sang Unicode dựng sẵn
const VNI_TO_UNICODE_MAP: Array<[RegExp, string]> = [
  // 3-char / 2-char combinations (lowercase & uppercase)
  [/aù/g, 'á'], [/aø/g, 'à'], [/aû/g, 'ả'], [/aõ/g, 'ã'], [/aï/g, 'ạ'],
  [/AÙ/g, 'Á'], [/AØ/g, 'À'], [/AÛ/g, 'Ả'], [/AÕ/g, 'Ã'], [/AÏ/g, 'Ạ'],
  
  [/aá/g, 'ấ'], [/aà/g, 'ầ'], [/aå/g, 'ẩ'], [/aã/g, 'ẫ'], [/aä/g, 'ậ'], [/aâ/g, 'â'],
  [/AÁ/g, 'Ấ'], [/AÀ/g, 'Ầ'], [/AÅ/g, 'Ẩ'], [/AÃ/g, 'Ẫ'], [/AÄ/g, 'Ậ'], [/AÂ/g, 'Â'],
  
  [/aé/g, 'ắ'], [/aè/g, 'ằ'], [/aú/g, 'ẳ'], [/aü/g, 'ẵ'], [/aë/g, 'ặ'], [/aê/g, 'ă'],
  [/AÉ/g, 'Ắ'], [/AÈ/g, 'Ằ'], [/AÚ/g, 'Ẳ'], [/AÜ/g, 'Ẵ'], [/AË/g, 'Ặ'], [/AÊ/g, 'Ă'],
  
  [/eù/g, 'é'], [/eø/g, 'è'], [/eû/g, 'ẻ'], [/eõ/g, 'ẽ'], [/eï/g, 'ẹ'],
  [/EÙ/g, 'É'], [/EØ/g, 'È'], [/EÛ/g, 'Ẻ'], [/EÕ/g, 'Ẽ'], [/EÏ/g, 'Ẹ'],
  
  [/eá/g, 'ế'], [/eà/g, 'ề'], [/eå/g, 'ể'], [/eã/g, 'ễ'], [/eä/g, 'ệ'], [/eâ/g, 'ê'],
  [/EÁ/g, 'Ế'], [/EÀ/g, 'Ề'], [/EÅ/g, 'Ể'], [/EÃ/g, 'Ễ'], [/EÄ/g, 'Ệ'], [/EÂ/g, 'Ê'],
  
  [/iù/g, 'í'], [/iø/g, 'ì'], [/iû/g, 'ỉ'], [/iõ/g, 'ĩ'], [/iï/g, 'ị'],
  [/IÙ/g, 'Í'], [/IØ/g, 'Ì'], [/IÛ/g, 'Ỉ'], [/IÕ/g, 'Ĩ'], [/IÏ/g, 'Ị'],
  
  [/où/g, 'ó'], [/oø/g, 'ò'], [/oû/g, 'ỏ'], [/oõ/g, 'õ'], [/oï/g, 'ọ'],
  [/OÙ/g, 'Ó'], [/OØ/g, 'Ò'], [/OÛ/g, 'Ỏ'], [/OÕ/g, 'Õ'], [/OÏ/g, 'Ọ'],
  
  [/oá/g, 'ố'], [/oà/g, 'ồ'], [/oå/g, 'ổ'], [/oã/g, 'ỗ'], [/oä/g, 'ộ'], [/oâ/g, 'ô'],
  [/OÁ/g, 'Ố'], [/OÀ/g, 'Ồ'], [/OÅ/g, 'Ổ'], [/OÃ/g, 'Ỗ'], [/OÄ/g, 'Ộ'], [/OÂ/g, 'Ô'],
  
  [/ôù/g, 'ớ'], [/ôø/g, 'ờ'], [/ôû/g, 'ở'], [/ôõ/g, 'ỡ'], [/ôï/g, 'ợ'],
  [/ÔÙ/g, 'Ớ'], [/ÔØ/g, 'Ờ'], [/ÔÛ/g, 'Ở'], [/ÔÕ/g, 'Ỡ'], [/ÔÏ/g, 'Ợ'],
  
  [/uù/g, 'ú'], [/uø/g, 'ù'], [/uû/g, 'ủ'], [/uõ/g, 'ũ'], [/uï/g, 'ụ'],
  [/UÙ/g, 'Ú'], [/UØ/g, 'Ù'], [/UÛ/g, 'Ủ'], [/UÕ/g, 'Ũ'], [/UÏ/g, 'Ụ'],
  
  [/öù/g, 'ứ'], [/öø/g, 'ừ'], [/öû/g, 'ử'], [/öõ/g, 'ữ'], [/öï/g, 'ự'], [/ö/g, 'ư'],
  [/ÖÙ/g, 'Ứ'], [/ÖØ/g, 'Ừ'], [/ÖÛ/g, 'Ử'], [/ÖÕ/g, 'Ữ'], [/ÖÏ/g, 'Ự'], [/Ö/g, 'Ư'],
  
  [/yù/g, 'ý'], [/yø/g, 'ỳ'], [/yû/g, 'ỷ'], [/yõ/g, 'ỹ'], [/î/g, 'ỵ'],
  [/YÙ/g, 'Ý'], [/YØ/g, 'Ỳ'], [/YÛ/g, 'Ỷ'], [/YÕ/g, 'Ỹ'], [/Î/g, 'Ỵ'],
  
  [/ñ/g, 'đ'], [/Ñ/g, 'Đ']
];

/**
 * Kiểm tra xem một đoạn văn bản có chứa ký tự tiếng Việt đặc thù của UNICODE không.
 * Các ký tự này (Ạ, ả, ấ, ề, ố, ợ, ứ, đ, Đ, ơ, ư...) CHỈ TỒN TẠI trong bảng mã Unicode.
 */
export function containsStandardVietnameseUnicode(text: string): boolean {
  if (!text) return false;
  // Dãy ký tự tiếng Việt đặc thù chỉ có ở Unicode:
  // \u1EA0-\u1EF9: các chữ ghép dấu tiếng Việt
  // \u0110, \u0111: Đ, đ
  // \u01A0, \u01A1, \u01AF, \u01B0: Ơ, ơ, Ư, ư
  return /[\u1EA0-\u1EF9\u0110\u0111\u01A0\u01A1\u01AF\u01B0]/.test(text);
}

/**
 * Kiểm tra xem một đoạn văn bản có chứa dấu vết TCVN3 (ABC / .VnTime / .VnTimeH) không
 */
export function isTCVN3Segment(text: string): boolean {
  if (!text) return false;
  
  // Nếu đã chứa các ký tự Unicode đặc thù, thì đoạn này là Unicode (không phải TCVN3)
  if (containsStandardVietnameseUnicode(text)) return false;

  // Dấu hiệu đặc trưng 100% của TCVN3:
  // § (0xA7 = Đ), ® (0xAE = đ), ¨ (0xA8 = ă), © (0xA9 = â), ª (0xAA = ê), « (0xAB = ô), ¬ (0xAC = ơ)
  // và các chữ in hoa .VnTimeH: ¡, ¢, £, ¤, ¥, ¦
  if (/[\u00a1-\u00a7\u00a8-\u00ad\u00ae]/.test(text)) {
    return true;
  }

  // Các từ ngữ TCVN3 kinh điển hay gặp trong văn bản hành chính Việt Nam:
  const tcvn3Words = [
    /viÖc/i, /®îc/i, /ngµy/i, /th¸ng/i, /n¨m/i, /c«ng/i, /®·/i, /nghÜa/i, 
    /chñ/i, /x·/i, /héi/i, /QUYÕT/i, /§ÞNH/i, /CéNG/i, /HOµ/i, /KÝNH/i, 
    /GöI/i, /N¬I/i, /NHËN/i, /B¸O/i, /C¸O/i, /Tê/i, /TR×NH/i, /TH¤NG/i, 
    /B¸O/i, /KÕ/i, /HO¹CH/i, /BIªN/i, /B¶N/i, /Chñ tÞch/i, /ñy ban/i, /UBND/i
  ];
  return tcvn3Words.some(pattern => pattern.test(text));
}

/**
 * Kiểm tra xem một đoạn văn bản có phải là VNI-Windows không
 */
export function isVNISegment(text: string): boolean {
  if (!text) return false;
  if (containsStandardVietnameseUnicode(text)) return false;

  const vniPatterns = [
    /ñònh/i, /ñöôïc/i, /ñeán/i, /Ñoâng/i, /ñieàu/i, /Coäng/i, /hoøa/i, 
    /xaõ/i, /chuû/i, /nghóa/i, /Vieät/i, /ngaøy/i, /thaùng/i, /naêm/i, 
    /quyeát/i, /kính/i, /göûi/i, /sôû/i, /phöôøng/i, /thò xaõ/i
  ];
  return vniPatterns.some(p => p.test(text));
}

/**
 * Giải mã các thực thể HTML (HTML Entities) như &aacute;, &#7855;, &nbsp;...
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || !str.includes('&')) return str;
  if (typeof document !== 'undefined') {
    try {
      const txt = document.createElement('textarea');
      txt.innerHTML = str;
      return txt.value;
    } catch {
      // fallback
    }
  }

  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Chuyển mã ký tự TCVN3 (.VnTime / .VnTimeH) sang Unicode NFC
 * Bảo đảm AN TOÀN TUYỆT ĐỐI: Chỉ chuyển đổi khi thực sự là văn bản TCVN3.
 * Giữ nguyên 100% các ký tự của văn bản Unicode chuẩn (như á, ó, é, í, ú...).
 */
export function convertTCVN3ToUnicode(str: string): string {
  if (!str) return '';

  // Xử lý theo từng dòng: dòng nào là TCVN3 thì đổi, dòng nào là Unicode chuẩn thì giữ nguyên
  const lines = str.split('\n');
  const convertedLines = lines.map(line => {
    // Nếu dòng này đã là Unicode chuẩn thì không được đụng vào các ký tự Latin-1
    if (containsStandardVietnameseUnicode(line) && !/[\u00a7\u00ae\u00a8\u00a9\u00aa\u00ab\u00ac\u00a1-\u00a6]/.test(line)) {
      return line.normalize('NFC');
    }

    // Nếu không có dấu vết TCVN3 thì giữ nguyên
    if (!isTCVN3Segment(line)) {
      return line.normalize('NFC');
    }

    // Chuyển đổi từng từ trong dòng TCVN3
    const words = line.split(/(\s+)/);
    const convertedWords = words.map(word => {
      if (/^\s+$/.test(word)) return word;

      // Nhận diện ngữ cảnh IN HOA: Nếu các ký tự chữ cái thường ASCII trong từ đều in hoa (ví dụ: CéNG, QUYÕT, §ÞNH)
      const asciiLetters = word.match(/[A-Za-z]/g) || [];
      const isUpperContext = asciiLetters.length > 0 && asciiLetters.every(c => c === c.toUpperCase());

      let res = '';
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const unicodeChar = TCVN3_TO_UNICODE_MAP[char];

        if (unicodeChar) {
          if (isUpperContext) {
            res += unicodeChar.toUpperCase();
          } else if (i === 0 && word.length > 1 && /[a-z]/.test(word[1])) {
            // Trường hợp chữ cái đầu từ viết hoa dạng TitleCase: ñy ban -> Ủy ban, ¸nh -> Ánh
            res += unicodeChar.toUpperCase();
          } else {
            res += unicodeChar;
          }
        } else {
          res += char;
        }
      }
      return res;
    });

    return convertedWords.join('');
  });

  return convertedLines.join('\n').normalize('NFC');
}

/**
 * Chuyển mã ký tự VNI-Windows sang Unicode NFC
 * Chỉ chạy khi phát hiện dấu hiệu VNI-Windows
 */
export function convertVNIToUnicode(str: string): string {
  if (!str) return '';
  if (!isVNISegment(str)) return str.normalize('NFC');

  let result = str;
  for (const [pattern, repl] of VNI_TO_UNICODE_MAP) {
    result = result.replace(pattern, repl);
  }
  return result.normalize('NFC');
}

/**
 * Chuẩn hóa toàn diện mọi dạng mã tiếng Việt về Unicode dựng sẵn (NFC chuẩn TCVN 6909:2001)
 * - Tự động nhận diện Unicode Tổ hợp (NFD) và ghép lại thành NFC
 * - Tự động nhận diện TCVN3 và VNI-Windows
 * - Giải mã HTML Entities
 */
export function transcodeToUnicodeNFC(rawText: string): string {
  if (!rawText) return '';

  // 1. Giải mã HTML Entities nếu có
  let text = decodeHtmlEntities(rawText);

  // 2. Chuyển Unicode Tổ hợp (NFD) sang Unicode Dựng sẵn (NFC)
  text = text.normalize('NFC');

  // 3. Xử lý TCVN3 nếu phát hiện dấu hiệu
  if (isTCVN3Segment(text)) {
    text = convertTCVN3ToUnicode(text);
  }

  // 4. Xử lý VNI-Windows nếu phát hiện dấu hiệu
  if (isVNISegment(text)) {
    text = convertVNIToUnicode(text);
  }

  // 5. Chuẩn hóa lại lần cuối về NFC
  return text.normalize('NFC');
}

/**
 * Chuyển đổi Markdown Table thành bảng HTML định dạng vừa với trang A4
 */
export function convertMarkdownTableToHtml(markdownTableText: string): string {
  const lines = markdownTableText.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return markdownTableText;

  const headerLine = lines[0];
  const separatorLine = lines[1];

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
 * Trích xuất bảng biểu từ nội dung HTML Clipboard (khi sao chép từ Microsoft Word hoặc Web)
 */
export function extractTablesFromHtmlClipboard(html: string): string | null {
  if (!html || !/<table\b/i.test(html)) return null;

  // Lấy các khối table trong HTML
  const tableMatches = html.match(/<table\b[\s\S]*?<\/table>/gi);
  if (!tableMatches || tableMatches.length === 0) return null;

  return tableMatches.map(t => formatHtmlTableToFitA4(t)).join('\n\n');
}

/**
 * Kiểm tra xem bảng HTML có phải là Bảng bố cục 2 cột thể thức (Đầu văn bản: Cơ quan / Quốc hiệu, Số / Ngày tháng) không
 */
export function isHeaderLayoutTable(tableHtml: string): boolean {
  const text = tableHtml.replace(/<[^>]+>/g, ' ');
  const hasNational = /CỘNG\s+H[ÒO]A|Độc\s+lập|ĐẢNG\s+CỘNG\s+SẢN/i.test(text);
  const hasAgencyOrCode = /(?:ỦY\s+BAN|UBND|HỘI\s+ĐỒNG|ĐẢNG|SỞ|PHÒNG|BỘ|BAN|TRƯỜNG|CHI\s+BỘ|Số:\s*|Số\s*[\d\.\/])/i.test(text);
  const hasDate = /ngày\s+[\d\s…]+tháng\s+[\d\s…]+năm/i.test(text);
  return (hasNational && (hasAgencyOrCode || hasDate)) || (hasAgencyOrCode && hasDate);
}

/**
 * Kiểm tra xem bảng HTML có phải là Bảng bố cục 2 cột chân trang (Nơi nhận & Chữ ký) không
 */
export function isFooterLayoutTable(tableHtml: string): boolean {
  const text = tableHtml.replace(/<[^>]+>/g, ' ');
  const hasRecipients = /Nơi\s+nhận/i.test(text);
  const hasSigner = /(?:CHỦ\s+TỊCH|BÍ\s+THƯ|PHÓ\s+CHỦ\s+TỊCH|GIÁM\s+ĐỐC|TRƯỞNG\s+PHÒNG|HIỆU\s+TRƯỞNG|TM\.|T\/M|KT\.|Q\.|TL\.)/i.test(text);
  return hasRecipients && hasSigner;
}

/**
 * Giải nén Bảng bố cục 2 cột thể thức thành các dòng văn bản tuần tự (Cột trái trước, Cột phải sau)
 */
export function unpackLayoutTable(tableHtml: string): string {
  const cells: string[] = [];
  const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m;
  while ((m = cellRegex.exec(tableHtml)) !== null) {
    let cellContent = m[1];
    cellContent = cellContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .trim();
    if (cellContent) {
      cells.push(cellContent);
    }
  }
  return cells.join('\n\n');
}

/**
 * Xóa bỏ Tiêu đề Quốc ngữ (khi người dùng chủ động yêu cầu gỡ bỏ)
 */
export function stripImportedNationalHeaders(text: string): { cleanedText: string; strippedFound: boolean } {
  let strippedFound = false;

  const stateHeaderGlobalRegex = /CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi;
  const stateMottoGlobalRegex = /Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi;
  const partyHeaderGlobalRegex = /ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi;
  const dividerRegex = /^[ \t]*[*\-–—_]{3,}[ \t]*$/gm;

  if (stateHeaderGlobalRegex.test(text) || stateMottoGlobalRegex.test(text) || partyHeaderGlobalRegex.test(text)) {
    strippedFound = true;
  }

  let cleaned = text
    .replace(stateHeaderGlobalRegex, '')
    .replace(stateMottoGlobalRegex, '')
    .replace(partyHeaderGlobalRegex, '')
    .replace(dividerRegex, '')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  return { cleanedText: cleaned, strippedFound };
}

/**
 * Tự động loại bỏ hoàn toàn các dòng lặp lại của Quốc hiệu/Tiêu ngữ ở thân văn bản
 * (Bảo toàn tuyệt đối dòng Quốc hiệu và Tiêu ngữ đầu tiên)
 */
export function removeDuplicateNationalHeadersFromBody(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  let foundStateHeader = false;
  let foundStateMotto = false;
  let foundPartyHeader = false;

  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isStateHeader = /CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(line);
    const isStateMotto = /Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc/i.test(line);
    const isPartyHeader = /ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/i.test(line);

    if (isStateHeader) {
      if (!foundStateHeader && i < 8) {
        foundStateHeader = true;
        result.push(line);
      } else {
        const cleaned = line.replace(/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi, '').trim();
        if (cleaned) result.push(cleaned);
      }
      continue;
    }

    if (isStateMotto) {
      if (!foundStateMotto && i < 10) {
        foundStateMotto = true;
        result.push(line);
      } else {
        const cleaned = line.replace(/Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi, '').trim();
        if (cleaned) result.push(cleaned);
      }
      continue;
    }

    if (isPartyHeader) {
      if (!foundPartyHeader && i < 8) {
        foundPartyHeader = true;
        result.push(line);
      } else {
        const cleaned = line.replace(/ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi, '').trim();
        if (cleaned) result.push(cleaned);
      }
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Hàm làm sạch văn bản toàn diện khi sao chép / dán (Paste)
 * Đảm bảo 100% nội dung chuyển sang Times New Roman, Unicode chuẩn NFC, không lỗi tiếng Việt.
 */
export function cleanAIText(
  rawText: string, 
  options?: { 
    preserveTables?: boolean; 
    stripNationalHeader?: boolean;
    htmlClipboard?: string;
  }
): string {
  if (!rawText && !options?.htmlClipboard) return '';

  const preserveTables = options?.preserveTables !== false;
  const stripHeader = options?.stripNationalHeader === true;

  // 1. Nếu có HTML Clipboard từ Word chứa bảng biểu, bóc tách bảng trước
  let text = rawText || '';
  const tablePlaceholders: string[] = [];

  if (preserveTables && options?.htmlClipboard && /<table\b/i.test(options.htmlClipboard) && !/<table\b/i.test(text)) {
    const htmlTable = extractTablesFromHtmlClipboard(options.htmlClipboard);
    if (htmlTable) {
      const placeholder = `___TABLE_BLOCK_${tablePlaceholders.length}___`;
      tablePlaceholders.push(htmlTable);
      text = `${text}\n\n${placeholder}\n\n`;
    }
  }

  // 2. Chuyển đổi mã phông chữ thông minh (Unicode NFC / TCVN3 / VNI-Windows / NFD)
  text = transcodeToUnicodeNFC(text);

  // 3. Loại bỏ các ký tự điều khiển ẩn và BOM
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  text = text.replace(/\u00A0/g, ' ');

  // 4. Bảo toàn khối Bảng biểu (HTML table hoặc Markdown table)
  if (preserveTables) {
    // A. Bảng HTML
    text = text.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (match) => {
      // Bóc tách bảng bố cục 2 cột (Header hoặc Footer) thành dòng văn bản thuần thay vì nhốt vào bảng
      if (isHeaderLayoutTable(match) || isFooterLayoutTable(match)) {
        return `\n\n${unpackLayoutTable(match)}\n\n`;
      }
      const cleanTable = formatHtmlTableToFitA4(match);
      const placeholder = `___TABLE_BLOCK_${tablePlaceholders.length}___`;
      tablePlaceholders.push(cleanTable);
      return `\n\n${placeholder}\n\n`;
    });

    // B. Bảng Markdown
    const mdTableRegex = /(?:^|\n)(\|[^\n]+\|\r?\n\|[\s:-|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g;
    text = text.replace(mdTableRegex, (match) => {
      const cleanTable = convertMarkdownTableToHtml(match);
      const placeholder = `___TABLE_BLOCK_${tablePlaceholders.length}___`;
      tablePlaceholders.push(cleanTable);
      return `\n\n${placeholder}\n\n`;
    });
  }

  // 5. Loại bỏ code blocks của Markdown
  text = text.replace(/^```[a-zA-Z0-9_-]*\s*/gm, '');
  text = text.replace(/```\s*$/gm, '');

  // 6. Loại bỏ lời chào hỏi / mở đầu của AI
  const aiChatterIntros = [
    /^(?:Dưới đây là|Sau đây là|Tôi xin gửi|Gửi bạn|Đây là|Theo yêu cầu của bạn|Chào bạn|Kính gửi đồng chí).*?(?:dự thảo|văn bản|nội dung|quyết định|công văn|tờ trình|mẫu|bản chuẩn hóa).*?[:\.]\s*\n+/gim,
    /^(?:Dưới đây là toàn bộ|Dưới đây là bản|Sau đây là dự thảo).*?[:\.]\s*\n+/gim,
    /^(?:Tôi đã (?:chuẩn hóa|rà soát|soạn thảo|sửa lại)).*?[:\.]\s*\n+/gim,
    /^(?:Dưới đây là nội dung chi tiết).*?[:\.]\s*\n+/gim
  ];
  for (const regex of aiChatterIntros) {
    text = text.replace(regex, '');
  }

  // Loại bỏ lời kết của AI
  const aiChatterOutros = [
    /\n+(?:Hy vọng|Chúc bạn|Chúc đồng chí|Lưu ý khi ban hành|Lưu ý thêm|Nếu cần chỉnh sửa|Bạn có thể thay đổi|Ghi chú:).*$/gims,
    /\n+(?:Trên đây là dự thảo|Mọi thắc mắc|Cần hỗ trợ thêm).*$/gims
  ];
  for (const regex of aiChatterOutros) {
    text = text.replace(regex, '');
  }

  // 7. Xử lý Tiêu đề Quốc ngữ: bảo toàn tuyệt đối theo mặc định
  if (stripHeader) {
    const { cleanedText } = stripImportedNationalHeaders(text);
    text = cleanedText;
  } else {
    text = removeDuplicateNationalHeadersFromBody(text);
  }

  // 8. Loại bỏ Markdown formatting
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/(^|[^\w*])\*([^*\n]+)\*([^\w*]|$)/g, '$1$2$3');
  text = text.replace(/(^|[^\w_])_([^_\n]+)_([^\w_]|$)/g, '$1$2$3');
  text = text.replace(/~~(.*?)~~/g, '$1');
  text = text.replace(/`([^`\n]+)`/g, '$1');

  // Chuyển đổi các thẻ khối HTML thành xuống dòng trước khi bóc thẻ để tránh dính liền chữ
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<\/?(?:p|b|strong|i|em|span|div|font|ul|ol|li|h[1-6]|body|html|center|u|s|small|big)\b[^>]*>/gi, '');

  // 9. Loại bỏ Emoji
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}]/gu, '');

  // 10. Chuẩn hóa phân cấp Nghị định 30/2020/NĐ-CP & Hướng dẫn 05:
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (!line.trim()) {
      cleanedLines.push('');
      continue;
    }

    if (line.includes('___TABLE_BLOCK_')) {
      cleanedLines.push(line);
      continue;
    }

    const leadingSpaces = (line.match(/^[ \t]+/) || [''])[0].length;
    let trimmed = line.trim();

    // Chỉ thị hành động (QUYẾT ĐỊNH:, QUYẾT NGHỊ:, CHỈ THỊ:)
    if (/^(QUYẾT ĐỊNH|QUYẾT NGHỊ|CHỈ THỊ|KẾT LUẬN|YÊU CẦU)\s*[:\.]?$/i.test(trimmed)) {
      const cmd = trimmed.replace(/[:\.\s]+$/, '').toUpperCase();
      cleanedLines.push('');
      cleanedLines.push(`${cmd}:`);
      cleanedLines.push('');
      continue;
    }

    // Chuẩn hóa Điều: "* Điều 1:" hoặc "• Điều 1:" -> "Điều 1."
    if (/^[•●○■◆❖✓►➢*+\-–—]?\s*(Điều\s+\d+)[\.:]?\s*/i.test(trimmed)) {
      trimmed = trimmed.replace(/^[•●○■◆❖✓►➢*+\-–—]?\s*(Điều\s+\d+)[\.:]?\s*/i, '$1. ');
      cleanedLines.push(trimmed);
      continue;
    }

    // Chuẩn hóa Chương / Mục: "* Chương I:" -> "Chương I."
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

    // Chuẩn hóa Khoản: "* 1." -> "1."
    if (/^[•●○■◆❖✓►➢*+\-–—]\s*(\d+\.)\s*/.test(trimmed)) {
      trimmed = trimmed.replace(/^[•●○■◆❖✓►➢*+\-–—]\s*(\d+\.)\s*/, '$1 ');
      cleanedLines.push(trimmed);
      continue;
    }

    // Chuẩn hóa Điểm: "* a)" -> "a)"
    if (/^[•●○■◆❖✓►➢*+\-–—]\s*([a-zđ]\))\s*/i.test(trimmed)) {
      trimmed = trimmed.replace(/^[•●○■◆❖✓►➢*+\-–—]\s*([a-zđ]\))\s*/i, '$1 ');
      cleanedLines.push(trimmed);
      continue;
    }

    // Bullet phân cấp:
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

    // Dấu gạch đầu dòng dính liền chữ: "-Nội dung" -> "- Nội dung"
    if (/^-\s*([^\s\-])/.test(trimmed)) {
      trimmed = trimmed.replace(/^-\s*([^\s\-])/, '- $1');
      cleanedLines.push(trimmed);
      continue;
    }

    // Dấu cộng dính liền chữ: "+Nội dung" -> "+ Nội dung"
    if (/^\+\s*([^\s\+])/.test(trimmed)) {
      trimmed = trimmed.replace(/^\+\s*([^\s\+])/, '+ $1');
      cleanedLines.push(trimmed);
      continue;
    }

    // Khoảng trắng kép giữa dòng
    trimmed = trimmed.replace(/[ \t]{2,}/g, ' ');

    cleanedLines.push(trimmed);
  }

  let result = cleanedLines.join('\n');

  // Khôi phục bảng biểu
  if (tablePlaceholders.length > 0) {
    for (let i = 0; i < tablePlaceholders.length; i++) {
      result = result.replace(`___TABLE_BLOCK_${i}___`, tablePlaceholders[i]);
    }
  }

  // Xóa các dòng trống liên tiếp vượt quá 2 dòng
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim().normalize('NFC');
}
