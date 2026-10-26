import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, BorderStyle, HeadingLevel, UnderlineType,
  Header, PageNumber
} from 'docx';
import { 
  StructuredDoc, 
  formatDocCodeForDisplay, 
  getStandardAgencyHeaderParts, 
  cleanAndDeduplicateRecipients,
  detectNumberedHeading,
  getAutoAdjustedMottoLine
} from './decree30Formatter';
import { 
  isCongVanDocument, 
  formatCongVanSubject, 
  getCongVanSubject, 
  buildCongVanDocxHeaderRows 
} from './Module_CongVan.js';
import { isWarningOrInstructionLine } from '../utils/cleanAIText';
import { AgencySettings } from '../types';

/**
 * Chuyển đổi chuỗi bảng HTML hoặc bảng Markdown thành đối tượng Table docx chuẩn Nghị định 30:
 * - Bảo toàn 100% cấu trúc bảng bao gồm ô gộp ngang (colspan / columnSpan) và ô gộp dọc (rowspan / rowSpan)
 * - Giữ nguyên viền đơn (solid black 1px / size 4), căn lề theo từng ô (STT căn giữa, số căn phải, chữ căn trái)
 * - Font chuẩn Times New Roman, cỡ 12pt (size 24) dòng tiêu đề, 11-12pt (size 22-24) nội dung
 */
