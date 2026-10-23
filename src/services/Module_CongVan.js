/**
 * ============================================================================
 * MODULE_CONG_VAN.JS - TRỢ LÝ VĂN THƯ THÔNG MINH 1.0 (TIỂU BẢO BỐI)
 * Module độc lập chuyên trách chuẩn hóa & xử lý riêng cho CÔNG VĂN HÀNH CHÍNH
 * Căn cứ: Nghị định số 30/2020/NĐ-CP của Chính phủ về công tác văn thư
 * ============================================================================
 * 
 * NGUYÊN TẮC VÀNG CHO CÔNG VĂN:
 * 1. Bố cục Header tổng 16cm (hoặc 16.2cm):
 *    - Cột trái: 6.5 cm (3685 dxa)
 *      + Ô số 2: Tên cơ quan chủ quản (nếu có) và Tên cơ quan ban hành (in hoa, đậm, có gạch 1/3-1/2)
 *      + Ô số 3: Số và ký hiệu văn bản (vd: Số:      /UBND-VHXH, để trắng 1cm không dùng ...)
 *      + Ô số 5b (TRÍCH YẾU CÔNG VĂN): NẰM Ở Ô BÊN TRÁI, DÒNG DƯỚI SỐ KÝ HIỆU VĂN BẢN!
 *        Chữ thường, cỡ 12-13pt, kiểu chữ đứng, không in đậm, canh giữa trong cột 6.5cm,
 *        bắt đầu bằng "V/v", kết thúc KHÔNG có dấu gạch ngang.
 *    - Cột phải: 9.5 cm - 9.7 cm (5500 dxa)
 *      + Ô số 1: Quốc hiệu (CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM) & Tiêu ngữ (Độc lập - Tự do - Hạnh phúc)
 *      + Ô số 4: Địa danh, ngày ... tháng ... năm ... (ngang hàng với Ô số 3)
 * 2. CÔNG VĂN KHÔNG CÓ TÊN LOẠI VĂN BẢN Ở GIỮA TRANG:
 *    Tuyệt đối không render chữ "CÔNG VĂN" hay tiêu đề ở giữa trang như Quyết định hay Báo cáo.
 * 3. Kính gửi (Ô số 6):
 *    Nằm ngay dưới khối đầu văn bản, bắt đầu từ khoảng giữa cột trái (~3.1cm - 3.25cm).
 */

/**
 * Thông số kỹ thuật chuẩn Nghị định 30/2020/NĐ-CP cho Công văn
 */
export const CONG_VAN_SPECS = {
  TOTAL_WIDTH_CM: 16.2,
  LEFT_COL_WIDTH_CM: 6.5,     // Ô số 2 (cơ quan), Ô số 3 (số ký hiệu), Ô số 5b (trích yếu)
  RIGHT_COL_WIDTH_CM: 9.7,    // Ô số 1 (quốc hiệu, tiêu ngữ), Ô số 4 (địa danh ngày tháng)
  LEFT_COL_DXA: 3685,
  RIGHT_COL_DXA: 5500,
  TOTAL_DXA: 9185,
  FONT_FAMILY: "Times New Roman",
  SUBJECT_FONT_SIZE_PT: 12.5, // 12 - 13pt
  SUBJECT_FONT_SIZE_HALF_PT: 25, // 25 half-pts cho docx
};

/**
 * Nhận diện tài liệu có phải là Công văn hay không
 * @param {any} doc 
 * @param {any} [selectedType] 
 * @param {string} [hint] 
 * @returns {boolean}
 */
