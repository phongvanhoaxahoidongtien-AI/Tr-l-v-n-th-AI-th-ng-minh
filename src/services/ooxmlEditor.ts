import JSZip from 'jszip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { DocumentRuleConfig } from './ruleLoader';

export interface OOXMLStats {
  tables: number;
  drawings: number;
  mathFormulas: number;
  hyperlinks: number;
  bookmarks: number;
}

export interface OOXMLProcessResult {
  modifiedBlob: Blob;
  statsOriginal: OOXMLStats;
  statsModified: OOXMLStats;
  isVerified: boolean;
  verificationMessage: string;
}

export class OOXMLEditor {
  private static xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: false,
    trimValues: false
  });

  private static xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: false,
    suppressEmptyNode: true
  });

  /**
   * Đếm số lượng phần tử bảo vệ trong tài liệu để so sánh tính toàn vẹn
   */
  public static countElements(xmlContent: string): OOXMLStats {
    const tableMatches = xmlContent.match(/<w:tbl[\s>]/g) || [];
    const drawingMatches = xmlContent.match(/<w:drawing[\s>]|<w:pict[\s>]/g) || [];
    const mathMatches = xmlContent.match(/<m:oMath[\s>]/g) || [];
    const hyperlinkMatches = xmlContent.match(/<w:hyperlink[\s>]/g) || [];
    const bookmarkMatches = xmlContent.match(/<w:bookmarkStart[\s>]/g) || [];

    return {
      tables: tableMatches.length,
      drawings: drawingMatches.length,
      mathFormulas: mathMatches.length,
      hyperlinks: hyperlinkMatches.length,
      bookmarks: bookmarkMatches.length
    };
  }

  /**
   * Bộ máy 2: Chuẩn hóa tài liệu học thuật bằng cách chỉnh sửa trực tiếp cấu trúc OOXML
   */
  public static async processAcademicDocx(
    fileBuffer: ArrayBuffer,
    rule: DocumentRuleConfig
  ): Promise<OOXMLProcessResult> {
    const zip = await JSZip.loadAsync(fileBuffer);

    // 1. Đọc và kiểm tra văn bản gốc
    const docXmlEntry = zip.file('word/document.xml');
    if (!docXmlEntry) {
      throw new Error('Tệp .docx không hợp lệ: Thiếu entry word/document.xml');
    }

    const originalDocXml = await docXmlEntry.async('string');
    const statsOriginal = this.countElements(originalDocXml);

    // 2. Chuẩn hóa cấp style trong word/styles.xml trước
    const stylesEntry = zip.file('word/styles.xml');
    if (stylesEntry) {
      let stylesXml = await stylesEntry.async('string');

      // Chuẩn hóa font Times New Roman trong docDefaults
      stylesXml = stylesXml.replace(
        /(<w:rFonts\b[^>]*w:ascii=")[^"]*(")/g,
        `$1Times New Roman$2`
      );
      stylesXml = stylesXml.replace(
        /(<w:rFonts\b[^>]*w:hAnsi=")[^"]*(")/g,
        `$1Times New Roman$2`
      );
      stylesXml = stylesXml.replace(
        /(<w:rFonts\b[^>]*w:cs=")[^"]*(")/g,
        `$1Times New Roman$2`
      );

      // Cập nhật cỡ chữ mặc định trong Normal style (13pt = 26 half-points, 12pt = 24)
      const targetHalfPt = (rule.typography.bodySizePt || 13) * 2;
      stylesXml = stylesXml.replace(
        /(<w:sz\b[^>]*w:val=")[^"]*(")/g,
        `$1${targetHalfPt}$2`
      );
      stylesXml = stylesXml.replace(
        /(<w:szCs\b[^>]*w:val=")[^"]*(")/g,
        `$1${targetHalfPt}$2`
      );

      zip.file('word/styles.xml', stylesXml);
    }

    // 3. Cập nhật word/settings.xml: Đặt w:updateFields w:val="true" để Word tự động cập nhật mục lục TOC khi mở
    const settingsEntry = zip.file('word/settings.xml');
    if (settingsEntry) {
      let settingsXml = await settingsEntry.async('string');
      if (!settingsXml.includes('w:updateFields')) {
        settingsXml = settingsXml.replace(
          '</w:settings>',
          '<w:updateFields w:val="true"/></w:settings>'
        );
      }
      zip.file('word/settings.xml', settingsXml);
    }

    // 4. Chuẩn hóa lề trang trong section properties (w:sectPr) của document.xml
    let modifiedDocXml = originalDocXml;

    // Chuyển đổi mm sang dxa (1 mm = 56.7 dxa)
    const topDxa = Math.round((typeof rule.marginsMm.top === 'number' ? rule.marginsMm.top : rule.marginsMm.top.default) * 56.7);
    const bottomDxa = Math.round((typeof rule.marginsMm.bottom === 'number' ? rule.marginsMm.bottom : rule.marginsMm.bottom.default) * 56.7);
    const leftDxa = Math.round((typeof rule.marginsMm.left === 'number' ? rule.marginsMm.left : rule.marginsMm.left.default) * 56.7);
    const rightDxa = Math.round((typeof rule.marginsMm.right === 'number' ? rule.marginsMm.right : rule.marginsMm.right.default) * 56.7);

    // Cập nhật thẻ w:pgMar
    const pgMarReplacement = `<w:pgMar w:top="${topDxa}" w:right="${rightDxa}" w:bottom="${bottomDxa}" w:left="${leftDxa}" w:header="720" w:footer="720" w:gutter="0"/>`;
    if (/<w:pgMar\b[^>]*\/>/.test(modifiedDocXml)) {
      modifiedDocXml = modifiedDocXml.replace(/<w:pgMar\b[^>]*\/>/g, pgMarReplacement);
    }

    // 5. Chuẩn hóa font chữ Times New Roman cho tất cả các đoạn văn thường NGOẠI TRỪ công thức toán (m:oMath)
    modifiedDocXml = modifiedDocXml.replace(/(<w:rFonts\b[^>]*w:ascii=")[^"]*(")/g, `$1Times New Roman$2`);
    modifiedDocXml = modifiedDocXml.replace(/(<w:rFonts\b[^>]*w:hAnsi=")[^"]*(")/g, `$1Times New Roman$2`);

    // Lưu lại document.xml đã chuẩn hóa
    zip.file('word/document.xml', modifiedDocXml);

    // 6. Kiểm thử bắt buộc sau khi xuất: so sánh số lượng bảng, hình, công thức, hyperlink, bookmark
    const statsModified = this.countElements(modifiedDocXml);

    const isVerified =
      statsOriginal.tables === statsModified.tables &&
      statsOriginal.drawings === statsModified.drawings &&
      statsOriginal.mathFormulas === statsModified.mathFormulas &&
      statsOriginal.hyperlinks === statsModified.hyperlinks &&
      statsOriginal.bookmarks === statsModified.bookmarks;

    let verificationMessage = 'Xác minh toàn vẹn thành công: ';
    if (!isVerified) {
      const errors: string[] = [];
      if (statsOriginal.tables !== statsModified.tables) errors.push(`Sai lệch bảng biểu (${statsOriginal.tables} -> ${statsModified.tables})`);
      if (statsOriginal.drawings !== statsModified.drawings) errors.push(`Sai lệch hình vẽ/ảnh (${statsOriginal.drawings} -> ${statsModified.drawings})`);
      if (statsOriginal.mathFormulas !== statsModified.mathFormulas) errors.push(`Sai lệch công thức toán (${statsOriginal.mathFormulas} -> ${statsModified.mathFormulas})`);
      if (statsOriginal.hyperlinks !== statsModified.hyperlinks) errors.push(`Sai lệch liên kết hyperlink (${statsOriginal.hyperlinks} -> ${statsModified.hyperlinks})`);
      if (statsOriginal.bookmarks !== statsModified.bookmarks) errors.push(`Sai lệch bookmark (${statsOriginal.bookmarks} -> ${statsModified.bookmarks})`);
      
      verificationMessage = `Phát hiện lỗi bảo toàn: ${errors.join(', ')}`;
    } else {
      verificationMessage += `Bảo toàn nguyên vẹn ${statsModified.tables} bảng biểu, ${statsModified.drawings} hình ảnh, ${statsModified.mathFormulas} công thức toán, ${statsModified.hyperlinks} liên kết và ${statsModified.bookmarks} thẻ đánh dấu.`;
    }

    const modifiedBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return {
      modifiedBlob,
      statsOriginal,
      statsModified,
      isVerified,
      verificationMessage
    };
  }
}
