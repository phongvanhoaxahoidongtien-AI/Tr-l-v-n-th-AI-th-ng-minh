import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, BorderStyle, UnderlineType 
} from 'docx';
import { RuleLoader, DocumentRuleConfig } from './ruleLoader';
import { isWarningOrInstructionLine } from '../utils/cleanAIText';
import { formatDecree30TitleCase } from './decree30Formatter';

export interface DocModel {
  heThong: 'hanh_chinh' | 'dang' | 'academic';
  loai: string;
  coQuanChuQuan: string;
  coQuanBanHanh: string;
  soKyHieu: string;
  diaDanh: string;
  ngayThang: string;
  tenLoai: string;
  trichYeu: string;
  kinhGuiHoacKinhTrinh: string;
  canCu: string[];
  noiDungBlocks: Array<{
    type: 'paragraph' | 'article' | 'clause' | 'point' | 'table' | 'bullet';
    text: string;
    level?: number;
    tableHtml?: string;
  }>;
  phuLuc: string[];
  quyenHan: string;
  chucVu: string;
  hoTen: string;
  noiNhan: string[];
  thanhPhanBoSung: {
    mucDoKhan?: string;
    doMat?: string;
    kyHieuNguoiSoan?: string;
    thongTinLienHe?: string;
  };
  uncertainPoints: string[];
}

