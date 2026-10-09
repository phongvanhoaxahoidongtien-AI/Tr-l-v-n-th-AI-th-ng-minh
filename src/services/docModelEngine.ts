import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, BorderStyle 
} from 'docx';
import { RuleLoader, DocumentRuleConfig } from './ruleLoader';

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

    // Lọc bỏ Quốc hiệu / Tiêu đề Đảng khỏi danh sách các dòng xử lý
    const remainingLines: string[] = [];
    for (const l of lines) {
      const stripped = l
        .replace(/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/gi, '')
        .replace(/Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc[\.:]?/gi, '')
        .replace(/ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/gi, '')
        .replace(/^[*\-–—_]{3,}$/, '')
        .trim();
      if (stripped) {
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

    // 2. Tìm số và ký hiệu
    const codeRegex = /^Số:\s*([0-9A-Za-z\-\/\.…\s]+)/i;
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

    // 4. Tìm tên loại văn bản (QUYẾT ĐỊNH, BÁO CÁO...)
    if (!tenLoai) {
      const typeKeywords = /^(QUYẾT ĐỊNH|TỜ TRÌNH|NGHỊ QUYẾT|THÔNG BÁO|KẾ HOẠCH|BÁO CÁO|GIẤY MỜI|GIẤY GIỚI THIỆU|BIÊN BẢN|HỢP ĐỒNG|CHỈ THỊ|QUY CHẾ|QUY ĐỊNH|HƯỚNG DẪN|CHƯƠNG TRÌNH|PHƯƠNG ÁN|ĐỀ ÁN|KẾT LUẬN)/i;
      const tIdx = remainingLines.findIndex((l, idx) => idx < 8 && typeKeywords.test(l));
      if (tIdx !== -1) {
        tenLoai = remainingLines[tIdx].toUpperCase();
        remainingLines.splice(tIdx, 1);

        if (tIdx < remainingLines.length && /^(Về việc|Ban hành|Phê duyệt|Quy định)/i.test(remainingLines[tIdx])) {
          trichYeu = remainingLines[tIdx];
          remainingLines.splice(tIdx, 1);
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

    // 6. Kính gửi hoặc Kính trình
    const kgIdx = remainingLines.findIndex(l => /^Kính gửi:|^Kính trình:/i.test(l));
    if (kgIdx !== -1) {
      kinhGuiHoacKinhTrinh = remainingLines[kgIdx];
      remainingLines.splice(kgIdx, 1);
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

        if (/^(KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.|CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH|GIÁM ĐỐC|TRƯỞNG PHÒNG)/i.test(l)) {
          inSig = true;
        }

        if (!inSig) {
          if (l.trim()) noiNhan.push(l);
        } else {
          if (/^(KT\.\s*CHỦ\s*TỊCH|TM\.|T\/M|KT\.|Q\.|TL\.|TUQ\.)/i.test(l)) {
            quyenHan = l.toUpperCase();
          } else if (/^(CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH|GIÁM ĐỐC|TRƯỞNG PHÒNG|HIỆU TRƯỞNG)/i.test(l)) {
            chucVu = l.toUpperCase();
          } else if (/^[A-ZÀ-Ỹ][a-zà-ỹ]+(\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4}$/.test(l) && !l.includes('Ký')) {
            hoTen = l;
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

    leftHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60, line: 240 },
        children: [new TextRun({ text: '————————', font: 'Times New Roman', size: 20 })]
      })
    );

    leftHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: doc.trichYeu && doc.tenLoai === 'CÔNG VĂN' ? 40 : 100, line: 240 },
        children: [new TextRun({ text: doc.soKyHieu || 'Số: …/…', font: 'Times New Roman', size: 26 })]
      })
    );

    if (doc.tenLoai === 'CÔNG VĂN' && doc.trichYeu) {
      leftHeaderParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100, line: 240 },
          children: [new TextRun({ text: doc.trichYeu, font: 'Times New Roman', size: 24, italics: true })]
        })
      );
    }

    // 2. Cột phải Header
    const rightHeaderParagraphs: Paragraph[] = [];
    if (!isParty) {
      rightHeaderParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40, line: 240 },
          children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', font: 'Times New Roman', size: 24, bold: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40, line: 240 },
          children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', font: 'Times New Roman', size: 26, bold: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60, line: 240 },
          children: [new TextRun({ text: '————————————', font: 'Times New Roman', size: 20, bold: true })]
        })
      );
    } else {
      rightHeaderParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40, line: 240 },
          children: [new TextRun({ text: 'ĐẢNG CỘNG SẢN VIỆT NAM', font: 'Times New Roman', size: 30, bold: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60, line: 240 },
          children: [new TextRun({ text: '—————', font: 'Times New Roman', size: 20, bold: true })]
        })
      );
    }

    const locDateStr = doc.diaDanh && doc.ngayThang ? `${doc.diaDanh}, ${doc.ngayThang}` : (doc.diaDanh || doc.ngayThang || '……, ngày … tháng … năm …');
    rightHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100, line: 240 },
        children: [new TextRun({ text: locDateStr, font: 'Times New Roman', size: 26, italics: true })]
      })
    );

    // Bảng Header 2 cột ẩn viền
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: hiddenBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: hiddenBorders, children: leftHeaderParagraphs }),
            new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, borders: hiddenBorders, children: rightHeaderParagraphs })
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
      if (!b.text) continue;
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

      // Khoảng cách ký tên
      rightFooterParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 500, after: 40, line: 240 },
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
                bottom: 1134,
                left: 1701, // 30mm
                right: 850 // 15mm
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
