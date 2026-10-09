import mammoth from 'mammoth';
import * as CFB from 'cfb';
import { cleanAIText, convertTCVN3ToUnicode, convertVNIToUnicode } from './cleanAIText';

/**
 * Bảng mã mở rộng chuyển đổi font TCVN3 (ABC / .VnTime / .VnTimeH) sang Unicode NFC chuẩn
 */
const TCVN3_CHARS: Record<number, string> = {
  // a và các dấu
  0xb5: 'à', 0xb8: 'á', 0xb6: 'ả', 0xb7: 'ã', 0xb9: 'ạ',
  // ă và các dấu
  0xa8: 'ă', 0xbb: 'ằ', 0xbe: 'ắ', 0xbc: 'ẳ', 0xbd: 'ẵ', 0xc6: 'ặ',
  // â và các dấu
  0xa9: 'â', 0xc7: 'ầ', 0xca: 'ấ', 0xc8: 'ẩ', 0xc9: 'ẫ', 0xcb: 'ậ',
  // e và các dấu
  0xcc: 'è', 0xd0: 'é', 0xce: 'ẻ', 0xcf: 'ẽ', 0xd1: 'ẹ',
  // ê và các dấu
  0xaa: 'ê', 0xd2: 'ề', 0xd5: 'ế', 0xd3: 'ể', 0xd4: 'ễ', 0xd6: 'ệ',
  // i và các dấu
  0xd7: 'ì', 0xdd: 'í', 0xd8: 'ỉ', 0xdc: 'ĩ', 0xde: 'ị',
  // o và các dấu
  0xdf: 'ò', 0xe3: 'ó', 0xe1: 'ỏ', 0xe2: 'õ', 0xe4: 'ọ',
  // ô và các dấu
  0xab: 'ô', 0xe5: 'ồ', 0xe8: 'ố', 0xe6: 'ổ', 0xe7: 'ỗ', 0xe9: 'ộ',
  // ơ và các dấu
  0xac: 'ơ', 0xea: 'ờ', 0xed: 'ớ', 0xeb: 'ở', 0xec: 'ỡ', 0xee: 'ợ',
  // u và các dấu
  0xef: 'ù', 0xf3: 'ú', 0xf1: 'ủ', 0xf2: 'ũ', 0xf4: 'ụ',
  // ư và các dấu
  0xad: 'ư', 0xf5: 'ừ', 0xf9: 'ứ', 0xf6: 'ử', 0xf7: 'ữ', 0xfa: 'ự',
  // y và các dấu
  0xfb: 'ỳ', 0xfd: 'ý', 0xfc: 'ỷ', 0xfe: 'ỹ', 0xff: 'ỵ',
  // đ, Đ
  0xae: 'đ', 0xa7: 'Đ',
  // Chữ hoa nguyên âm .VnTimeH
  0xa1: 'Ă', 0xa2: 'Â', 0xa3: 'Ê', 0xa4: 'Ô', 0xa5: 'Ơ', 0xa6: 'Ư'
};

/**
 * Kiểm tra và chuyển đổi chuỗi nếu chứa font chữ TCVN3 / VNI / Windows-1258
 */
export function autoDecodeVietnameseFonts(text: string): string {
  if (!text) return '';

  let result = text;

  // 1. Kiểm tra xem có dấu hiệu TCVN3 không (có các ký tự đặc trưng như .VnTime / .VnTimeH)
  const tcvn3Pattern = /[µ¸¶·¹¨»¾¼½Æ©ÇÊÈÉËªÌÍÎÏÐ«ÒÓÔÕÖ¬×ØÙÜÞ­ß®¡¢§£¤¥¦\u00f9\u00f5\u00f6\u00f7\u00fa\u00fb\u00fd\u00fc\u00fe\u00ff]/;
  if (tcvn3Pattern.test(result)) {
    result = convertTCVN3ToUnicode(result);
  }

  // 2. Kiểm tra xem có dấu hiệu VNI không (như aù, oø, eù, uû, dñ...)
  const vniPattern = /[aeoouiyd][\u00f9\u00fa\u00f8\u00f5\u00ef\u00e2\u00ea\u00f4\u00a1\u00f1]/i;
  if (vniPattern.test(result)) {
    result = convertVNIToUnicode(result);
  }

  // 3. Chuẩn hóa dạng Unicode dựng sẵn NFC (TCVN 6909:2001)
  result = result.normalize('NFC');

  return result;
}

