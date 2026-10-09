import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, BorderStyle, HeadingLevel, UnderlineType 
} from 'docx';
import { StructuredDoc } from './decree30Formatter';
import { AgencySettings } from '../types';

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
  const isCongVan = doc.docTypeName === 'CÔNG VĂN' || (!doc.docTypeName && Boolean(doc.docSubjectShort));

  // Viền ẩn cho bảng bố cục header và footer
  const hiddenBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  // 1. CỘT TRÁI HEADER: Tên cơ quan, số ký hiệu, trích yếu V/v (nếu là công văn)
  const leftHeaderParagraphs: Paragraph[] = [];
  if (doc.parentAgency) {
    leftHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40, line: 240 },
        children: [
          new TextRun({
            text: doc.parentAgency.toUpperCase(),
            font: 'Times New Roman',
            size: 24, // 12pt
          }),
        ],
      })
    );
  }

  leftHeaderParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 240 },
      children: [
        new TextRun({
          text: doc.agencyName.toUpperCase(),
          font: 'Times New Roman',
          size: 24, // 12pt
          bold: true,
        }),
      ],
    })
  );

  // Đường kẻ ngang dưới tên cơ quan
  leftHeaderParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80, line: 240 },
      children: [
        new TextRun({
          text: '————————',
          font: 'Times New Roman',
          size: 20,
        }),
      ],
    })
  );

  leftHeaderParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: doc.docSubjectShort ? 40 : 100, line: 240 },
      children: [
        new TextRun({
          text: doc.docCode || 'Số: …/…',
          font: 'Times New Roman',
          size: 26, // 13pt
        }),
      ],
    })
  );

  if (doc.docSubjectShort) {
    leftHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100, line: 240 },
        children: [
          new TextRun({
            text: doc.docSubjectShort,
            font: 'Times New Roman',
            size: 24, // 12pt
            italics: true,
          }),
        ],
      })
    );
  }

  // 2. CỘT PHẢI HEADER: Quốc hiệu & Tiêu ngữ HOẶC Tiêu đề Đảng, Địa danh ngày tháng
  const rightHeaderParagraphs: Paragraph[] = [];
  if (!doc.isPartyDoc) {
    rightHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40, line: 240 },
        children: [
          new TextRun({
            text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
            font: 'Times New Roman',
            size: 24, // 12pt
            bold: true,
          }),
        ],
      })
    );

    rightHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60, line: 240 },
        children: [
          new TextRun({
            text: 'Độc lập - Tự do - Hạnh phúc',
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );

    // Đường kẻ ngang dưới Tiêu ngữ
    rightHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80, line: 240 },
        children: [
          new TextRun({
            text: '————————————',
            font: 'Times New Roman',
            size: 20,
            bold: true,
          }),
        ],
      })
    );
  } else {
    // Văn bản Đảng
    rightHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60, line: 240 },
        children: [
          new TextRun({
            text: 'ĐẢNG CỘNG SẢN VIỆT NAM',
            font: 'Times New Roman',
            size: 28, // 14-15pt
            bold: true,
          }),
        ],
      })
    );

    rightHeaderParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80, line: 240 },
        children: [
          new TextRun({
            text: '—————',
            font: 'Times New Roman',
            size: 20,
          }),
        ],
      })
    );
  }

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
  const cleanLocationDate = `${locPart}, ngày\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0tháng\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0năm ${targetYear}`;

  rightHeaderParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100, line: 240 },
      children: [
        new TextRun({
          text: cleanLocationDate,
          font: 'Times New Roman',
          size: 26, // 13pt
          italics: true,
        }),
      ],
    })
  );

  // Bảng Header 2 cột
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: hiddenBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: hiddenBorders,
            children: leftHeaderParagraphs,
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: hiddenBorders,
            children: rightHeaderParagraphs,
          }),
        ],
      }),
    ],
  });

  // 3. TÊN LOẠI VĂN BẢN VÀ TRÍCH YẾU (nếu không phải công văn thông thường)
  const titleParagraphs: Paragraph[] = [];
  if (!isCongVan && doc.docTypeName) {
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

  // 4. KÍNH GỬI (cho Công văn, Tờ trình, Báo cáo, Giấy mời...)
  const recipientParagraphs: Paragraph[] = [];
  if (doc.recipientsHeader && doc.recipientsHeader.trim()) {
    const kLines = doc.recipientsHeader.split('\n').map(l => l.trim()).filter(Boolean);
    if (kLines.length === 1 && !kLines[0].startsWith('-')) {
      recipientParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { firstLine: 567 }, // Thụt lề 1cm
          spacing: { before: 160, after: 120, line: 300 },
          children: [
            new TextRun({
              text: 'Kính gửi: ',
              font: 'Times New Roman',
              size: 28, // 14pt
              bold: true,
            }),
            new TextRun({
              text: kLines[0],
              font: 'Times New Roman',
              size: 28,
            }),
          ],
        })
      );
    } else {
      recipientParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { firstLine: 567 },
          spacing: { before: 160, after: 60, line: 300 },
          children: [
            new TextRun({
              text: 'Kính gửi:',
              font: 'Times New Roman',
              size: 28,
              bold: true,
            }),
          ],
        })
      );

      for (const line of kLines) {
        const item = line.startsWith('-') ? line : `- ${line}`;
        recipientParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            indent: { left: 850 }, // Thụt lề 1.5cm
            spacing: { before: 40, after: 60, line: 300 },
            children: [
              new TextRun({
                text: item,
                font: 'Times New Roman',
                size: 28,
              }),
            ],
          })
        );
      }
    }
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

  // 6. NỘI DUNG VĂN BẢN
  const bodyParagraphs: Paragraph[] = [];
  for (const p of doc.bodyParagraphs) {
    const cleanP = p.replace(/[\*_~`#]/g, '').trim();
    if (!cleanP) continue;

    // A. Chỉ thị hành động chính (QUYẾT ĐỊNH:, QUYẾT NGHỊ:, CHỈ THỊ:, KẾT LUẬN:, YÊU CẦU:)
    if (/^(QUYẾT ĐỊNH|QUYẾT NGHỊ|CHỈ THỊ|KẾT LUẬN|YÊU CẦU|CÔNG NHẬN|PHÊ CHUẨN|CHUẨN Y)\s*[:\.]?$/i.test(cleanP)) {
      const cmdName = cleanP.replace(/[:\.\s]+$/, '').toUpperCase();
      bodyParagraphs.push(
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

    // B. Tiêu đề Chương (CHƯƠNG I, CHƯƠNG II...)
    const chapterMatch = cleanP.match(/^(Chương\s+[IVXLCDM\d]+)[\.:]?\s*(.*)$/i);
    if (chapterMatch) {
      bodyParagraphs.push(
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
        bodyParagraphs.push(
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

    // C. Tiêu đề Điều khoản (Điều 1., Điều 2...)
    const articleMatch = cleanP.match(/^(Điều\s+\d+)[\.:]?\s*(.*)$/i);
    if (articleMatch) {
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 567 },
          spacing: { before: 120, after: 100, line: 320 },
          children: [
            new TextRun({
              text: `${articleMatch[1]}. `,
              font: 'Times New Roman',
              size: 28,
              bold: true,
            }),
            new TextRun({
              text: articleMatch[2]?.trim() || '',
              font: 'Times New Roman',
              size: 28,
            }),
          ],
        })
      );
      continue;
    }

    // D. Khoản (1., 2., 3...)
    if (/^\d+\.\s+/.test(cleanP)) {
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 567 },
          spacing: { before: 80, after: 80, line: 320 },
          children: [
            new TextRun({
              text: cleanP,
              font: 'Times New Roman',
              size: 28,
            }),
          ],
        })
      );
      continue;
    }

    // E. Gạch đầu dòng (-)
    if (/^-\s+/.test(cleanP)) {
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 850 },
          spacing: { before: 60, after: 60, line: 320 },
          children: [
            new TextRun({
              text: cleanP,
              font: 'Times New Roman',
              size: 28,
            }),
          ],
        })
      );
      continue;
    }

    // F. Đoạn văn thông thường
    bodyParagraphs.push(
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

    for (const r of doc.recipients) {
      const formatted = r.startsWith('-') ? r : `- ${r}`;
      leftFooterParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 20, after: 40, line: 220 },
          children: [
            new TextRun({
              text: formatted,
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
  const rightFooterParagraphs: Paragraph[] = [];

  if (doc.quyenHanKy === 'KT. CHỦ TỊCH' || doc.signerAuthority === 'KT. CHỦ TỊCH') {
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
            text: (doc.signerTitle || 'PHÓ CHỦ TỊCH').toUpperCase(),
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );
  } else if (doc.quyenHanKy === 'Q.' || doc.signerAuthority.startsWith('Q.')) {
    rightFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80, line: 240 },
        children: [
          new TextRun({
            text: (doc.signerAuthority || 'Q. CHỦ TỊCH').toUpperCase(),
            font: 'Times New Roman',
            size: 26, // 13pt
            bold: true,
          }),
        ],
      })
    );
  } else if (doc.signerAuthority || doc.signerTitle || doc.quyenHanKy) {
    if (doc.signerAuthority || doc.quyenHanKy) {
      rightFooterParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 40, line: 240 },
          children: [
            new TextRun({
              text: (doc.signerAuthority || doc.quyenHanKy || '').toUpperCase(),
              font: 'Times New Roman',
              size: 26, // 13pt
              bold: true,
            }),
          ],
        })
      );
    }
    if (doc.signerTitle) {
      rightFooterParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 80, line: 240 },
          children: [
            new TextRun({
              text: doc.signerTitle.toUpperCase(),
              font: 'Times New Roman',
              size: 26, // 13pt
              bold: true,
            }),
          ],
        })
      );
    }
  }

  // Khoảng trống ký tên & Họ tên (chỉ xuất nếu có tên người ký)
  if (doc.signerName && doc.signerName.trim()) {
    rightFooterParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 60, line: 240 },
        children: [
          new TextRun({
            text: doc.signerName,
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          }),
        ],
      })
    );
  }

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

      // Nội dung và Bảng biểu Phụ lục
      for (const p of app.paragraphs) {
        const cleanP = p.replace(/[\*_~`#]/g, '').trim();
        // Kiểm tra bảng Markdown
        if (cleanP.includes('|') && cleanP.split('\n').filter(l => l.includes('|')).length >= 2) {
          const tableLines = cleanP.split('\n').filter(l => l.trim().startsWith('|'));
          if (tableLines.length >= 2) {
            const parseRow = (line: string) => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
            const headerCells = parseRow(tableLines[0]);
            const dataRows = tableLines.slice(2).map(parseRow);
            
            const docxRows: TableRow[] = [
              new TableRow({
                tableHeader: true,
                children: headerCells.map(cellText => new TableCell({
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 60, after: 60 },
                      children: [
                        new TextRun({
                          text: cellText,
                          font: 'Times New Roman',
                          size: 22, // 11pt
                          bold: true,
                        }),
                      ],
                    }),
                  ],
                })),
              }),
              ...dataRows.map(rowCells => new TableRow({
                children: rowCells.map(cellText => new TableCell({
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  },
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      children: [
                        new TextRun({
                          text: cellText,
                          font: 'Times New Roman',
                          size: 22, // 11pt
                        }),
                      ],
                    }),
                  ],
                })),
              })),
            ];

            appendixElements.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: docxRows,
              })
            );
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

  // Tạo toàn bộ document
  const wordDocument = new Document({
    sections: [
      {
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
              right: 850, // 15mm
            },
          },
        },
        children: [
          headerTable,
          new Paragraph({ spacing: { after: 120 } }),
          ...titleParagraphs,
          ...recipientParagraphs,
          ...legalBaseParagraphs,
          ...bodyParagraphs,
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