export function convertTableToDocxTable(tableContent: string): Table | null {
  try {
    const TOTAL_TABLE_WIDTH_DXA = 9185; // Chiều rộng chuẩn 16.2cm vừa khít khổ in A4 (lề trái 30mm, lề phải 15-20mm)

    // 1. Trường hợp bảng HTML (từ file Word, clipboard HTML hoặc mammoth)
    if (tableContent.includes('<table')) {
      const rowMatches = tableContent.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi);
      if (!rowMatches || rowMatches.length === 0) return null;

      // Bước 1: Tính toán số lượng cột thực tế (bao gồm cả colspan) để phân bổ độ rộng cân đối trang A4
      let maxCols = 1;
      const parsedRowsData: Array<{
        isHeaderRow: boolean;
        cells: Array<{
          cellHtml: string;
          cellText: string;
          paragraphs: string[];
          colSpan?: number;
          rowSpan?: number;
          align: (typeof AlignmentType)[keyof typeof AlignmentType];
        }>;
      }> = [];

      for (let rIdx = 0; rIdx < rowMatches.length; rIdx++) {
        const rowHtml = rowMatches[rIdx];
        const isHeaderRow = /<th\b/i.test(rowHtml) || rIdx === 0;

        const cellMatches = rowHtml.match(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
        if (!cellMatches || cellMatches.length === 0) continue;

        let rowColCount = 0;
        const cellsData = cellMatches.map((cellHtml, cIdx) => {
          const colspanMatch = cellHtml.match(/colspan\s*=\s*["']?(\d+)["']?/i);
          const rowspanMatch = cellHtml.match(/rowspan\s*=\s*["']?(\d+)["']?/i);
          const colSpanVal = colspanMatch ? parseInt(colspanMatch[1], 10) : undefined;
          const rowSpanVal = rowspanMatch ? parseInt(rowspanMatch[1], 10) : undefined;

          rowColCount += colSpanVal && colSpanVal > 1 ? colSpanVal : 1;

          // Xử lý giữ nguyên các dòng con trong ô (hỗ trợ nhiều dòng, danh sách, ngắt đoạn <p>/<br>)
          const cellContentHtml = cellHtml
            .replace(/^<(?:td|th)\b[^>]*>/i, '')
            .replace(/<\/(?:td|th)>$/i, '')
            .trim();

          const rawParagraphs = cellContentHtml
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .split('\n')
            .map(line => {
              return line
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&amp;/gi, '&')
                .replace(/&quot;/gi, '"')
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .trim();
            })
            .filter(line => line.length > 0);

          const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [''];
          const fullCellText = paragraphs.join(' ').trim();

          const isStt = cIdx === 0 && (isHeaderRow || /^(?:stt|\d+)$/i.test(fullCellText));
          const isNumber = /^\d+(?:[.,]\d+)?%?$/.test(fullCellText) || /^[\d\.,\s]+(?:%|đ|đồng|USD)?$/i.test(fullCellText);

          let align: (typeof AlignmentType)[keyof typeof AlignmentType] = isHeaderRow
            ? AlignmentType.CENTER
            : isStt
            ? AlignmentType.CENTER
            : isNumber
            ? AlignmentType.RIGHT
            : AlignmentType.LEFT;

          if (/text-align:\s*center|align=["']center["']/i.test(cellHtml)) {
            align = AlignmentType.CENTER;
          } else if (/text-align:\s*right|align=["']right["']/i.test(cellHtml)) {
            align = AlignmentType.RIGHT;
          } else if (/text-align:\s*justify/i.test(cellHtml)) {
            align = AlignmentType.JUSTIFIED;
          }

          return {
            cellHtml,
            cellText: fullCellText,
            paragraphs,
            colSpan: colSpanVal,
            rowSpan: rowSpanVal,
            align,
          };
        });

        if (rowColCount > maxCols) maxCols = rowColCount;
        parsedRowsData.push({ isHeaderRow, cells: cellsData });
      }

      if (parsedRowsData.length === 0) return null;

      // Bước 2: Tính toán độ rộng từng cột chuẩn thể thức
      // Nếu cột 0 là STT, dành 800 DXA (~1.4cm), các cột còn lại chia đều
      const hasSttCol = maxCols >= 3;
      const sttColWidth = hasSttCol ? 800 : Math.round(TOTAL_TABLE_WIDTH_DXA / maxCols);
      const remainingWidth = hasSttCol ? TOTAL_TABLE_WIDTH_DXA - sttColWidth : TOTAL_TABLE_WIDTH_DXA;
      const otherColWidth = hasSttCol ? Math.round(remainingWidth / (maxCols - 1)) : sttColWidth;

      const docxRows: TableRow[] = [];

      for (const rowData of parsedRowsData) {
        const docxCells: TableCell[] = [];
        let curColIdx = 0;

        for (let cIdx = 0; cIdx < rowData.cells.length; cIdx++) {
          const c = rowData.cells[cIdx];
          const spanCount = c.colSpan && c.colSpan > 1 ? c.colSpan : 1;

          // Tính độ rộng ô TableCell theo số cột gộp
          let cellWidthDxa = 0;
          for (let s = 0; s < spanCount; s++) {
            const colPos = curColIdx + s;
            cellWidthDxa += colPos === 0 && hasSttCol ? sttColWidth : otherColWidth;
          }
          curColIdx += spanCount;

          // Tạo các Paragraphs cho ô: bảo toàn nhiều dòng
          const cellParagraphs: Paragraph[] = c.paragraphs.map((lineText, pIdx) => {
            const isFirst = pIdx === 0;
            const isLast = pIdx === c.paragraphs.length - 1;
            return new Paragraph({
              alignment: c.align,
              spacing: {
                before: isFirst ? (rowData.isHeaderRow ? 70 : 45) : 20,
                after: isLast ? (rowData.isHeaderRow ? 70 : 45) : 20,
                line: 240,
              },
              children: [
                new TextRun({
                  text: lineText,
                  font: 'Times New Roman',
                  size: rowData.isHeaderRow ? 24 : 22, // 12pt tiêu đề, 11pt nội dung chuẩn NĐ 30
                  bold: rowData.isHeaderRow,
                }),
              ],
            });
          });

          docxCells.push(
            new TableCell({
              width: { size: cellWidthDxa, type: WidthType.DXA },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              },
              columnSpan: c.colSpan && c.colSpan > 1 ? c.colSpan : undefined,
              rowSpan: c.rowSpan && c.rowSpan > 1 ? c.rowSpan : undefined,
              shading: rowData.isHeaderRow ? { fill: 'F8FAFC' } : undefined,
              children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ children: [] })],
            })
          );
        }

        docxRows.push(
          new TableRow({
            tableHeader: rowData.isHeaderRow,
            cantSplit: true,
            children: docxCells,
          })
        );
      }

      if (docxRows.length > 0) {
        return new Table({
          width: { size: TOTAL_TABLE_WIDTH_DXA, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
          rows: docxRows,
        });
      }
    }

    // 2. Trường hợp bảng Markdown
    if (tableContent.includes('|')) {
      const lines = tableContent.split('\n').filter(l => l.trim().startsWith('|'));
      if (lines.length >= 2) {
        const parseRow = (line: string) => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        const headerCells = parseRow(lines[0]);
        const dataLines = lines.slice(1).filter(l => !/^[|\s:-]+$/.test(l));
        const dataRows = dataLines.map(parseRow);

        const colCount = Math.max(headerCells.length, 1);
        const hasSttCol = colCount >= 3;
        const sttColWidth = hasSttCol ? 800 : Math.round(TOTAL_TABLE_WIDTH_DXA / colCount);
        const otherColWidth = hasSttCol ? Math.round((TOTAL_TABLE_WIDTH_DXA - sttColWidth) / (colCount - 1)) : sttColWidth;

        const docxRows: TableRow[] = [
          new TableRow({
            tableHeader: true,
            cantSplit: true,
            children: headerCells.map((cellText, cIdx) => new TableCell({
              width: { size: cIdx === 0 && hasSttCol ? sttColWidth : otherColWidth, type: WidthType.DXA },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              },
              shading: { fill: 'F8FAFC' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 70, after: 70, line: 240 },
                  children: [
                    new TextRun({
                      text: cellText,
                      font: 'Times New Roman',
                      size: 24, // 12pt
                      bold: true,
                    }),
                  ],
                }),
              ],
            })),
          }),
          ...dataRows.map(rowCells => new TableRow({
            cantSplit: true,
            children: rowCells.map((cellText, cIdx) => {
              const isStt = cIdx === 0 && (/^\d+$/.test(cellText) || /^stt\b/i.test(cellText));
              const isNumber = /^\d+(?:[.,]\d+)?%?$/.test(cellText);
              const align = isStt ? AlignmentType.CENTER : isNumber ? AlignmentType.RIGHT : AlignmentType.LEFT;

              return new TableCell({
                width: { size: cIdx === 0 && hasSttCol ? sttColWidth : otherColWidth, type: WidthType.DXA },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                },
                children: [
                  new Paragraph({
                    alignment: align,
                    spacing: { before: 45, after: 45, line: 240 },
                    children: [
                      new TextRun({
                        text: cellText,
                        font: 'Times New Roman',
                        size: 22, // 11pt
                      }),
                    ],
                  }),
                ],
              });
            }),
          })),
        ];

        return new Table({
          width: { size: TOTAL_TABLE_WIDTH_DXA, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
          rows: docxRows,
        });
      }
    }
  } catch (err) {
    console.error('Lỗi phân tích bảng docx:', err);
  }
  return null;
}

/**
 * Xuất file .docx chuẩn thể thức Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW
 * - Khổ giấy: A4 (210 x 297 mm)
 * - Lề: Trên 20mm, Dưới 20mm, Trái 30mm, Phải 15mm (chuẩn NĐ 30)
 * - Font: Times New Roman, Bảng mã Unicode
 * - Cỡ chữ nội dung: 13-14pt (26-28 half-points)
 * - Bố cục header 2 cột ẩn viền
 * - Bố cục footer 2 cột ẩn viền (Nơi nhận & Chữ ký)
 */