/**
 * Giải mã chuỗi RTF (Rich Text Format) thường gặp khi file .doc thực chất là RTF
 */
export function extractTextFromRtf(rtfStr: string): string {
  let text = rtfStr;

  // Xử lý mã hóa Unicode \uN? trong RTF
  text = text.replace(/\\u(-?\d+)\??/g, (_, codeStr) => {
    let code = parseInt(codeStr, 10);
    if (code < 0) code += 65536;
    return String.fromCharCode(code);
  });

  // Xử lý hex bytes \'xx (như \'e0, \'e1...)
  text = text.replace(/\\'[0-9a-fA-F]{2}/g, (match) => {
    const hex = parseInt(match.substring(2), 16);
    if (TCVN3_CHARS[hex]) {
      return TCVN3_CHARS[hex];
    }
    // Nếu là Windows-1258 hoặc ASCII
    return String.fromCharCode(hex);
  });

  // Chuyển \par thành xuống dòng
  text = text.replace(/\\par\b/g, '\n');
  text = text.replace(/\\line\b/g, '\n');
  text = text.replace(/\\tab\b/g, '\t');

  // Xóa các thẻ điều khiển RTF khác
  text = text.replace(/\\[a-zA-Z]+(-?\d+)?\s?/g, '');
  text = text.replace(/[{}]/g, '');

  return autoDecodeVietnameseFonts(text).trim();
}

/**
 * Giải mã HTML từ các file Word HTML / MHTML
 */
export function extractTextFromHtmlDoc(htmlStr: string): string {
  // Thay thế thẻ <br>, <p>, <tr> thành xuống dòng
  let clean = htmlStr
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
    .replace(/<[^>]+>/g, ' ');

  // Giải mã các thực thể HTML phổ biến
  clean = clean
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return autoDecodeVietnameseFonts(clean).trim();
}

/**
 * Trình bóc tách nội dung Word 97-2003 (.doc) chuẩn nhị phân (Compound File Binary Format - CFBF / OLE2)
 */
export function extractTextFromBinaryDoc(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  try {
    const cfb = CFB.read(bytes, { type: 'array' });
    if (cfb && cfb.FileIndex && cfb.FileIndex.length > 0) {
      // Tìm WordDocument entry
      const wordDocEntry = cfb.FileIndex.find(e => e.name && e.name.toLowerCase() === 'worddocument') 
        || CFB.find(cfb, '/WordDocument');

      if (wordDocEntry && wordDocEntry.content) {
        const wordDocStream = new Uint8Array(wordDocEntry.content as ArrayBuffer | Uint8Array);
        const fibView = new DataView(wordDocStream.buffer, wordDocStream.byteOffset, wordDocStream.byteLength);

        if (wordDocStream.length >= 0x01A6) {
          const flags = fibView.getUint16(0x000A, true);
          const isTable1 = (flags & 0x0200) !== 0; // bit 9: fWhichTblStm
          const tableName = isTable1 ? '1table' : '0table';
          const tablePath = isTable1 ? '/1Table' : '/0Table';

          const tableEntry = cfb.FileIndex.find(e => e.name && e.name.toLowerCase() === tableName)
            || CFB.find(cfb, tablePath);

          if (tableEntry && tableEntry.content) {
            const tableStream = new Uint8Array(tableEntry.content as ArrayBuffer | Uint8Array);
            const tableView = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);

            const fcClx = fibView.getInt32(0x01A2, true);
            const lcbClx = fibView.getInt32(0x01A6, true);

            if (fcClx >= 0 && fcClx + lcbClx <= tableStream.length && lcbClx > 0) {
              const pieceTableText = parsePieceTable(tableView, fcClx, lcbClx, wordDocStream);
              if (pieceTableText && pieceTableText.trim().length > 15) {
                return autoDecodeVietnameseFonts(pieceTableText);
              }
            }
          }
        }

        // Quét trực tiếp từ WordDocument stream
        const extractedStreamText = scanPrintableTextFromBuffer(wordDocStream);
        if (extractedStreamText && extractedStreamText.trim().length > 15) {
          return autoDecodeVietnameseFonts(extractedStreamText);
        }
      }
    }
  } catch (cfbErr) {
    console.warn('Lỗi phân tích OLE2 CFB, chuyển sang quét trực tiếp chuỗi:', cfbErr);
  }

  // Fallback: quét văn bản từ toàn bộ file nhị phân
  return scanPrintableTextFromBuffer(bytes);
}