export function isCongVanDocument(doc, selectedType, hint) {
  if (!doc) return false;
  if (selectedType && (selectedType.id === 'cong-van' || selectedType.name === 'Công văn')) {
    return true;
  }
  const typeName = (doc.docTypeName || hint || '').trim().toUpperCase();
  if (typeName === 'CÔNG VĂN' || typeName === 'CONG VAN') {
    return true;
  }
  if (!typeName && Boolean(doc.docSubjectShort)) {
    return true;
  }
  // Nếu có trích yếu dạng V/v nhưng không có tên loại văn bản có tên loại (như QUYẾT ĐỊNH, BÁO CÁO, KẾ HOẠCH...)
  const knownTypedDocs = /^(?:QUYẾT\s+ĐỊNH|BÁO\s+CÁO|KẾ\s+HOẠCH|TỜ\s+TRÌNH|THÔNG\s+BÁO|NGHỊ\s+QUYẾT|CHỈ\s+THỊ|QUY\s+CHẾ|QUY\s+ĐỊNH|BIÊN\s+BẢN|HỢP\s+ĐỒNG|GIẤY\s+MỜI|GIẤY\s+GIỚI\s+THIỆU)\b/i;
  if (!knownTypedDocs.test(typeName) && (Boolean(doc.docSubjectShort) || /^V\/v\s+/i.test(doc.docTitle || ''))) {
    return true;
  }
  return false;
}

/**
 * Chuẩn hóa trích yếu nội dung công văn (Ô số 5b):
 * - Bắt đầu bằng "V/v "
 * - Chữ thường, cỡ 12-13, kiểu chữ đứng, không in đậm
 * - Kết thúc KHÔNG có dấu gạch ngang (theo NĐ 30/2020/NĐ-CP Phụ lục I mục 5b)
 * @param {string} rawSubject 
 * @returns {string}
 */
export function formatCongVanSubject(rawSubject) {
  if (!rawSubject) return '';
  let cleaned = rawSubject.trim();

  // 1. Loại bỏ các cặp dấu ngoặc bao quanh nếu có: (V/v ...) hoặc [V/v ...]
  cleaned = cleaned.replace(/^[\(\[\{]\s*/, '').replace(/[\)\]\}]\s*$/, '').trim();

  // 2. Loại bỏ các tiền tố thừa như "Trích yếu:", "Nội dung:", "Tiêu đề:"
  cleaned = cleaned.replace(/^(?:Trích\s*yếu(?:\s*nội\s*dung)?|Nội\s*dung|Tiêu\s*đề)[\s:\.\-–—]*/i, '').trim();

  // 3. Chuẩn hóa toàn bộ biến thể "Về việc", "về việc", "VỀ VIỆC", "v/v", "V/v", "V/V", "V/v:", "V/v." thành "V/v "
  if (/^(?:Về\s+việc|về\s+việc|VỀ\s+VIỆC|V\/v|v\/v|V\/V)[\s:\.\-–—_]*/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(?:Về\s+việc|về\s+việc|VỀ\s+VIỆC|V\/v|v\/v|V\/V)[\s:\.\-–—_]*/i, 'V/v ').trim();
  } else if (!/^V\/v\s+/i.test(cleaned)) {
    cleaned = `V/v ${cleaned.replace(/^V\/v[\s:\.]*/i, '')}`.trim();
  }

  // 4. Đảm bảo chữ "V/v " chuẩn xác ở đầu chuỗi
  if (!cleaned.startsWith('V/v ')) {
    cleaned = `V/v ${cleaned.replace(/^V\/v\s*/i, '')}`.trim();
  }

  // 5. Loại bỏ các dấu gạch ngang, gạch dưới hoặc dấu chấm câu thừa ở cuối (NĐ 30: kết thúc không có dấu gạch ngang)
  cleaned = cleaned.replace(/[\s\-_–—;,\.]+$/, '').trim();

  return cleaned;
}

/**
 * Regex phát hiện dòng bắt đầu của Trích yếu công văn (hỗ trợ mọi biến thể V/v và Về việc)
 */