export async function exportToDocxBlob(doc: StructuredDoc, settings: AgencySettings): Promise<Blob> {
  const isCongVan = isCongVanDocument(doc);

  // Viền ẩn cho bảng bố cục header và footer
  const hiddenBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  // 1. HEADER CHUẨN THỂ THỨC 16.2CM (CỘT TRÁI 6.5CM = 3685 DXA, CỘT PHẢI 9.7CM = 5499 DXA)
  // Phân chia theo hàng để đảm bảo Ô số 4 (Địa danh, ngày tháng) cùng hàng với Ô số 3 (Số công văn)

  // Khối tên cơ quan ban hành (Ô số 2)
  const agencyParagraphs: Paragraph[] = [];
  const agencyParts = getStandardAgencyHeaderParts(doc.parentAgency, doc.agencyName);
  const agencyNameText = agencyParts.hasLine2 ? agencyParts.line2 : agencyParts.line1;
  const isLongAgency = agencyNameText.length > 28;
  // Kích cỡ tên cơ quan ban hành bình thường để 13 (size 26), chỉ những đơn vị dài mới để xuống 12 (size 24)
  const agencyDocxSize = isLongAgency ? 24 : 26;
  const parentAgencyText = agencyParts.hasLine2 ? agencyParts.line1 : '';

  // Dòng 1: Tên cơ quan cấp trên nếu có (ngang hàng với Quốc ngữ)
  agencyParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 30, line: 240 },
      children: [
        new TextRun({
          text: parentAgencyText,
          font: 'Times New Roman',
          size: 25, // 12.5pt
          bold: false,
        }),
      ],
    })
  );

  // Dòng 2: Tên cơ quan ban hành (bình thường cỡ 13pt, dài để 12pt, ngang hàng với Tiêu ngữ)
  agencyParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 30, line: 240 },
      children: [
        new TextRun({
          text: agencyNameText,
          font: 'Times New Roman',
          size: agencyDocxSize,
          bold: true,
        }),
      ],
    })
  );

  // Dòng 3: Đường kẻ ngang dưới tên cơ quan (độ đậm bằng 100% với tiêu ngữ, cùng ngang 1 hàng)
  agencyParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 60, line: 160 },
      children: [
        new TextRun({
          text: '─────────', // 9 ký tự '─' font size 22, độ đậm bằng 100% với tiêu ngữ
          font: 'Times New Roman',
          size: 22,
          bold: false,
        }),
      ],
    })
  );

  // Khối Số, ký hiệu (Ô số 3)
  const formattedDocCode = formatDocCodeForDisplay(doc.docCode, false);
  const docCodeParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: doc.docSubjectShort ? 40 : 80, line: 240 },
    children: [
      new TextRun({
        text: formattedDocCode,
        font: 'Times New Roman',
        size: 26, // 13pt
      }),
    ],
  });

  // Khối Trích yếu công văn (Ô số 5b - nếu có): Ngay dưới Số, ký hiệu, chữ thường 12-13pt, đứng, không đậm, kết thúc KHÔNG có dấu gạch ngang
  const subjectParagraphs: Paragraph[] = [];
  if (doc.docSubjectShort) {
    let formattedSub = doc.docSubjectShort.trim();
    if (/^Trích yếu:?\s*/i.test(formattedSub)) {
      formattedSub = formattedSub.replace(/^Trích yếu:?\s*/i, '');
    }
    if (/^Về việc\s+/i.test(formattedSub)) {
      formattedSub = formattedSub.replace(/^Về việc\s+/i, 'V/v ');
    } else if (!/^V\/v\s+/i.test(formattedSub)) {
      formattedSub = `V/v ${formattedSub.replace(/^V\/v:?\s*/i, '')}`;
    }

    subjectParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 30, after: 60, line: 240 },
        children: [
          new TextRun({
            text: formattedSub,
            font: 'Times New Roman',
            size: 25, // 12.5pt
            bold: false, // không in đậm
            italics: false, // kiểu chữ đứng
          }),
        ],
      })
    );
  }

  // Khối Quốc hiệu & Tiêu ngữ (Ô số 1)
  const nationalHeaderParagraphs: (Paragraph | Table)[] = [];
  if (!doc.isPartyDoc) {
    // Quốc hiệu: Cỡ 12-13pt (size 26), in hoa, đậm, căn giữa, chỉ trên 1 dòng
    nationalHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30, line: 240 },
        children: [
          new TextRun({
            text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );

    // Tiêu ngữ: Cỡ 13-14pt (size 28), in đậm, căn giữa, chỉ trên 1 dòng
    const mottoText = doc.motto?.trim() || 'Độc lập - Tự do - Hạnh phúc';
    nationalHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30, line: 240 },
        children: [
          new TextRun({
            text: mottoText,
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          }),
        ],
      })
    );

    // NÂNG CẤP DỨT ĐIỂM: Đường kẻ ngang dưới tiêu ngữ có độ dài BẰNG ĐÚNG ĐỘ DÀI CỦA DÒNG CHỮ
    // Độ dài in ấn thực tế của dòng chữ "Độc lập - Tự do - Hạnh phúc" 14pt bold trong Word là đúng 5.3 cm (3000 dxa).
    // Dùng Table con (Nested Table) căn giữa có viền bottom nét đơn 0.75pt (size 6) màu đen chuẩn NĐ 30.
    // Đảm bảo không bị phụ thuộc font glyph '─', không vượt quá và không ngắn hơn trên mọi máy tính.
    const mottoUnderlineTable = new Table({
      alignment: AlignmentType.CENTER,
      width: { size: 3000, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0, line: 20 },
                  children: [],
                }),
              ],
            }),
          ],
        }),
      ],
    });
    nationalHeaderParagraphs.push(mottoUnderlineTable);

    // Khoảng cách sau đường kẻ ngang tiêu ngữ
    nationalHeaderParagraphs.push(
      new Paragraph({
        spacing: { before: 20, after: 40, line: 60 },
        children: [],
      })
    );
  } else {
    // Tiêu đề Đảng theo Hướng dẫn 05-HD/VPTW
    const partyMotto = doc.motto?.trim() || 'ĐẢNG CỘNG SẢN VIỆT NAM';
    nationalHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30, line: 240 },
        children: [
          new TextRun({
            text: partyMotto,
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          }),
        ],
      })
    );

    // Đường dưới tiêu đề Đảng: Dài 1/3 - 1/2 dòng chữ (khoảng 2.6cm ~ 1500 dxa)
    const partyUnderlineTable = new Table({
      alignment: AlignmentType.CENTER,
      width: { size: 1500, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1500, type: WidthType.DXA },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0, line: 20 },
                  children: [],
                }),
              ],
            }),
          ],
        }),
      ],
    });
    nationalHeaderParagraphs.push(partyUnderlineTable);
    nationalHeaderParagraphs.push(
      new Paragraph({
        spacing: { before: 20, after: 40, line: 60 },
        children: [],
      })
    );
  }

  // Khối Địa danh, ngày tháng (Ô số 4): Cỡ 13,5pt (size 27), nghiêng, căn giữa. Cùng 1 dòng với Số công văn
  const targetYear = settings.issuingYear?.trim() || String(new Date().getFullYear());
  const defaultLoc = settings.shortLocation?.trim() || 'Đông Tiến';
  let locPart = defaultLoc;
  if (doc.locationDate) {
    const locMatch = doc.locationDate.match(/^([a-zA-ZÀ-ỹ\s]+?)(?:,\s*|\s+)ngày/i);
    if (locMatch && locMatch[1].trim()) {
      locPart = locMatch[1].trim();
    } else {
      const firstPart = doc.locationDate.split(',')[0]?.trim();
      if (firstPart) locPart = firstPart;
    }
  }
  const cleanLocationDate = doc.locationDate && /\d{1,2}/.test(doc.locationDate.replace(targetYear, ''))
    ? doc.locationDate
    : `${locPart}, ngày\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0tháng\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0năm ${targetYear}`;

  const locationDateParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 80, line: 240 },
    children: [
      new TextRun({
        text: cleanLocationDate,
        font: 'Times New Roman',
        size: 27, // 13.5pt
        italics: true,
      }),
    ],
  });

  // Bảng Header 2 cột tổng chiều dài 16.2cm (9185 dxa):
  // Cột trái: 6.5 cm = 3685 dxa
  // Cột phải: 9.7 cm = 5500 dxa
  // NẾU LÀ CÔNG VĂN: GỌI MODULE_CONG_VAN CHUYÊN TRÁCH ĐỂ ĐẢM BẢO TRÍCH YẾU NẰM ĐÚNG Ô BÊN TRÁI DƯỚI SỐ KÝ HIỆU
  const headerTableRows: TableRow[] = isCongVan
    ? buildCongVanDocxHeaderRows(
        doc,
        settings,
        { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle },
        { getStandardAgencyHeaderParts, formatDocCodeForDisplay, getAutoAdjustedMottoLine }
      )
    : [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3685, type: WidthType.DXA },
              borders: hiddenBorders,
              children: agencyParagraphs,
            }),
            new TableCell({
              width: { size: 5500, type: WidthType.DXA },
              borders: hiddenBorders,
              children: nationalHeaderParagraphs,
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3685, type: WidthType.DXA },
              borders: hiddenBorders,
              children: [docCodeParagraph],
            }),
            new TableCell({
              width: { size: 5500, type: WidthType.DXA },
              borders: hiddenBorders,
              children: [locationDateParagraph],
            }),
          ],
        }),
      ];

  if (!isCongVan && doc.docTypeName !== 'QUYẾT ĐỊNH' && subjectParagraphs.length > 0) {
    headerTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3685, type: WidthType.DXA },
            borders: hiddenBorders,
            children: subjectParagraphs,
          }),
          new TableCell({
            width: { size: 5500, type: WidthType.DXA },
            borders: hiddenBorders,
            children: [new Paragraph({ children: [] })],
          }),
        ],
      })
    );
  }

  const headerTable = new Table({
    width: { size: 9185, type: WidthType.DXA },
    borders: hiddenBorders,
    rows: headerTableRows,
  });

  // 3. TÊN LOẠI VĂN BẢN VÀ TRÍCH YẾU (nếu không phải công văn thông thường)
  const titleParagraphs: Paragraph[] = [];
  if (!isCongVan && doc.docTypeName) {
    if (doc.docTypeName === 'QUYẾT ĐỊNH') {
      // Tên loại “QUYẾT ĐỊNH”: In hoa, cỡ 13–14 (14pt = size 28), đứng, đậm, canh giữa
      titleParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 60, line: 240 },
          children: [
            new TextRun({
              text: 'QUYẾT ĐỊNH',
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: true,
            }),
          ],
        })
      );

      // Trích yếu (“Về việc …”): In thường, cỡ 13–14, đứng, đậm, canh giữa, có đường kẻ ngang dưới dài 1/3–1/2 dòng chữ
      if (doc.docTitle) {
        titleParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40, line: 240 },
            children: [
              new TextRun({
                text: doc.docTitle,
                font: 'Times New Roman',
                size: 28, // 14pt
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 120, line: 160 },
            children: [
              new TextRun({
                text: '─────────', // 9 gạch tương ứng 1/3-1/2 dòng chữ
                font: 'Times New Roman',
                size: 20,
                bold: false,
              }),
            ],
          })
        );
      }

      // Thẩm quyền ban hành: Chức danh người ra quyết định, in hoa, đậm, canh giữa, đặt dưới trích yếu, Cỡ 13–14
      if (doc.issuingAuthority) {
        titleParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 160, line: 240 },
            children: [
              new TextRun({
                text: doc.issuingAuthority.toUpperCase(),
                font: 'Times New Roman',
                size: 28, // 14pt
                bold: true,
              }),
            ],
          })
        );
      }
    } else {
      titleParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 80, line: 240 },
          children: [
            new TextRun({
              text: doc.docTypeName.toUpperCase(),
              font: 'Times New Roman',
              size: 30, // 15pt
              bold: true,
            }),
          ],
        })
      );

      if (doc.docTitle) {
        titleParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 200, line: 240 },
            children: [
              new TextRun({
                text: doc.docTitle,
                font: 'Times New Roman',
                size: 28, // 14pt
                bold: true,
              }),
            ],
          })
        );
      }
    }
  }

  // 4. KÍNH GỬI (cho Công văn, Tờ trình, Giấy mời...)
  // NGUYÊN TẮC VÀNG 2: Báo cáo & Quyết định KHÔNG CÓ phần Kính gửi theo chuẩn Nghị định 30/2020/NĐ-CP
  const isReportOrDecision = doc.docTypeName === 'BÁO CÁO' || doc.docTypeName?.startsWith('BÁO CÁO') || doc.docTypeName === 'QUYẾT ĐỊNH';
  const recipientParagraphs: (Paragraph | Table)[] = [];
  if (!isReportOrDecision && doc.recipientsHeader && doc.recipientsHeader.trim()) {
    const rawLines = doc.recipientsHeader
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const cleanedItems = rawLines.map(l => {
      let item = l.replace(/^Kính\s*(?:gửi|trình):?\s*/i, '').trim();
      item = item.replace(/^[-\u2013\u2014\*\+•●○■◆]\s*/, '').replace(/[;\.]+$/, '').trim();
      return item;
    }).filter(Boolean);

    if (cleanedItems.length === 1) {
      // Gửi một nơi: Đặt trên 1 hàng, TUYỆT ĐỐI KHÔNG có dấu gạch (-)
      recipientParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { left: 1757 }, // 3.1cm (bắt đầu từ ở giữa của cột trái 6.2cm)
          spacing: { before: 180, after: 180, line: 300 },
          children: [
            new TextRun({
              text: `Kính gửi: ${cleanedItems[0]}.`,
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: false, // In thường, đứng, không đậm
              italics: false,
            }),
          ],
        })
      );
    } else if (cleanedItems.length > 1) {

      const recipientRows: Paragraph[] = cleanedItems.map((item, idx) => {
        const isLast = idx === cleanedItems.length - 1;
        return new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 20, after: 30, line: 280 },
          children: [
            new TextRun({
              text: `- ${item}${isLast ? '.' : ';'}`,
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: false, // In thường, đứng, không đậm
              italics: false,
            }),
          ],
        });
      });

      recipientParagraphs.push(
        new Table({
          indent: { size: 1757, type: WidthType.DXA }, // 3.1cm
          borders: hiddenBorders,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 1250, type: WidthType.DXA },
                  borders: hiddenBorders,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      spacing: { before: 20, after: 30, line: 280 },
                      children: [
                        new TextRun({
                          text: 'Kính gửi:',
                          font: 'Times New Roman',
                          size: 28, // 14pt
                          bold: false, // In thường, đứng, không đậm
                          italics: false,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 6064, type: WidthType.DXA },
                  borders: hiddenBorders,
                  children: recipientRows,
                }),
              ],
            }),
          ],
        })
      );
    }

    // Cách phần kính gửi 1 dòng trước khi vào nội dung công văn
    recipientParagraphs.push(
      new Paragraph({
        spacing: { before: 140, after: 40, line: 240 },
        children: [new TextRun({ text: '', font: 'Times New Roman', size: 28 })],
      })
    );
  }

  // 5. CĂN CỨ PHÁP LÝ (nếu có)
  const legalBaseParagraphs: Paragraph[] = [];
  for (const base of doc.legalBases) {
    legalBaseParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 567 },
        spacing: { before: 60, after: 80, line: 320 },
        children: [
          new TextRun({
            text: base,
            font: 'Times New Roman',
            size: 26, // 13pt
            italics: true,
          }),
        ],
      })
    );
  }

  // 6. NỘI DUNG VĂN BẢN (HỖ TRỢ BẢNG BIỂU, PHẦN, MỤC, KHOẢN, ĐIỂM CHUẨN NGHỊ ĐỊNH 30)
  const bodyElements: (Paragraph | Table)[] = [];
  for (const p of doc.bodyParagraphs) {
    const cleanP = p.replace(/[\*_~`#]/g, '').trim();
    if (!cleanP) continue;

    // 0. BẢNG BIỂU (HTML Table hoặc Markdown Table)
    if (cleanP.includes('<table') || cleanP.includes('___TABLE_BLOCK_') || (cleanP.includes('|') && cleanP.split('\n').filter(l => l.trim().startsWith('|')).length >= 2)) {
      const docxTable = convertTableToDocxTable(cleanP);
      if (docxTable) {
        bodyElements.push(new Paragraph({ spacing: { before: 140 } }));
        bodyElements.push(docxTable);
        bodyElements.push(new Paragraph({ spacing: { after: 140 } }));
        continue;
      }
    }

    // A. Chỉ thị hành động chính (QUYẾT ĐỊNH:, QUYẾT NGHỊ:, CHỈ THỊ:, KẾT LUẬN:, YÊU CẦU:)
    if (/^(QUYẾT ĐỊNH|QUYẾT NGHỊ|CHỈ THỊ|KẾT LUẬN|YÊU CẦU|CÔNG NHẬN|PHÊ CHUẨN|CHUẨN Y)\s*[:\.]?$/i.test(cleanP)) {
      const cmdName = cleanP.replace(/[:\.\s]+$/, '').toUpperCase();
      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 180, line: 300 },
          children: [
            new TextRun({
              text: `${cmdName}:`,
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: true,
            }),
          ],
        })
      );
      continue;
    }

    // B.1. Tiêu đề Phần (Ví dụ: "Phần I", "Phần thứ nhất")
    // Từ “Phần” và số thứ tự: In thường 13 - 14 Đứng, đậm: Ví dụ: Phần I
    // Tiêu đề của phần: In hoa 13 - 14 Đứng, đậm: Ví dụ: TÌNH HÌNH THỰC HIỆN NHIỆM VỤ ...
    const partMatch = cleanP.match(/^(Phần\s+(?:[IVXLCDM\d]+|thứ\s+[a-zA-ZÀ-ỹ\d]+))[\.:]?\s*(.*)$/i);
    if (partMatch) {
      const partLabel = partMatch[1];
      const partTitle = partMatch[2]?.trim();
      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: partTitle ? 60 : 160, line: 300 },
          children: [
            new TextRun({
              text: partLabel,
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: true,
            }),
          ],
        })
      );
      if (partTitle) {
        bodyElements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 180, line: 300 },
            children: [
              new TextRun({
                text: partTitle.toUpperCase(),
                font: 'Times New Roman',
                size: 28, // 14pt
                bold: true,
              }),
            ],
          })
        );
      }
      continue;
    }

    // B.2. Tiêu đề Chương (CHƯƠNG I, CHƯƠNG II...)
    const chapterMatch = cleanP.match(/^(Chương\s+[IVXLCDM\d]+)[\.:]?\s*(.*)$/i);
    if (chapterMatch) {
      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 60, line: 300 },
          children: [
            new TextRun({
              text: chapterMatch[1].toUpperCase(),
              font: 'Times New Roman',
              size: 28,
              bold: true,
            }),
          ],
        })
      );
      if (chapterMatch[2]?.trim()) {
        bodyElements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 160, line: 300 },
            children: [
              new TextRun({
                text: chapterMatch[2].trim().toUpperCase(),
                font: 'Times New Roman',
                size: 28,
                bold: true,
              }),
            ],
          })
        );
      }
      continue;
    }

    // B.3. Số thứ tự và tiêu đề của mục: In hoa 13 - 14 Đứng, đậm Ví dụ: I. NHỮNG KẾT QUẢ... hoặc Mục I...
    const romanMatch = cleanP.match(/^([IVXLCDM]+\.)(?:\s+(.*))?$/);
    const mucWordMatch = cleanP.match(/^(Mục\s+[IVXLCDM\d]+)[\.:]?\s*(.*)$/i);
    if (romanMatch || mucWordMatch) {
      const fullMucText = cleanP.toUpperCase();
      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 567 },
          spacing: { before: 180, after: 80, line: 320 },
          children: [
            new TextRun({
              text: fullMucText,
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: true,
            }),
          ],
        })
      );
      continue;
    }

    // C. Tiêu đề Điều khoản (Điều 1., Điều 2...)
    // - Trường hợp có tiêu đề: Thường 13 - 14 Đứng, in đậm Ví dụ: Điều 1. Phạm vi và đối tượng áp dụng
    // - Trường hợp không có tiêu đề: Thường 13 - 14 Đứng Ví dụ: Điều 1. Quyết định này có hiệu lực thi hành kể từ ngày…
    const articleMatch = cleanP.match(/^(Điều\s+\d+)[\.:]?\s*(.*)$/i);
    if (articleMatch) {
      const artLabel = `${articleMatch[1]}.`;
      const rest = articleMatch[2]?.trim() || '';
      const headingInfo = detectNumberedHeading(rest);

      const runs: TextRun[] = [];
      if (headingInfo.hasTitle) {
        runs.push(
          new TextRun({
            text: `${artLabel} ${headingInfo.title} `,
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          })
        );
        if (headingInfo.content) {
          runs.push(
            new TextRun({
              text: headingInfo.content,
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: false,
            })
          );
        }
      } else {
        runs.push(
          new TextRun({
            text: `${artLabel} `,
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          }),
          new TextRun({
            text: rest,
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: false,
          })
        );
      }

      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 567 },
          spacing: { before: 120, after: 100, line: 320 },
          children: runs,
        })
      );
      continue;
    }

    // D. Khoản (1., 2., 3... hoặc 1.1., 1.2...)
    // - Trường hợp có tiêu đề: Thường 13 - 14 Đứng, in đậm Ví dụ: 1. Phạm vi và đối tượng áp dụng
    // - Trường hợp không có tiêu đề: Thường 13 - 14 Đứng (không đậm) Ví dụ: 1. Quyết định này có hiệu lực thi hành kể từ ngày…
    const numBulletMatch = cleanP.match(/^(\d+(?:\.\d+)*\.)(?:\s+(.*))?$/);
    if (numBulletMatch) {
      const numPrefix = numBulletMatch[1];
      const rest = (numBulletMatch[2] || '').trim();
      const headingInfo = detectNumberedHeading(rest);

      const runs: TextRun[] = [];
      if (headingInfo.hasTitle) {
        // Trường hợp có tiêu đề: In thường 13 - 14 Đứng, đậm
        runs.push(
          new TextRun({
            text: `${numPrefix} ${headingInfo.title} `,
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          })
        );
        if (headingInfo.content) {
          runs.push(
            new TextRun({
              text: headingInfo.content,
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: false,
            })
          );
        }
      } else {
        // Trường hợp KHÔNG có tiêu đề: In thường 13 - 14 Đứng (KHÔNG ĐẬM)
        runs.push(
          new TextRun({
            text: `${numPrefix} ${rest}`.trim(),
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: false,
          })
        );
      }

      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 567 },
          spacing: { before: 80, after: 80, line: 320 },
          children: runs,
        })
      );
      continue;
    }

    // D.2. Điểm (a), b), c)...): Thường 13 - 14 Đứng Ví dụ: a) Đối với ...
    const letterMatch = cleanP.match(/^([a-zđ]\))(?:\s+(.*))?$/i);
    if (letterMatch) {
      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 567 }, // Thống nhất thụt lề 1cm chuẩn NĐ 30
          spacing: { before: 60, after: 60, line: 320 },
          children: [
            new TextRun({
              text: cleanP,
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: false, // In thường, đứng, không đậm
            }),
          ],
        })
      );
      continue;
    }

    // E. Thống nhất tất cả các bullet (-, +, *, •, ●, ○) có khoảng cách thụt lề bằng nhau (1cm = 567 dxa)
    // Không phân chia -/+ thụt lề nhiều hơn, tất cả bullet thụt lề bằng nhau chuẩn Nghị định 30
    if (/^[\-\+\*•●○■◆❖✓►➢]\s*/.test(cleanP)) {
      const unifiedBulletText = cleanP.replace(/^[\-\+\*•●○■◆❖✓►➢]\s*/, '- ');
      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 567 }, // Thống nhất tất cả các bullet có khoảng cách thụt lề bằng nhau (1cm)
          spacing: { before: 60, after: 60, line: 320 },
          children: [
            new TextRun({
              text: unifiedBulletText,
              font: 'Times New Roman',
              size: 28,
            }),
          ],
        })
      );
      continue;
    }

    // F. Đoạn văn thông thường
    bodyElements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 567 },
        spacing: { before: 80, after: 100, line: 320 },
        children: [
          new TextRun({
            text: cleanP,
            font: 'Times New Roman',
            size: 28, // 14pt
          }),
        ],
      })
    );
  }

  // 7. CỘT TRÁI FOOTER: Nơi nhận
  const leftFooterParagraphs: Paragraph[] = [];
  if (doc.recipients && doc.recipients.length > 0) {
    leftFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 100, after: 60, line: 240 },
        children: [
          new TextRun({
            text: 'Nơi nhận:',
            font: 'Times New Roman',
            size: 24, // 12pt
            bold: true,
            italics: true,
          }),
        ],
      })
    );

    const safeRecs = cleanAndDeduplicateRecipients(doc.recipients || [], {
      quyenHanKy: doc.quyenHanKy,
      signerAuthority: doc.signerAuthority,
      signerTitle: doc.signerTitle,
      signerName: doc.signerName,
    }, true);

    for (let idx = 0; idx < safeRecs.length; idx++) {
      const r = safeRecs[idx];
      const cleanR = r.trim();
      if (!cleanR) continue;
      const isLast = idx === safeRecs.length - 1;
      const withoutPunct = cleanR.replace(/[;\.]+$/, '').trim();
      const rWithDash = withoutPunct.startsWith('-') ? withoutPunct : `- ${withoutPunct.replace(/^[-\u2013\u2014]\s*/, '')}`;
      const formattedLine = `${rWithDash}${isLast ? '.' : ';'}`;
      leftFooterParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 20, after: 40, line: 220 },
          children: [
            new TextRun({
              text: formattedLine,
              font: 'Times New Roman',
              size: 22, // 11pt
            }),
          ],
        })
      );
    }
  } else {
    leftFooterParagraphs.push(
      new Paragraph({
        children: [],
      })
    );
  }

  // 8. CỘT PHẢI FOOTER: Quyền hạn, chức vụ, chữ ký, họ tên
  // Tách rõ ràng chuẩn Nghị định 30 & HD 05:
  // - Dòng 1: Quyền hạn ký + Chức vụ người ký (ví dụ: KT. CHỦ TỊCH \n PHÓ CHỦ TỊCH, hoặc TM. UBND \n CHỦ TỊCH, hoặc CHỦ TỊCH)
  // - Khoảng trống ký tên rộng rãi (720 dxa = 36pt ~ 5 dòng trống cho ký tay/ký số)
  // - Dòng 2: Họ và tên người ký (in đậm 14pt)
  const rightFooterParagraphs: Paragraph[] = [];
  const auth = (doc.signerAuthority || doc.quyenHanKy || '').trim().toUpperCase();
  const role2 = (doc.signerRoleLine2 || '').trim().toUpperCase();
  const title = (doc.signerTitle || '').trim().toUpperCase();

  // Trường hợp 1: Có 3 dòng vai trò ký (Thay mặt tập thể + Ký thay / vai trò cấp trên + Chức vụ người ký trực tiếp)
  // Ví dụ: TM. ỦY BAN NHÂN DÂN / KT. CHỦ TỊCH / PHÓ CHỦ TỊCH
  // Hoặc: TM. BAN THƯỜNG VỤ / KT. BÍ THƯ / PHÓ BÍ THƯ
  // Hoặc: TM. BAN CHẤP HÀNH / T/M BAN THƯỜNG VỤ / BÍ THƯ
  if (role2 && auth && title) {
    rightFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 25, line: 240 },
        children: [
          new TextRun({
            text: auth,
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 25, line: 240 },
        children: [
          new TextRun({
            text: role2,
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 80, line: 240 },
        children: [
          new TextRun({
            text: title,
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );
  } else if (auth === 'KT. CHỦ TỊCH' || doc.quyenHanKy === 'KT. CHỦ TỊCH') {
    rightFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 40, line: 240 },
        children: [
          new TextRun({
            text: 'KT. CHỦ TỊCH',
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 80, line: 240 },
        children: [
          new TextRun({
            text: title || 'PHÓ CHỦ TỊCH',
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );
  } else if (doc.quyenHanKy === 'Q.' || auth.startsWith('Q.')) {
    rightFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80, line: 240 },
        children: [
          new TextRun({
            text: auth || 'Q. CHỦ TỊCH',
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );
  } else if (auth && title && auth === title) {
    // Tránh trùng lặp 2 dòng cùng một chức danh (ví dụ cùng là CHỦ TỊCH)
    rightFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80, line: 240 },
        children: [
          new TextRun({
            text: title,
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );
  } else if (auth && title) {
    rightFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 40, line: 240 },
        children: [
          new TextRun({
            text: auth,
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 80, line: 240 },
        children: [
          new TextRun({
            text: title,
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );
  } else if (auth || title) {
    rightFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80, line: 240 },
        children: [
          new TextRun({
            text: auth || title,
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );
  }

  // Cách thêm dòng giãn cách tiêu chuẩn ngay dưới chức danh/quyền ký hiệu (+ thêm 1 dòng khoảng cách giữa chức danh và tên người ký)
  rightFooterParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({
          text: '',
          font: 'Times New Roman',
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        new TextRun({
          text: '',
          font: 'Times New Roman',
          size: 26,
        }),
      ],
    })
  );

  // Khoảng trống ký tên & Họ tên (rộng rãi để ký tay hoặc ký số theo chuẩn NĐ 30: 840 dxa ~ 6 dòng trống)
  rightFooterParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 840, after: 60, line: 240 },
      children: [
        new TextRun({
          text: doc.signerName || '',
          font: 'Times New Roman',
          size: 28, // 14pt in đậm
          bold: true,
        }),
      ],
    })
  );

  // Bảng Footer 2 cột
  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: hiddenBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: hiddenBorders,
            children: leftFooterParagraphs,
          }),
          new TableCell({
            width: { size: 52, type: WidthType.PERCENTAGE },
            borders: hiddenBorders,
            children: rightFooterParagraphs,
          }),
        ],
      }),
    ],
  });

  // 7. PHẦN PHỤ LỤC (NẾU CÓ - DÙNG NGẮT TRANG SANG TRANG A4 MỚI)
  const appendixElements: (Paragraph | Table)[] = [];
  if (doc.appendices && doc.appendices.length > 0) {
    doc.appendices.forEach((app, idx) => {
      // Dòng 1 ngắt trang sang trang riêng (pageBreakBefore: true)
      appendixElements.push(
        new Paragraph({
          pageBreakBefore: true,
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 80, line: 240 },
          children: [
            new TextRun({
              text: (app.header || `PHỤ LỤC ${idx + 1}`).toUpperCase(),
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: true,
            }),
          ],
        })
      );

      // Dòng 2: Tên Phụ Lục (nếu có)
      if (app.title) {
        appendixElements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80, line: 240 },
            children: [
              new TextRun({
                text: app.title.replace(/^-\s*/, '').toUpperCase(),
                font: 'Times New Roman',
                size: 26, // 13pt
                bold: true,
              }),
            ],
          })
        );
      }

      // Dòng 3: Ghi chú Ban hành kèm theo... (nếu có)
      if (app.referenceNote) {
        appendixElements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180, line: 240 },
            children: [
              new TextRun({
                text: app.referenceNote.replace(/^-\s*/, ''),
                font: 'Times New Roman',
                size: 24, // 12pt
                italics: true,
              }),
            ],
          })
        );
      }

      // Nội dung và Bảng biểu Phụ lục (Tự động chuyển đổi sang bảng Word chuẩn)
      for (const p of app.paragraphs) {
        const cleanP = p.replace(/[\*_~`#]/g, '').trim();
        if (!cleanP) continue;

        // Kiểm tra bảng HTML hoặc bảng Markdown trong phụ lục
        if (cleanP.includes('<table') || cleanP.includes('___TABLE_BLOCK_') || (cleanP.includes('|') && cleanP.split('\n').filter(l => l.includes('|')).length >= 2)) {
          const docxTable = convertTableToDocxTable(cleanP);
          if (docxTable) {
            appendixElements.push(new Paragraph({ spacing: { before: 120 } }));
            appendixElements.push(docxTable);
            appendixElements.push(new Paragraph({ spacing: { after: 120 } }));
            continue;
          }
        }

        // Đoạn văn phụ lục thông thường
        appendixElements.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 567 }, // 1cm
            spacing: { after: 120, line: 240 },
            children: [
              new TextRun({
                text: cleanP,
                font: 'Times New Roman',
                size: 26, // 13pt
              }),
            ],
          })
        );
      }
    });
  }

  // Tạo toàn bộ document (Tự động điền số trang theo chuẩn Nghị định 30 & HD 05)
  // - Vị trí: Ở giữa theo chiều ngang của lề trên trang văn bản
  // - Phông chữ: Times New Roman, cỡ 13-14pt (size 28), chữ đứng, chữ số Ả Rập
  // - Trang 1 không ghi số trang, tự động đánh số từ trang thứ 2 trở đi
  const wordDocument = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 120, line: 240 },
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Times New Roman',
                    size: 28, // 14pt chuẩn NĐ 30
                  }),
                ],
              }),
            ],
          }),
          first: new Header({
            children: [
              new Paragraph({
                children: [], // Trang 1 không hiển thị số trang theo Nghị định 30
              }),
            ],
          }),
        },
        properties: {
          page: {
            size: {
              width: 11906, // A4: 210mm
              height: 16838, // A4: 297mm
            },
            margin: {
              top: 1134, // 20mm
              bottom: 1134, // 20mm
              left: 1701, // 30mm
              right: 1020, // 18mm (Nghị định 30: lề phải 15-20mm; trái 30mm + phải 18mm => chiều rộng văn bản đúng 16.2cm)
            },
            pageNumbers: {
              start: 1,
            },
          },
          titlePage: true, // Trang 1 sử dụng first header (trống), từ trang 2 trở đi đánh số trang ở giữa lề trên
        },
        children: [
          headerTable,
          new Paragraph({ spacing: { after: 120 } }),
          ...titleParagraphs,
          ...recipientParagraphs,
          ...legalBaseParagraphs,
          ...bodyElements,
          new Paragraph({ spacing: { before: 240, after: 120 } }),
          footerTable,
          ...appendixElements,
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(wordDocument);
  return buffer;
}