/**
 * Phân tích Piece Table (CLX) chuẩn của Word 97-2003 để bóc tách chính xác chuỗi ký tự theo đúng thứ tự
 */
function parsePieceTable(
  tableView: DataView, 
  fcClx: number, 
  lcbClx: number, 
  wordDocStream: Uint8Array
): string {
  let pos = fcClx;
  const end = fcClx + lcbClx;

  // Duyệt qua các record trong CLX cho đến khi gặp Pcdt (type = 0x02)
  while (pos < end) {
    const clxt = tableView.getUint8(pos);
    pos += 1;

    if (clxt === 0x01) {
      // Grpprl
      const cb = tableView.getUint16(pos, true);
      pos += 2 + cb;
    } else if (clxt === 0x02) {
      // Pcdt (Piece Table)
      const lcb = tableView.getInt32(pos, true);
      pos += 4;
      const pcdtEnd = pos + lcb;

      // Cấu trúc Plcfpcd: gồm (n + 1) CP (mỗi CP 4 byte) sau đó là n PCD (mỗi PCD 8 byte)
      // Tổng số byte = (n + 1)*4 + n*8 = 4 + 12*n
      if (lcb < 4) break;
      const n = Math.floor((lcb - 4) / 12);
      if (n <= 0) break;

      const pcdStart = pos + (n + 1) * 4;
      const resultParts: string[] = [];

      for (let i = 0; i < n; i++) {
        const cpStart = tableView.getInt32(pos + i * 4, true);
        const cpEnd = tableView.getInt32(pos + (i + 1) * 4, true);
        const charCount = cpEnd - cpStart;
        if (charCount <= 0) continue;

        const pcdOffset = pcdStart + i * 8;
        if (pcdOffset + 6 > pcdtEnd) break;

        // fc nằm ở offset 2 của PCD (4 byte)
        const fc = tableView.getInt32(pcdOffset + 2, true);
        const is8Bit = (fc & 0x40000000) !== 0; // bit 30 = 1 nếu là 8-bit ANSI
        const actualFc = is8Bit ? (fc & ~0x40000000) >> 1 : fc;

        if (is8Bit) {
          // Ký tự 8-bit ANSI / TCVN3 / Windows-1258
          if (actualFc + charCount <= wordDocStream.length) {
            let part = '';
            for (let c = 0; c < charCount; c++) {
              const b = wordDocStream[actualFc + c];
              if (b === 0x0d || b === 0x0b) {
                part += '\n';
              } else if (b === 0x07) {
                part += '\t'; // Cell separator trong table Word
              } else if (b === 0x09) {
                part += '\t';
              } else if (TCVN3_CHARS[b]) {
                part += TCVN3_CHARS[b];
              } else if (b >= 32) {
                part += String.fromCharCode(b);
              }
            }
            resultParts.push(part);
          }
        } else {
          // Ký tự 16-bit Unicode (UTF-16LE)
          const byteLen = charCount * 2;
          if (actualFc + byteLen <= wordDocStream.length) {
            let part = '';
            const u16View = new DataView(wordDocStream.buffer, wordDocStream.byteOffset + actualFc, byteLen);
            for (let c = 0; c < charCount; c++) {
              const code = u16View.getUint16(c * 2, true);
              if (code === 0x000d || code === 0x000b) {
                part += '\n';
              } else if (code === 0x0007) {
                part += '\t';
              } else if (code === 0x0009) {
                part += '\t';
              } else if (code >= 32 && code < 0xfff0) {
                part += String.fromCharCode(code);
              }
            }
            resultParts.push(part);
          }
        }
      }

      return resultParts.join('');
    } else {
      break;
    }
  }

  return '';
}