export class DocModelEngine {
  /**
   * Bóc tách văn bản thô / docx thành cấu trúc DocModel chuẩn
   */
  public static extractFromText(text: string, systemHint?: 'hanh_chinh' | 'dang' | 'academic'): DocModel {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const isParty = systemHint === 'dang' || /ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/i.test(lines.slice(0, 5).join('\n'));

    const uncertainPoints: string[] = [];

    let coQuanChuQuan = '';
    let coQuanBanHanh = '';
    let soKyHieu = '';
    let diaDanh = '';
    let ngayThang = '';
    let tenLoai = '';
    let trichYeu = '';
    let kinhGuiHoacKinhTrinh = '';
    const canCu: string[] = [];
    const noiDungBlocks: DocModel['noiDungBlocks'] = [];
    const phuLuc: string[] = [];
    let quyenHan = '';
    let chucVu = '';
    let hoTen = '';
    const noiNhan: string[] = [];

    // Lọc bỏ Quốc hiệu / Tiêu đề Đảng và các dòng cảnh báo/hướng dẫn khỏi danh sách các dòng xử lý
    const remainingLines: string[] = [];
    for (const l of lines) {
      if (isWarningOrInstructionLine(l)) {
        continue;
      }
      const stripped = l
        .replace(/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi, '')
        .replace(/Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi, '')
        .replace(/ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi, '')
        .replace(/^[*\-–—_]{3,}$/, '')
        .trim();
      if (stripped && !isWarningOrInstructionLine(stripped)) {
        remainingLines.push(stripped);
      }
    }

    // 1. Tìm ngày tháng & địa danh
    const dateRegex = /([a-zA-ZÀ-ỹ\s]+),\s*ngày\s+([0-9]{1,2}|…+)\s+tháng\s+([0-9]{1,2}|…+)\s+năm\s+([0-9]{4}|…+)/i;
    const dateIdx = remainingLines.findIndex((l, idx) => idx < 12 && dateRegex.test(l));
    if (dateIdx !== -1) {
      const m = remainingLines[dateIdx].match(dateRegex);
      if (m) {
        diaDanh = m[1].trim();
        ngayThang = `ngày ${m[2]} tháng ${m[3]} năm ${m[4]}`;
      }
      remainingLines.splice(dateIdx, 1);
    } else {
      uncertainPoints.push('Chưa xác định được địa danh và ngày tháng ban hành văn bản');
    }

    // 2. Tìm số và ký hiệu (hỗ trợ cả / và - của Đảng và NĐ 30)
    const codeRegex = /(?:^|[\s\u00A0])(?:Số|SỐ|Số\s*:|Số\s*\.)\s*:?\.?\s*([0-9A-Za-z\-\.…\s]*[\/\-][A-Za-z0-9\-\.…]+(?:[\/\-][A-Za-z0-9\-\.…]+)*|[0-9]+)/i;
    const codeIdx = remainingLines.findIndex((l, idx) => idx < 10 && codeRegex.test(l));
    if (codeIdx !== -1) {
      soKyHieu = remainingLines[codeIdx];
      remainingLines.splice(codeIdx, 1);
    } else {
      soKyHieu = '[CẦN XÁC NHẬN]';
      uncertainPoints.push('Chưa có số, ký hiệu văn bản');
    }

    // 3. Tìm trích yếu V/v (nếu là công văn)
    const vvIdx = remainingLines.findIndex((l, idx) => idx < 10 && /^V\/v\s+/i.test(l));
    if (vvIdx !== -1) {
      trichYeu = remainingLines[vvIdx];
      tenLoai = 'CÔNG VĂN';
      remainingLines.splice(vvIdx, 1);
    }

    // 4. Tìm tên loại văn bản & trích yếu (BÁO CÁO, QUYẾT ĐỊNH, KẾ HOẠCH, TỜ TRÌNH, NGHỊ QUYẾT, KẾT LUẬN...)
    if (!tenLoai) {
      const typePatterns = [
        { type: 'BÁO CÁO', pattern: /^(?:BÁO\s+CÁO|Báo\s+cáo)(?:\s*(?:NHANH|CHUYÊN\s+ĐỀ|ĐỘT\s+XUẤT|SƠ\s+KẾT|TỔNG\s+KẾT|ĐỊNH\s+KỲ|ĐÁNH\s+GIÁ|KẾT\s+QUẢ|TÌNH\s+HÌNH|CÔNG\s+TÁC))?(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i },
        { type: 'QUYẾT ĐỊNH', pattern: /^(?:QUYẾT\s+ĐỊNH|Quyết\s+định)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i },
        { type: 'KẾ HOẠCH', pattern: /^(?:KẾ\s+HOẠCH|Kế\s+hoạch)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i },
        { type: 'TỜ TRÌNH', pattern: /^(?:TỜ\s+TRÌNH|Tờ\s+trình)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i },
        { type: 'THÔNG BÁO', pattern: /^(?:THÔNG\s+BÁO|Thông\s+báo)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i },
        { type: 'NGHỊ QUYẾT', pattern: /^(?:NGHỊ\s+QUYẾT|Nghị\s+quyết)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i },
        { type: 'KẾT LUẬN', pattern: /^(?:KẾT\s+LUẬN|Kết\s+luận)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i },
        { type: 'CHỈ THỊ', pattern: /^(?:CHỈ\s+THỊ|Chỉ\s+thị)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i },
      ];

      for (let i = 0; i < Math.min(10, remainingLines.length); i++) {
        const line = remainingLines[i];
        if (/^Kính\s+gửi:|^Kính\s+trình:|^Căn\s+cứ/i.test(line)) break;

        let matched = false;
        for (const item of typePatterns) {
          const m = line.match(item.pattern);
          if (m) {
            tenLoai = item.type;
            const inlineRest = (m[1] || '').trim();
            remainingLines.splice(i, 1);
            matched = true;

            let titleParts: string[] = [];
            if (inlineRest) titleParts.push(inlineRest);

            // Kiểm tra dòng kế tiếp xem có phải là phần trích yếu tiêu đề không
            if (i < remainingLines.length) {
              const nextL = remainingLines[i];
              if (nextL && !/^Kính|^Căn cứ|^Điều\s+\d+/i.test(nextL) && (
                /^(?:Về việc|Ban hành|Phê duyệt|Quy định|Kết quả|Tình hình|Tổng kết|Sơ kết|Đánh giá|Thực hiện|Triển khai)/i.test(nextL) ||
                (titleParts.length > 0 && nextL.length < 150 && !nextL.endsWith('.'))
              )) {
                titleParts.push(nextL.trim());
                remainingLines.splice(i, 1);
              }
            }

            if (titleParts.length > 0) {
              trichYeu = formatDecree30TitleCase(titleParts.join(' '));
            }
            break;
          }
        }
        if (matched) break;

        // Tổng quát các loại văn bản còn lại
        const generalMatch = line.match(/^(QUY CHẾ|QUY ĐỊNH|HƯỚNG DẪN|CHƯƠNG TRÌNH|PHƯƠNG ÁN|ĐỀ ÁN|DỰ ÁN|BIÊN BẢN|HỢP ĐỒNG|GIẤY MỜI|GIẤY GIỚI THIỆU|GIẤY ỦY QUYỀN|GIẤY NGHỈ PHÉP|BẢN GHI NHỚ|BẢN THỎA THUẬN|PHIẾU GỬI|PHIẾU CHUYỂN|PHIẾU BÁO|CÔNG ĐIỆN|THƯ CÔNG|THÔNG CÁO)(?:[\:\-–—\.]\s*|\s+|$)(.*)$/i);
        if (generalMatch) {
          tenLoai = generalMatch[1].toUpperCase();
          const inlineRest = (generalMatch[2] || '').trim();
          remainingLines.splice(i, 1);
          if (inlineRest) {
            trichYeu = formatDecree30TitleCase(inlineRest);
          } else if (i < remainingLines.length && !/^Kính|^Căn cứ/i.test(remainingLines[i])) {
            trichYeu = formatDecree30TitleCase(remainingLines[i]);
            remainingLines.splice(i, 1);
          }
          break;
        }
      }
    }

    if (!tenLoai) {
      tenLoai = 'CÔNG VĂN';
    }

    // 5. Tìm cơ quan ban hành
    const agencyKeywords = /^(?:ỦY BAN NHÂN DÂN|UBND|HỘI ĐỒNG NHÂN DÂN|HĐND|TỈNH ỦY|THÀNH ỦY|HUYỆN ỦY|ĐẢNG ỦY|CHI BỘ|BAN THƯỜNG VỤ|SỞ|PHÒNG|BỘ|BAN|TRƯỜNG|TRUNG TÂM|BỆNH VIỆN|CÔNG TY)/i;
    const foundAgencyLines: string[] = [];
    for (let i = 0; i < Math.min(6, remainingLines.length); i++) {
      const l = remainingLines[i];
      if (/^Kính gửi:|^Căn cứ|^Điều/i.test(l)) break;
      if (agencyKeywords.test(l) || (l.length <= 60 && l === l.toUpperCase() && !/^Số:|^V\/v/i.test(l))) {
        foundAgencyLines.push(l);
      }
    }

    if (foundAgencyLines.length >= 2) {
      coQuanChuQuan = foundAgencyLines[0];
      coQuanBanHanh = foundAgencyLines[1];
      remainingLines.splice(0, foundAgencyLines.length);
    } else if (foundAgencyLines.length === 1) {
      coQuanBanHanh = foundAgencyLines[0];
      remainingLines.splice(0, 1);
    } else {
      coQuanBanHanh = '[CẦN XÁC NHẬN CƠ QUAN BAN HÀNH]';
      uncertainPoints.push('Chưa xác định được cơ quan ban hành');
    }

    // 6. Kính gửi hoặc Kính trình (bóc tách toàn bộ các dòng đến khi gặp dấu ".")
    const kgIdx = remainingLines.findIndex(l => /^Kính\s*(?:gửi|trình):/i.test(l));
    if (kgIdx !== -1) {
      const kgLines: string[] = [remainingLines[kgIdx]];
      remainingLines.splice(kgIdx, 1);
      while (kgIdx < remainingLines.length) {
        const nextL = remainingLines[kgIdx].trim();
        if (/^(?:Căn\s+cứ|Thực\s+hiện|Nhằm|Theo|Xét|Điều|I\.|1\.|KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|CHỦ\s*TỊCH|PHÓ\s*CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|Nơi\s*nhận)/i.test(nextL)) break;
        if (/^[-\u2013\u2014\*\+•●○■◆]\s+/.test(nextL) || nextL.endsWith(';') || nextL.endsWith('.')) {
          kgLines.push(nextL);
          remainingLines.splice(kgIdx, 1);
          if (nextL.endsWith('.')) break;
        } else {
          break;
        }
      }
      kinhGuiHoacKinhTrinh = kgLines.join('\n');
    }

    // 7. Bóc tách Nơi nhận và Chữ ký ở cuối văn bản
    const nnIdx = remainingLines.findIndex(l => /^Nơi nhận:?/i.test(l));
    if (nnIdx !== -1) {
      const tail = remainingLines.splice(nnIdx);
      let inSig = false;

      for (const l of tail) {
        if (/^Nơi nhận:?/i.test(l)) {
          const stripped = l.replace(/^Nơi nhận:?\s*/i, '').trim();
          if (stripped) noiNhan.push(stripped);
          continue;
        }

        const cleanL = l.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').trim();
        if (!cleanL) continue;

        const isSig = /^(?:KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ|CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|PHÓ\s*CHỦ\s*TỊCH|QUYỀN\s*CHỦ\s*TỊCH|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|HIỆU\s*TRƯỞNG)\b/i.test(cleanL);
        const isPerson = (/^[A-ZĐÀ-Ỹ][a-zđà-ỹ]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ]+){1,4}$/.test(cleanL) || /^[A-ZĐÀ-Ỹ\s]{3,35}$/.test(cleanL)) &&
          !/^(?:Như|Lưu|Phòng|Ban|Sở|Bộ|UBND|HĐND|Ủy\s*ban|Thường\s*trực|Chi\s*bộ|Đảng\s*ủy|Đảng\s*bộ|Hội\s*đồng|Công\s*an|Quân\s*sự|Y\s*tế|Đoàn|Hội|Tổ|Đồng\s*chí|Đ\/c|Các)\b/i.test(cleanL);

        if (isSig || isPerson) {
          inSig = true;
        }

        if (!inSig) {
          noiNhan.push(cleanL.startsWith('-') ? cleanL : `- ${cleanL}`);
        } else {
          if (/^(?:KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|T\.UQ)/i.test(cleanL)) {
            quyenHan = cleanL.toUpperCase();
          } else if (/^(?:CHỦ\s*TỊCH|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ|PHÓ\s*CHỦ\s*TỊCH|QUYỀN\s*CHỦ\s*TỊCH|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|TRƯỞNG\s*PHÒNG|HIỆU\s*TRƯỞNG)/i.test(cleanL)) {
            chucVu = cleanL.toUpperCase();
          } else if (isPerson && !cleanL.includes('Ký') && !cleanL.includes('Họ tên')) {
            hoTen = cleanL;
          }
        }
      }
    }