export const CONG_VAN_SUBJECT_REGEX = /^(?:[\(\[\{]\s*)?(?:V\/v|v\/v|V\/V|Về\s+việc|về\s+việc|VỀ\s+VIỆC|Trích\s+yếu(?:\s+nội\s+dung)?|Nội\s+dung)[\s:\.\-–—_]/i;

/**
 * Trích xuất trích yếu công văn từ các dòng đầu của văn bản (hỗ trợ trích yếu nhiều dòng)
 * và xóa các dòng trích yếu đó khỏi mảng lines
 * @param {string[]} lines Mảng các dòng văn bản
 * @param {number} [maxSearchLines=12] Giới hạn số dòng đầu cần quét
 * @returns {string} Trích yếu đã chuẩn hóa V/v ... hoặc chuỗi rỗng
 */
export function extractCongVanSubjectFromLines(lines, maxSearchLines = 12) {
  if (!lines || lines.length === 0) return '';

  const scanLimit = Math.min(maxSearchLines, lines.length);
  let foundIdx = -1;

  for (let i = 0; i < scanLimit; i++) {
    const l = lines[i]?.trim() || '';
    if (!l) continue;
    // Dừng nếu gặp Kính gửi hoặc căn cứ pháp lý hoặc Điều 1
    if (/^Kính\s*(?:gửi|trình):|^Căn\s+cứ|^Điều\s+\d+/i.test(l)) {
      break;
    }
    if (CONG_VAN_SUBJECT_REGEX.test(l)) {
      foundIdx = i;
      break;
    }
  }

  if (foundIdx === -1) return '';

  // Bắt đầu gom các phần của trích yếu (hỗ trợ trích yếu kéo dài 2-3 dòng)
  const firstLine = lines[foundIdx].trim();
  const subjectParts = [firstLine];
  lines.splice(foundIdx, 1);

  // Đọc tiếp các dòng tiếp theo nếu là phần nối tiếp của trích yếu
  while (foundIdx < lines.length) {
    const nextLine = lines[foundIdx]?.trim() || '';
    if (!nextLine) {
      lines.splice(foundIdx, 1);
      continue;
    }

    // Dừng nếu gặp Kính gửi, Căn cứ, bắt đầu thân bài hoặc phân cấp
    if (/^Kính\s*(?:gửi|trình):|^Căn\s+cứ|^Thực\s+hiện|^UBND|^Ủy\s+ban|^Xét\s+đề\s+nghị|^Điều\s+\d+|^I\.|^1\.|^Phần\s+/i.test(nextLine)) {
      break;
    }

    // Dừng nếu dòng có dấu gạch đầu dòng bullet nơi nhận hoặc câu văn dài
    if (/^[-\u2013\u2014\*\+•●○■◆]\s+/.test(nextLine) || nextLine.length > 130) {
      break;
    }

    // Dòng nối tiếp trích yếu hợp lệ: không kết thúc bằng dấu chấm kết đoạn văn xuôi
    if (subjectParts.length < 3 && !nextLine.endsWith('.')) {
      subjectParts.push(nextLine);
      lines.splice(foundIdx, 1);
    } else {
      break;
    }
  }

  const combined = subjectParts.join(' ').replace(/\s+/g, ' ').trim();
  return formatCongVanSubject(combined);
}

/**
 * Lấy trích yếu công văn từ tài liệu (ưu tiên docSubjectShort, fallback docTitle)
 * @param {any} doc 
 * @returns {string}
 */
export function getCongVanSubject(doc) {
  if (!doc) return '';
  const raw = doc.docSubjectShort || doc.docTitle || '';
  return formatCongVanSubject(raw);
}

/**
 * Render HTML cho khối Trích yếu công văn (Ô số 5b):
 * Đặt ở ô bên trái, dòng dưới số ký hiệu văn bản, canh giữa theo cột 6.5cm
 * @param {string} subjectText 
 * @returns {string}
 */
export function renderCongVanSubjectHtml(subjectText) {
  const formatted = formatCongVanSubject(subjectText);
  if (!formatted) return '';

  return `
    <div class="congvan-subject-block" style="font-size: 12.5pt; font-style: normal; font-weight: normal; line-height: 1.3; font-family: 'Times New Roman', serif; text-align: center; margin-top: 4pt; padding: 0 2pt; word-break: break-word;">
      ${formatted}
    </div>
  `;
}

/**
 * Render trọn vẹn Bảng Header 2 cột cho Công văn (chuẩn 16.2cm):
 * Cột trái (6.5cm): Tên cơ quan (Ô 2) + Số ký hiệu (Ô 3) + Trích yếu công văn (Ô 5b)
 * Cột phải (9.7cm): Quốc hiệu Tiêu ngữ (Ô 1) + Địa danh ngày tháng (Ô 4)
 * @param {any} doc 
 * @param {any} settings 
 * @param {any} helpers { getStandardAgencyHeaderParts, formatDocCodeForDisplay }
 * @returns {string}
 */
export function renderCongVanHeaderTableHtml(doc, settings, helpers) {
  const { getStandardAgencyHeaderParts, formatDocCodeForDisplay } = helpers;
  const agencyParts = getStandardAgencyHeaderParts(doc.parentAgency, doc.agencyName);
  const agencyNameText = agencyParts.hasLine2 ? agencyParts.line2 : agencyParts.line1;
  const isLongAgency = agencyNameText.length > 28;
  const agencyFontSize = isLongAgency ? '12pt' : '13pt';
  const parentAgencyText = agencyParts.hasLine2 ? agencyParts.line1 : '';
  const subjectText = getCongVanSubject(doc);

  const targetYear = settings?.issuingYear || new Date().getFullYear();
  const defaultLoc = settings?.shortLocation || 'Đông Tiến';
  const rawLocDate = doc.locationDate || `${defaultLoc}, ngày      tháng      năm ${targetYear}`;
  const formattedLocDate = rawLocDate
    .replace(/ {2,}/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/[\.…]{2,}/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

  return `
    <table class="congvan-header-table" style="width: 16.2cm; max-width: 100%; border-collapse: collapse; border: none; margin: 0 auto 14pt auto; font-family: 'Times New Roman', Times, serif;">
      <!-- HÀNG 1: CƠ QUAN CẤP TRÊN (TRÁI 6.5CM) & QUỐC HIỆU (PHẢI 9.7CM) -->
      <tr style="vertical-align: top;">
        <td style="width: 6.5cm; max-width: 6.5cm; vertical-align: top; text-align: center; padding: 0 4pt 0 0; border: none;">
          ${parentAgencyText ? `
            <div style="font-size: 12.5pt; text-transform: uppercase; font-weight: normal; letter-spacing: -0.1px; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2pt;">
              ${parentAgencyText}
            </div>
          ` : `
            <div style="font-size: 12.5pt; line-height: 1.25; margin-bottom: 2pt;">&nbsp;</div>
          `}
        </td>

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

      <!-- HÀNG 2: CƠ QUAN BAN HÀNH (TRÁI) & TIÊU NGỮ KÈM ĐƯỜNG KẺ (PHẢI) -->
      <tr style="vertical-align: top;">
        <td style="width: 6.5cm; max-width: 6.5cm; vertical-align: top; text-align: center; padding: 0 4pt 0 0; border: none;">
          <div style="display: inline-block; text-align: center;">
            <div style="font-size: ${agencyFontSize}; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2.5pt;">
              ${agencyNameText}
            </div>
            <!-- Đường kẻ ngang dưới tên cơ quan ban hành: 1/3 đến 1/2 độ dài dòng chữ -->
            <div style="display: block; width: 42%; min-width: 65px; max-width: 90px; border-bottom: 1.2pt solid #000; margin: 0 auto 4pt auto;"></div>
          </div>
        </td>

        <td style="width: 9.7cm; max-width: 9.7cm; vertical-align: top; text-align: center; padding: 0 0 0 4pt; border: none;">
          ${!doc.isPartyDoc ? `
            <div style="display: inline-block; text-align: center; margin: 0 auto;">
              <div style="font-size: 14pt; font-weight: bold; font-family: 'Times New Roman', serif; line-height: 1.25; margin-bottom: 2pt; white-space: nowrap; text-align: center;">
                ${doc.motto?.trim() || 'Độc lập - Tự do - Hạnh phúc'}
              </div>
              <!-- Đường kẻ ngang nét liền, dài đúng 100% bằng độ dài dòng chữ (5.3cm), căn giữa -->
              <table align="center" style="width: 5.3cm; max-width: 5.3cm; margin: 0 auto; border-collapse: collapse; border: none;">
                <tr>
                  <td style="border-bottom: 1.2pt solid #000000; border-top: none; border-left: none; border-right: none; height: 1pt; font-size: 1pt; line-height: 1pt; padding: 0;">
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

      <!-- HÀNG 3: Ô SỐ 3 (SỐ KÝ HIỆU VĂN BẢN) & Ô SỐ 4 (ĐỊA DANH, NGÀY THÁNG NĂM) -->
      <tr style="vertical-align: top;">
        <td style="width: 6.5cm; max-width: 6.5cm; vertical-align: top; text-align: center; padding: 4pt 4pt 0 0; border: none;">
          <!-- Ô số 3: Số, ký hiệu (Cách nhau 1cm, không sử dụng dấu .....) -->
          <div style="font-size: 13pt; font-weight: normal; font-family: 'Times New Roman', serif; text-align: center;">
            ${formatDocCodeForDisplay(doc.docCode, true)}
          </div>
        </td>

        <td style="width: 9.7cm; max-width: 9.7cm; vertical-align: top; text-align: center; padding: 4pt 0 0 4pt; border: none;">
          <!-- Ô số 4: Địa danh, ngày tháng năm (Cỡ 13.5pt, nghiêng, căn giữa) -->
          <div style="font-size: 13.5pt; font-style: italic; font-family: 'Times New Roman', serif; text-align: center;">
            ${formattedLocDate}
          </div>
        </td>
      </tr>

      <!-- HÀNG 4: Ô SỐ 5b (TRÍCH YẾU CÔNG VĂN - NẰM Ở Ô BÊN TRÁI, DÒNG DƯỚI SỐ KÝ HIỆU VĂN BẢN) -->
      <tr style="vertical-align: top;">
        <td style="width: 6.5cm; max-width: 6.5cm; vertical-align: top; text-align: center; padding: 4pt 4pt 0 0; border: none;">
          ${subjectText ? renderCongVanSubjectHtml(subjectText) : `
            <div style="font-size: 12.5pt; font-style: italic; color: #94a3b8; text-align: center; margin-top: 4pt;">
              [V/v trích yếu nội dung công văn]
            </div>
          `}
        </td>
        <td style="width: 9.7cm; max-width: 9.7cm; vertical-align: top; border: none; padding: 0;">
          <!-- Cột phải hàng 4 để trống hoàn toàn -->
          &nbsp;
        </td>
      </tr>
    </table>
  `;
}

/**
 * Xây dựng các TableRow cho file Word .docx chuyên biệt cho Công văn:
 * Đảm bảo trích yếu công văn (Ô số 5b) nằm đúng ở ô bên trái, dòng dưới số ký hiệu văn bản.
 * Cột phải hàng này để trống.
 * @param {any} doc 
 * @param {any} settings 
 * @param {any} docxModule { Paragraph, TextRun, TableRow, TableCell, AlignmentType, WidthType, BorderStyle }
 * @param {any} helpers { getStandardAgencyHeaderParts, formatDocCodeForDisplay, getAutoAdjustedMottoLine }
 * @returns {any[]} Mảng các TableRow
 */
export function buildCongVanDocxHeaderRows(doc, settings, docxModule, helpers) {
  const { Paragraph, TextRun, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } = docxModule;
  const { getStandardAgencyHeaderParts, formatDocCodeForDisplay } = helpers;

  const hiddenBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const agencyParts = getStandardAgencyHeaderParts(doc.parentAgency, doc.agencyName);
  const agencyNameText = agencyParts.hasLine2 ? agencyParts.line2 : agencyParts.line1;
  const isLongAgency = agencyNameText.length > 28;
  const agencyDocxSize = isLongAgency ? 24 : 26; // 12pt hoặc 13pt
  const parentAgencyText = agencyParts.hasLine2 ? agencyParts.line1 : '';

  // 1. Cột trái Row 1: Cơ quan ban hành
  const agencyParagraphs = [
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
    }),
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
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 60, line: 160 },
      children: [
        new TextRun({
          text: '─────────', // 9 gạch tương đương 1/3-1/2 độ dài tên cơ quan
          font: 'Times New Roman',
          size: 22,
          bold: false,
        }),
      ],
    }),
  ];

  // 2. Cột phải Row 1: Quốc hiệu & Tiêu ngữ
  const nationalParagraphs = [];
  if (!doc.isPartyDoc) {
    nationalParagraphs.push(
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
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30, line: 240 },
        children: [
          new TextRun({
            text: doc.motto?.trim() || 'Độc lập - Tự do - Hạnh phúc',
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          }),
        ],
      }),
      // Đường kẻ ngang dưới tiêu ngữ bằng Nested Table căn giữa rộng 3000 dxa (5.3cm)
      new docxModule.Table({
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
      }),
      new Paragraph({
        spacing: { before: 20, after: 40, line: 60 },
        children: [],
      })
    );
  } else {
    nationalParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30, line: 240 },
        children: [
          new TextRun({
            text: doc.motto?.trim() || 'ĐẢNG CỘNG SẢN VIỆT NAM',
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          }),
        ],
      }),
      new docxModule.Table({
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
      }),
      new Paragraph({
        spacing: { before: 20, after: 40, line: 60 },
        children: [],
      })
    );
  }

  // 3. Row 2: Ô số 3 (Số, ký hiệu) & Ô số 4 (Địa danh, ngày tháng)
  const formattedDocCode = formatDocCodeForDisplay(doc.docCode, false);
  const docCodeParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40, line: 240 },
    children: [
      new TextRun({
        text: formattedDocCode,
        font: 'Times New Roman',
        size: 26, // 13pt
      }),
    ],
  });

  const targetYear = settings?.issuingYear?.trim() || String(new Date().getFullYear());
  const defaultLoc = settings?.shortLocation?.trim() || 'Đông Tiến';
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

  // 4. Row 3: TRÍCH YẾU CÔNG VĂN (Ô số 5b - Nằm ở ô bên trái, dòng dưới số ký hiệu văn bản)
  const subjectText = getCongVanSubject(doc);
  const subjectParagraphs = [];
  if (subjectText) {
    subjectParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 30, after: 60, line: 240 },
        children: [
          new TextRun({
            text: subjectText,
            font: 'Times New Roman',
            size: 25, // 12.5pt (chuẩn 12-13pt)
            bold: false, // chữ đứng, không in đậm theo NĐ 30
            italics: false,
          }),
        ],
      })
    );
  }

  const rows = [
    // Row 1: Cơ quan ban hành (trái 3685 dxa) - Quốc hiệu (phải 5500 dxa)
    new TableRow({
      children: [
        new TableCell({
          width: { size: CONG_VAN_SPECS.LEFT_COL_DXA, type: WidthType.DXA },
          borders: hiddenBorders,
          children: agencyParagraphs,
        }),
        new TableCell({
          width: { size: CONG_VAN_SPECS.RIGHT_COL_DXA, type: WidthType.DXA },
          borders: hiddenBorders,
          children: nationalParagraphs,
        }),
      ],
    }),
    // Row 2: Ô số 3 Số ký hiệu (trái) - Ô số 4 Địa danh ngày tháng (phải)
    new TableRow({
      children: [
        new TableCell({
          width: { size: CONG_VAN_SPECS.LEFT_COL_DXA, type: WidthType.DXA },
          borders: hiddenBorders,
          children: [docCodeParagraph],
        }),
        new TableCell({
          width: { size: CONG_VAN_SPECS.RIGHT_COL_DXA, type: WidthType.DXA },
          borders: hiddenBorders,
          children: [locationDateParagraph],
        }),
      ],
    }),
    // Row 3: Ô số 5b Trích yếu công văn (trái) - Cột phải rỗng
    new TableRow({
      children: [
        new TableCell({
          width: { size: CONG_VAN_SPECS.LEFT_COL_DXA, type: WidthType.DXA },
          borders: hiddenBorders,
          children: subjectParagraphs.length > 0 ? subjectParagraphs : [new Paragraph({ children: [] })],
        }),
        new TableCell({
          width: { size: CONG_VAN_SPECS.RIGHT_COL_DXA, type: WidthType.DXA },
          borders: hiddenBorders,
          children: [new Paragraph({ children: [] })],
        }),
      ],
    }),
  ];

  return rows;
}

/**
 * Tái tạo chuỗi chuẩn hóa văn bản riêng cho Công văn:
 * Đảm bảo trích yếu đặt ở vị trí sau số ký hiệu và không chèn dòng "CÔNG VĂN" vào giữa văn bản
 * @param {any} doc 
 * @returns {string}
 */
export function reconstructCongVanNormalizedText(doc) {
  const parts = [];
  if (doc.parentAgency) parts.push(doc.parentAgency);
  if (doc.agencyName) parts.push(doc.agencyName);
  if (doc.docCode) parts.push(doc.docCode);

  const subject = getCongVanSubject(doc);
  if (subject) parts.push(subject);

  if (!doc.isPartyDoc) {
    parts.push(doc.countryHeader || 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    parts.push(doc.motto || 'Độc lập - Tự do - Hạnh phúc');
  } else {
    parts.push(doc.motto || 'ĐẢNG CỘNG SẢN VIỆT NAM');
  }
  if (doc.locationDate) parts.push(doc.locationDate);

  // Kính gửi
  if (doc.recipientsHeader) {
    parts.push(`Kính gửi: ${doc.recipientsHeader.replace(/^Kính\s*gửi:?\s*/i, '')}`);
  }

  // Căn cứ nếu có
  if (doc.legalBases && doc.legalBases.length > 0) {
    parts.push(...doc.legalBases);
  }

  // Thân văn bản
  if (doc.bodyParagraphs && doc.bodyParagraphs.length > 0) {
    parts.push(...doc.bodyParagraphs);
  }

  // Nơi nhận
  if (doc.recipients && doc.recipients.length > 0) {
    parts.push('Nơi nhận:');
    doc.recipients.forEach(r => parts.push(r.startsWith('-') ? r : `- ${r}`));
  }

  // Chữ ký
  const auth = (doc.signerAuthority || doc.quyenHanKy || '').trim();
  const role2 = (doc.signerRoleLine2 || '').trim();
  const title = (doc.signerTitle || '').trim();
  if (auth && role2 && title) {
    parts.push(auth);
    parts.push(role2);
    parts.push(title);
  } else if (auth && title && auth !== title) {
    parts.push(auth);
    parts.push(title);
  } else if (title) {
    parts.push(title);
  } else if (auth) {
    parts.push(auth);
  }
  if (doc.signerName) {
    parts.push(doc.signerName);
  }

  return parts.join('\n\n');
}

export default {
  CONG_VAN_SPECS,
  CONG_VAN_SUBJECT_REGEX,
  isCongVanDocument,
  formatCongVanSubject,
  extractCongVanSubjectFromLines,
  getCongVanSubject,
  renderCongVanSubjectHtml,
  renderCongVanHeaderTableHtml,
  buildCongVanDocxHeaderRows,
  reconstructCongVanNormalizedText
};