/**
 * Quét chuỗi ký tự in được (UTF-16LE và 8-bit) từ vùng nhớ nhị phân
 */
function scanPrintableTextFromBuffer(bytes: Uint8Array): string {
  // 1. Quét UTF-16LE ở cả 2 pha offset: chẵn (offset=0, 2, 4...) và lẻ (offset=1, 3, 5...)
  const scanU16 = (startOffset: number): string => {
    const textRuns: string[] = [];
    let currentU16 = '';
    for (let i = startOffset; i < bytes.length - 1; i += 2) {
      const code = bytes[i] | (bytes[i + 1] << 8);

      const isPrintable = 
        (code >= 32 && code <= 126) ||
        (code >= 0x00a0 && code <= 0x024f) ||
        (code >= 0x1ea0 && code <= 0x1ef9) || // Dãy Unicode tiếng Việt đầy đủ
        code === 0x0d || code === 0x0a || code === 0x09;

      if (isPrintable) {
        if (code === 0x0d || code === 0x0a) {
          if (currentU16.length > 0 && !currentU16.endsWith('\n')) {
            currentU16 += '\n';
          }
        } else {
          currentU16 += String.fromCharCode(code);
        }
      } else {
        if (currentU16.trim().length >= 10) {
          textRuns.push(currentU16.trim());
        }
        currentU16 = '';
      }
    }
    if (currentU16.trim().length >= 10) {
      textRuns.push(currentU16.trim());
    }
    return textRuns.join('\n\n');
  };

  const textEven = scanU16(0);
  const textOdd = scanU16(1);

  // Đếm số từ tiếng Việt hoặc từ khóa hành chính để chọn chuỗi UTF-16LE chuẩn nhất
  const scoreText = (s: string) => {
    if (!s) return 0;
    const vnMatches = s.match(/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi) || [];
    const keywordMatches = s.match(/(?:Cộng hòa|Việt Nam|Ủy ban|Quyết định|Thông báo|Kính gửi|Nơi nhận|Điều|Khoản|Căn cứ)/gi) || [];
    return vnMatches.length + keywordMatches.length * 10;
  };

  let bestU16 = textEven;
  if (scoreText(textOdd) > scoreText(textEven) || (textOdd.length > textEven.length && scoreText(textOdd) > 0)) {
    bestU16 = textOdd;
  }

  // 2. Quét 8-bit ANSI / TCVN3
  const ansiRuns: string[] = [];
  let currentAnsi = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x0a || b === 0x0d) {
      if (currentAnsi.length > 0 && !currentAnsi.endsWith('\n')) {
        currentAnsi += '\n';
      }
    } else if (TCVN3_CHARS[b]) {
      currentAnsi += TCVN3_CHARS[b];
    } else if (b >= 32 && b <= 126) {
      currentAnsi += String.fromCharCode(b);
    } else {
      if (currentAnsi.trim().length >= 12) {
        ansiRuns.push(currentAnsi.trim());
      }
      currentAnsi = '';
    }
  }
  if (currentAnsi.trim().length >= 12) {
    ansiRuns.push(currentAnsi.trim());
  }

  const combinedAnsi = ansiRuns.join('\n\n');

  if (bestU16.length > 50 && (scoreText(bestU16) > 3 || bestU16.length > combinedAnsi.length)) {
    return autoDecodeVietnameseFonts(bestU16);
  }

  if (combinedAnsi.length > bestU16.length) {
    return autoDecodeVietnameseFonts(combinedAnsi);
  }

  return autoDecodeVietnameseFonts(bestU16 || combinedAnsi);
}