    // 8. Phân loại nội dung còn lại thành Căn cứ vs Thân bài
    for (const l of remainingLines) {
      if (/^Căn cứ\s+/i.test(l)) {
        canCu.push(l);
      } else {
        let type: DocModel['noiDungBlocks'][0]['type'] = 'paragraph';
        if (/^Điều\s+\d+[\.:]/i.test(l)) type = 'article';
        else if (/^\d+\.\s+/.test(l)) type = 'clause';
        else if (/^[a-zđ]\)\s+/i.test(l)) type = 'point';
        else if (/^-\s+/.test(l)) type = 'bullet';
        else if (l.includes('<table') || l.includes('___TABLE_BLOCK_')) type = 'table';

        noiDungBlocks.push({ type, text: l });
      }
    }

    return {
      heThong: isParty ? 'dang' : 'hanh_chinh',
      loai: tenLoai,
      coQuanChuQuan,
      coQuanBanHanh,
      soKyHieu,
      diaDanh,
      ngayThang,
      tenLoai,
      trichYeu,
      kinhGuiHoacKinhTrinh,
      canCu,
      noiDungBlocks,
      phuLuc,
      quyenHan,
      chucVu,
      hoTen,
      noiNhan,
      thanhPhanBoSung: {},
      uncertainPoints
    };
  }

  /**
   * Bộ máy 1: Dựng lại tệp .docx hoàn chỉnh theo đúng khung thể thức NĐ 30 / HD 05
   */
  public static async rebuildDocx(doc: DocModel): Promise<Blob> {
    const isParty = doc.heThong === 'dang';
    const rule = RuleLoader.getRule(doc.heThong);

    const hiddenBorders = {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    };

    // 1. Cột trái Header
    const leftHeaderParagraphs: Paragraph[] = [];
    if (doc.coQuanChuQuan) {
      leftHeaderParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40, line: 240 },
          children: [new TextRun({ text: doc.coQuanChuQuan.toUpperCase(), font: 'Times New Roman', size: 24 })]
        })
      );
    }

    leftHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40, line: 240 },
        children: [new TextRun({ text: doc.coQuanBanHanh.toUpperCase(), font: 'Times New Roman', size: 24, bold: true })]
      })
    );

    // Đường kẻ ngang dưới tên cơ quan: Dùng ký tự '─' font size 18, độ đậm bằng tiêu ngữ, cùng ngang 1 hàng
    leftHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 60, line: 160 },
        children: [new TextRun({ text: '─────────', font: 'Times New Roman', size: 18 })]
      })
    );

    leftHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: doc.trichYeu && doc.tenLoai === 'CÔNG VĂN' ? 40 : 100, line: 240 },
        children: [new TextRun({ text: doc.soKyHieu || 'Số:          /…', font: 'Times New Roman', size: 26 })]
      })
    );

    if (doc.tenLoai === 'CÔNG VĂN' && doc.trichYeu) {
      let formattedSub = doc.trichYeu.trim();
      if (/^Về việc\s+/i.test(formattedSub)) {
        formattedSub = formattedSub.replace(/^Về việc\s+/i, 'V/v ');
      } else if (!/^V\/v\s+/i.test(formattedSub)) {
        formattedSub = `V/v ${formattedSub.replace(/^V\/v:?\s*/i, '')}`;
      }

      // Ô 5b: Trích yếu công văn - bắt đầu bằng V/v, chữ thường 12-13pt, kiểu chữ đứng, không in đậm, canh giữa. Kết thúc KHÔNG có dấu gạch ngang
      leftHeaderParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 30, after: 60, line: 240 },
          children: [new TextRun({ text: formattedSub, font: 'Times New Roman', size: 25, bold: false, italics: false })]
        })
      );
    }

    // 2. Cột phải Header (9.8 cm): Quốc hiệu, Tiêu ngữ, Địa danh ngày tháng
    const rightHeaderParagraphs: Paragraph[] = [];
    if (!isParty) {
      rightHeaderParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 30, line: 240 },
          children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', font: 'Times New Roman', size: 26, bold: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 30, line: 240 },
          children: [
            new TextRun({ 
              text: 'Độc lập - Tự do - Hạnh phúc', 
              font: 'Times New Roman', 
              size: 28, 
              bold: true
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 60, line: 160 },
          children: [
            new TextRun({
              text: '──────────────────',
              font: 'Times New Roman',
              size: 18,
            }),
          ],
        })
      );
    } else {
      rightHeaderParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20, line: 240 },
          children: [new TextRun({ text: 'ĐẢNG CỘNG SẢN VIỆT NAM', font: 'Times New Roman', size: 28, bold: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 60, line: 160 },
          children: [new TextRun({ text: '─────────', font: 'Times New Roman', size: 18 })]
        })
      );
    }

    const locDateStr = doc.diaDanh && doc.ngayThang 
      ? `${doc.diaDanh}, ${doc.ngayThang}` 
      : `${doc.diaDanh || 'Đông Tiến'}, ngày\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0tháng\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0năm ${new Date().getFullYear()}`;
    rightHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80, line: 240 },
        children: [new TextRun({ text: locDateStr, font: 'Times New Roman', size: 27, italics: true })]
      })
    );

    // Bảng Header 2 cột tổng 16cm: Cột trái 6.2cm (3515 dxa), Cột phải 9.8cm (5556 dxa)
    const headerTable = new Table({
      width: { size: 9071, type: WidthType.DXA },
      borders: hiddenBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 3515, type: WidthType.DXA }, borders: hiddenBorders, children: leftHeaderParagraphs }),
            new TableCell({ width: { size: 5556, type: WidthType.DXA }, borders: hiddenBorders, children: rightHeaderParagraphs })
          ]
        })
      ]
    });

    const bodyParagraphs: Paragraph[] = [];

    // Tên loại văn bản & trích yếu (nếu không phải công văn)
    if (doc.tenLoai !== 'CÔNG VĂN') {
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 60, line: 280 },
          children: [new TextRun({ text: doc.tenLoai.toUpperCase(), font: 'Times New Roman', size: 28, bold: true })]
        })
      );

      if (doc.trichYeu) {
        bodyParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 180, line: 280 },
            children: [new TextRun({ text: doc.trichYeu, font: 'Times New Roman', size: 26, bold: true })]
          })
        );
      }
    }

    // Kính gửi / Kính trình
    if (doc.kinhGuiHoacKinhTrinh) {
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { firstLine: 567 },
          spacing: { before: 120, after: 80, line: 300 },
          children: [new TextRun({ text: doc.kinhGuiHoacKinhTrinh, font: 'Times New Roman', size: 28, bold: true })]
        })
      );
    }

    // Căn cứ pháp lý
    for (const c of doc.canCu) {
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 567 },
          spacing: { before: 40, after: 60, line: 300 },
          children: [new TextRun({ text: c, font: 'Times New Roman', size: 26, italics: true })]
        })
      );
    }

    // Thân bài
    for (const b of doc.noiDungBlocks) {
      if (!b.text || isWarningOrInstructionLine(b.text)) continue;
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: b.type === 'bullet' ? { left: 850 } : { firstLine: 567 },
          spacing: { before: 60, after: 60, line: 300 },
          children: [new TextRun({ text: b.text, font: 'Times New Roman', size: 28, bold: b.type === 'article' })]
        })
      );
    }

    // Footer 2 cột: Nơi nhận (trái) và Chữ ký (phải)
    const leftFooterParagraphs: Paragraph[] = [];
    if (doc.noiNhan && doc.noiNhan.length > 0) {
      leftFooterParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 100, after: 40, line: 240 },
          children: [new TextRun({ text: 'Nơi nhận:', font: 'Times New Roman', size: 24, bold: true, italics: true })]
        })
      );

      for (const r of doc.noiNhan) {
        const item = r.startsWith('-') ? r : `- ${r}`;
        leftFooterParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 20, after: 30, line: 220 },
            children: [new TextRun({ text: item, font: 'Times New Roman', size: 22 })]
          })
        );
      }
    } else {
      leftFooterParagraphs.push(new Paragraph({ children: [] }));
    }

    const rightFooterParagraphs: Paragraph[] = [];
    if (doc.quyenHan || doc.chucVu || doc.hoTen) {
      if (doc.quyenHan) {
        rightFooterParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 40, line: 240 },
            children: [new TextRun({ text: doc.quyenHan.toUpperCase(), font: 'Times New Roman', size: 26, bold: true })]
          })
        );
      }

      if (doc.chucVu) {
        rightFooterParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 60, line: 240 },
            children: [new TextRun({ text: doc.chucVu.toUpperCase(), font: 'Times New Roman', size: 26, bold: true })]
          })
        );
      }

      // Cách thêm 1 dòng đối với chức danh theo yêu cầu thể thức
      rightFooterParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120, line: 240 },
          children: [new TextRun({ text: '', font: 'Times New Roman', size: 26 })]
        })
      );

      // Khoảng cách ký tên & họ tên
      rightFooterParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 40, line: 240 },
          children: [new TextRun({ text: doc.hoTen || '(Chưa điền họ tên)', font: 'Times New Roman', size: 28, bold: true })]
        })
      );
    } else {
      rightFooterParagraphs.push(new Paragraph({ children: [] }));
    }

    const footerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: hiddenBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 48, type: WidthType.PERCENTAGE }, borders: hiddenBorders, children: leftFooterParagraphs }),
            new TableCell({ width: { size: 52, type: WidthType.PERCENTAGE }, borders: hiddenBorders, children: rightFooterParagraphs })
          ]
        })
      ]
    });

    const docxFile = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1134, // 20mm
                bottom: 1134, // 20mm
                left: 1701, // 30mm
                right: 1134 // 20mm (Chiều rộng văn bản chuẩn 16cm)
              }
            }
          },
          children: [headerTable, ...bodyParagraphs, footerTable]
        }
      ]
    });

    return await Packer.toBlob(docxFile);
  }
}