/**
 * Hàm phân tích tổng thể file tài liệu (.doc, .docx, .rtf, .txt, .html):
 * Tự động nhận diện định dạng file, giải mã bảng mã cũ (TCVN3, VNI), bảo toàn cấu trúc văn bản.
 */
export async function parseDocumentFile(file: File): Promise<{
  text: string;
  isDocx: boolean;
  isBinaryDoc: boolean;
  detectedFormat: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // 1. Kiểm tra Magic Bytes Zip (.docx): 50 4B 03 04 (PK\x03\x04)
  const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (isZip || file.name.endsWith('.docx')) {
    try {
      let extractedContent = '';
      try {
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        if (htmlResult && htmlResult.value && htmlResult.value.includes('<table')) {
          extractedContent = htmlResult.value;
        }
      } catch {
        // Fallback
      }

      if (!extractedContent) {
        const rawResult = await mammoth.extractRawText({ arrayBuffer });
        extractedContent = rawResult?.value || '';
      }

      if (extractedContent.trim()) {
        return {
          text: autoDecodeVietnameseFonts(extractedContent),
          isDocx: true,
          isBinaryDoc: false,
          detectedFormat: 'DOCX (Office Open XML)'
        };
      }
    } catch (e) {
      console.warn('Lỗi khi đọc file bằng mammoth, chuyển sang phân tích nhị phân:', e);
    }
  }

  // 2. Kiểm tra file RTF: {\rtf
  if (bytes.length >= 5 && bytes[0] === 0x7b && bytes[1] === 0x5c && bytes[2] === 0x72 && bytes[3] === 0x74 && bytes[4] === 0x66) {
    const decoder = new TextDecoder('latin1');
    const rtfStr = decoder.decode(bytes);
    const rtfText = extractTextFromRtf(rtfStr);
    return {
      text: rtfText,
      isDocx: false,
      isBinaryDoc: false,
      detectedFormat: 'RTF (Rich Text Format)'
    };
  }

  // 3. Kiểm tra file HTML / XML lưu dưới đuôi .doc
  const headStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 500));
  if (/<html|<w:WordDocument|<!DOCTYPE|xmlns:w=/i.test(headStr)) {
    const fullHtml = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const htmlText = extractTextFromHtmlDoc(fullHtml);
    return {
      text: htmlText,
      isDocx: false,
      isBinaryDoc: false,
      detectedFormat: 'HTML / Word Web Document'
    };
  }

  // 4. Kiểm tra file Word 97-2003 nhị phân (.doc OLE2): D0 CF 11 E0 A1 B1 1A E1
  const isCFBF = bytes.length >= 8 &&
    bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 && bytes[5] === 0xb1 && bytes[6] === 0x1a && bytes[7] === 0xe1;

  if (isCFBF || file.name.endsWith('.doc')) {
    const docText = extractTextFromBinaryDoc(arrayBuffer);
    if (docText.trim().length > 10) {
      return {
        text: docText,
        isDocx: false,
        isBinaryDoc: true,
        detectedFormat: 'Word 97-2003 (.doc Binary CFBF)'
      };
    }
  }

  // 5. Fallback đọc file Text thông thường (UTF-8 hoặc Latin-1 / TCVN3)
  try {
    const utf8Decoder = new TextDecoder('utf-8');
    const utf8Text = utf8Decoder.decode(bytes);
    if (!utf8Text.includes('\uFFFD')) {
      return {
        text: autoDecodeVietnameseFonts(utf8Text),
        isDocx: false,
        isBinaryDoc: false,
        detectedFormat: 'Text UTF-8'
      };
    }
  } catch {
    //
  }

  // Đọc Latin-1 và thử chuyển mã TCVN3
  const latin1Decoder = new TextDecoder('latin1');
  const latin1Text = latin1Decoder.decode(bytes);
  return {
    text: autoDecodeVietnameseFonts(latin1Text),
    isDocx: false,
    isBinaryDoc: false,
    detectedFormat: 'Text / Legacy Encoding'
  };
}
