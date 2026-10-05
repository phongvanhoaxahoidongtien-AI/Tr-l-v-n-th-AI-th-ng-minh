import { AgencySettings } from '../types';
import { convertMarkdownTableToHtml, formatHtmlTableToFitA4 } from '../utils/cleanAIText';

export interface StructuredDoc {
  isPartyDoc: boolean;
  parentAgency: string;
  agencyName: string;
  docCode: string;
  docSubjectShort: string; // V/v ...
  countryHeader: string;
  motto: string;
  locationDate: string;
  docTypeName: string; // QUYẾT ĐỊNH, CÔNG VĂN, TỜ TRÌNH, NGHỊ QUYẾT...
  docTitle: string; // Về việc ...
  recipientsHeader: string; // Kính gửi (không cần chữ 'Kính gửi:', các dòng cách nhau bằng xuống dòng, bắt đầu bằng -)
  legalBases: string[];
  bodyParagraphs: string[];
  recipients: string[]; // Nơi nhận (các dòng cách nhau bằng xuống dòng, tự động bắt đầu bằng -)
  signerAuthority: string; // TM. ỦY BAN NHÂN DÂN / T/M CHI BỘ / T/M BAN THƯỜNG VỤ
  signerTitle: string; // CHỦ TỊCH / BÍ THƯ
  signerName: string;
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
      // Tự động thêm '- ' nếu chưa có
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
 * Phân tích văn bản text thô thành cấu trúc các thành phần thể thức NĐ 30 & HD 05
 * Đảm bảo: Nếu là loại văn bản hành chính theo NĐ 30 (công văn, tờ trình, quyết định...) 
 * thì Quốc hiệu & Tiêu ngữ PHẢI LUÔN LÀ "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" / "Độc lập - Tự do - Hạnh phúc"!
 * Đồng thời tự động xóa bỏ hoàn toàn tiêu đề quốc ngữ nhập vào khỏi phần nội dung thân văn bản.
 */
export function parseDocumentStructure(
  text: string, 
  settings: AgencySettings, 
  docCategory?: string,
  docTypeNameHint?: string
): StructuredDoc {
  // Loại bỏ các ký tự Markdown thừa nếu có (ngoại trừ bảng biểu | )
  const cleanInput = text.replace(/[\*_~`#]/g, '');
  const rawLines = cleanInput.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Xác định rõ ràng loại hình văn bản:
  // 1. Nếu docCategory hoặc docTypeNameHint là văn bản hành chính theo NĐ 30 -> 100% là văn bản Nhà nước, KHÔNG PHẢI VĂN BẢN ĐẢNG!
  // 2. Nếu docCategory là 'dang' hoặc Hướng dẫn 05-HD/VPTW hoặc docTypeNameHint chứa từ 'Đảng' -> Văn bản Đảng
  const isExplicitPartyCategory = docCategory === 'dang' || docCategory === 'Hướng dẫn 05-HD/VPTW' || (Boolean(docTypeNameHint) && /Đảng|Chi bộ|Đảng ủy|cấp ủy/i.test(docTypeNameHint!));
  const isExplicitAdminCategory = docCategory === 'hanh_chinh' || (Boolean(docCategory) && /30|nghị định 30|hành chính|hanh_chinh/i.test(docCategory!)) ||
    (Boolean(docTypeNameHint) && /Công văn|Tờ trình|Quyết định|Nghị quyết|Chỉ thị|Quy chế|Quy định|Thông cáo|Thông báo|Hướng dẫn|Chương trình|Kế hoạch|Phương án|Đề án|Dự án|Báo cáo|Biên bản|Hợp đồng|Công điện|Bản ghi nhớ|Bản thỏa thuận|Giấy ủy quyền|Giấy mời|Giấy giới thiệu|Giấy nghỉ phép|Phiếu gửi|Phiếu chuyển|Phiếu báo|Thư công/i.test(docTypeNameHint!) && !/Đảng/i.test(docTypeNameHint!));

  let isPartyDoc = false;
  if (isExplicitPartyCategory) {
    isPartyDoc = true;
  } else if (isExplicitAdminCategory) {
    isPartyDoc = false;
  } else {
    // Chỉ coi là văn bản Đảng nếu 3 dòng đầu CÓ "ĐẢNG CỘNG SẢN VIỆT NAM" VÀ hoàn toàn không có "CỘNG HÒA"
    const firstLines = rawLines.slice(0, 3).join('\n');
    isPartyDoc = /ĐẢNG CỘNG SẢN VIỆT NAM/i.test(firstLines) && !/CỘNG HÒA/i.test(text);
  }

  let parentAgency = '';
  let agencyName = '';
  let docCode = '';
  let docSubjectShort = '';
  let countryHeader = isPartyDoc ? '' : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  let motto = isPartyDoc ? 'ĐẢNG CỘNG SẢN VIỆT NAM' : 'Độc lập - Tự do - Hạnh phúc';
  let locationDate = '';
  let docTypeName = docTypeNameHint ? docTypeNameHint.toUpperCase() : '';
  let docTitle = '';
  const recipientsHeaderLines: string[] = [];
  const legalBases: string[] = [];
  const bodyParagraphs: string[] = [];
  const recipients: string[] = [];
  let signerAuthority = '';
  let signerTitle = '';
  let signerName = '';

  let inRecipientsHeader = false;
  let inRecipients = false;
  let inSignBlock = false;

  // Lọc bỏ các dòng phân cách hoa thị (*, ***, ---) đơn thuần
  const lines = rawLines.filter(l => !/^[*\-–—_]{1,5}$/.test(l));

  // 1. Quét phần đầu văn bản (Header lines)
  const headerLines: string[] = [];
  let bodyStartIndex = 0;

  for (let i = 0; i < Math.min(16, lines.length); i++) {
    const l = lines[i];

    // Nhận diện Số ký hiệu
    if (/^Số:\s*[\d\w\-\/\.…]*/i.test(l)) {
      docCode = l;
      continue;
    }

    // Nhận diện Địa danh ngày tháng
    const dateMatch = l.match(/^([a-zA-ZÀ-ỹ\s]+),\s*ngày\s+[\d\w\s.…]+tháng\s+[\d\w\s.…]+năm\s+[\d\w.…]+/i);
    if (dateMatch) {
      locationDate = l;
      continue;
    }

    // Nhận diện Quốc hiệu & Tiêu ngữ Nhà nước (bỏ qua không đưa vào headerLines)
    if (/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(l)) {
      countryHeader = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
      isPartyDoc = false;
      continue;
    }
    if (/Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc/i.test(l)) {
      motto = 'Độc lập - Tự do - Hạnh phúc';
      isPartyDoc = false;
      continue;
    }

    // Nhận diện Tiêu đề văn bản Đảng (CHỈ ÁP DỤNG KHI LÀ VĂN BẢN ĐẢNG, KHÔNG ÁP DỤNG CHO VĂN BẢN HÀNH CHÍNH)
    if (/ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/i.test(l)) {
      if (isPartyDoc) {
        motto = 'ĐẢNG CỘNG SẢN VIỆT NAM';
        countryHeader = '';
      }
      continue;
    }

    // Nhận diện trích yếu công văn (V/v ...)
    if (/^V\/v\s+/i.test(l)) {
      docSubjectShort = l;
      if (!docTypeName) {
        docTypeName = 'CÔNG VĂN';
      }
      continue;
    }

    // Nếu gặp Tên loại văn bản đầu tiên thì phần Header kết thúc
    const typeMatch = l.match(/^(QUYẾT ĐỊNH|TỜ TRÌNH|NGHỊ QUYẾT|THÔNG BÁO|KẾ HOẠCH|BÁO CÁO|GIẤY MỜI|GIẤY GIỚI THIỆU|BIÊN BẢN|HỢP ĐỒNG|CHỈ THỊ|QUY CHẾ|QUY ĐỊNH|HƯỚNG DẪN|CHƯƠNG TRÌNH|PHƯƠNG ÁN|ĐỀ ÁN|DỰ ÁN|BẢN GHI NHỚ|GIẤY ỦY QUYỀN|PHIẾU CHUYỂN|PHIẾU BÁO|THƯ CÔNG)$/i);
    if (typeMatch && !docTypeName) {
      docTypeName = typeMatch[1].toUpperCase();
      bodyStartIndex = i + 1;
      break;
    }

    // Bỏ qua các dòng kẻ phân cách
    if (/^[*\-–—_]{3,}$/.test(l)) {
      continue;
    }

    headerLines.push(l);
  }

  // Phân tích cơ quan cấp trên và cơ quan ban hành từ headerLines
  if (headerLines.length >= 2) {
    parentAgency = headerLines[0];
    agencyName = headerLines[1];
  } else if (headerLines.length === 1) {
    agencyName = headerLines[0];
  }

  // Fallbacks từ Settings nếu chưa có
  if (!parentAgency && settings.parentAgency && !isPartyDoc) {
    parentAgency = settings.parentAgency;
  }
  if (!agencyName) {
    agencyName = settings.agencyName || (isPartyDoc ? 'CHI BỘ TỔ DÂN PHỐ BẢN NGUYÊN' : 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN');
  }
  if (!docCode) {
    docCode = isPartyDoc ? 'Số: ……-QĐ/CB' : 'Số: 45/UBND-VP';
  }
  if (!locationDate) {
    const loc = settings.shortLocation || 'Bản Nguyên';
    locationDate = `${loc}, ngày ${String(new Date().getDate()).padStart(2, '0')} tháng ${String(new Date().getMonth() + 1).padStart(2, '0')} năm ${new Date().getFullYear()}`;
  }

  // 2. Quét phần Thân văn bản, Nơi nhận và Chữ ký
  for (let i = bodyStartIndex; i < lines.length; i++) {
    const l = lines[i];

    // XÓA BỎ VĨNH VIỄN TIÊU ĐỀ QUỐC NGỮ NẾU LỌT VÀO PHẦN THÂN VĂN BẢN
    if (/CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(l) ||
        /Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc/i.test(l) ||
        /ĐẢNG\s+CỘNG\s+SẢN\s+VIỆT\s+NAM/i.test(l) ||
        /^[*\-–—_]{3,}$/.test(l)) {
      continue;
    }

    // Tiêu đề trích yếu (Về việc...)
    if (/^Về việc\s+/i.test(l) && docTypeName && !docTitle) {
      docTitle = l;
      continue;
    }

    // Kính gửi (Công văn, Tờ trình, Báo cáo, Giấy mời...)
    if (/^Kính gửi:?/i.test(l)) {
      inRecipientsHeader = true;
      const stripped = l.replace(/^Kính gửi:?\s*/i, '').trim();
      if (stripped) {
        recipientsHeaderLines.push(stripped.startsWith('-') ? stripped : `- ${stripped}`);
      }
      continue;
    }

    // Nếu đang trong block Kính gửi (các dòng gạch đầu dòng hoặc kết thúc bằng chấm phẩy)
    if (inRecipientsHeader) {
      if (/^[-\u2013\u2014]\s+/.test(l) || (l.endsWith(';') && !l.startsWith('Căn cứ') && !l.startsWith('Điều'))) {
        const item = l.replace(/^[-\u2013\u2014]\s*/, '- ');
        recipientsHeaderLines.push(item);
        continue;
      } else {
        inRecipientsHeader = false;
      }
    }

    // Căn cứ pháp lý
    if (/^Căn cứ\s+/i.test(l)) {
      legalBases.push(l);
      continue;
    }

    // Nhận diện Nơi nhận
    if (/^Nơi nhận:?/i.test(l)) {
      inRecipients = true;
      inSignBlock = false;
      const stripped = l.replace(/^Nơi nhận:?\s*/i, '').trim();
      if (stripped) {
        recipients.push(stripped.startsWith('-') ? stripped : `- ${stripped}`);
      }
      continue;
    }

    // Khi đang trong block Nơi nhận
    if (inRecipients) {
      // Kiểm tra xem đã chuyển sang phần ký chưa (T/M, TM., KT., BÍ THƯ, CHỦ TỊCH...)
      if (/^(T\/M|TM\.|KT\.|CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH|QUYỀN CHỦ TỊCH)/i.test(l)) {
        inRecipients = false;
        inSignBlock = true;
      } else {
        // Dòng cơ quan nhận: Tự động đảm bảo bắt đầu bằng dấu gạch ngang (-)
        const formattedRecipient = l.startsWith('-') ? l : `- ${l}`;
        recipients.push(formattedRecipient);
        continue;
      }
    }

    // Khi đang trong block Chữ ký
    if (inSignBlock || /^(T\/M|TM\.|KT\.|CHỦ TỊCH|BÍ THƯ)/i.test(l)) {
      if (/^(T\/M|TM\.|KT\.)/i.test(l)) {
        signerAuthority = l;
        continue;
      }
      if (/^(CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH|GIÁM ĐỐC|TRƯỞNG PHÒNG)/i.test(l)) {
        signerTitle = l;
        continue;
      }
      // Dòng tên người ký
      if (/^[A-ZÀ-Ỹ][a-zà-ỹ]+(\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4}$/.test(l) || /^[A-ZÀ-Ỹ\s]{3,30}$/.test(l)) {
        signerName = l;
        continue;
      }
    }

    // Nội dung văn bản thông thường
    bodyParagraphs.push(l);
  }

  // Xử lý mặc định cho Nơi nhận nếu rỗng
  if (recipients.length === 0) {
    if (isPartyDoc) {
      recipients.push('- Đảng ủy phường Đông Tiến (báo cáo);');
      recipients.push('- Chi ủy Chi bộ;');
      recipients.push('- Các đồng chí đảng viên Chi bộ;');
      recipients.push('- Lưu Chi bộ.');
    } else {
      recipients.push('- Như trên;');
      recipients.push('- Chủ tịch, các PCT UBND;');
      recipients.push('- Lưu: VT, VP.');
    }
  }

  // Xử lý mặc định cho Chữ ký & Người ký
  if (!signerAuthority) {
    signerAuthority = isPartyDoc ? 'T/M CHI BỘ' : 'TM. ỦY BAN NHÂN DÂN';
  }
  if (!signerTitle) {
    signerTitle = isPartyDoc ? 'BÍ THƯ' : (settings.signerTitle || 'CHỦ TỊCH');
  }
  if (!signerName) {
    signerName = settings.signerName || 'Lê Thế Điệp';
  }

  // Chuỗi Kính gửi kết quả
  const recipientsHeader = recipientsHeaderLines.join('\n');

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
    recipients,
    signerAuthority,
    signerTitle,
    signerName
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
  text: string, 
  settings: AgencySettings, 
  docCategory?: string,
  docTypeNameHint?: string
): string {
  const doc = parseDocumentStructure(text, settings, docCategory, docTypeNameHint);
  const isCongVan = doc.docTypeName === 'CÔNG VĂN' || (!doc.docTypeName && Boolean(doc.docSubjectShort));

  // Chuẩn bị danh sách Kính gửi (nếu có)
  const recipientHeaderItems = doc.recipientsHeader
    ? doc.recipientsHeader.split('\n').map(l => l.trim()).filter(Boolean)
    : [];

  return `
    <div class="a4-document-page font-times text-slate-950 bg-white" style="font-family: 'Times New Roman', Times, 'Tinos', serif; font-size: 14pt; line-height: 1.5; color: #000;">
      
      <!-- BẢNG BỐ CỤC ĐẦU VĂN BẢN (2 CỘT ẨN VIỀN CHUẨN NĐ 30 & HD 05) -->
      <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 14pt; font-family: 'Times New Roman', Times, serif;">
        <tr>
          <!-- Cột 1: Cơ quan ban hành & Số ký hiệu -->
          <td style="width: 45%; vertical-align: top; text-align: center; padding: 0 10pt 0 0; border: none;">
            ${doc.parentAgency ? `
              <div style="font-size: 12pt; text-transform: uppercase; font-weight: normal; margin-bottom: 2pt; letter-spacing: -0.1px; font-family: 'Times New Roman', serif;">
                ${doc.parentAgency}
              </div>
            ` : ''}
            
            <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif;">
              ${doc.agencyName}
            </div>
            
            <!-- Đường kẻ ngang dưới tên cơ quan (1/3 đến 1/2 độ dài) -->
            <div style="width: 45%; margin: 3pt auto 4pt auto; border-bottom: 1.2pt solid #000;"></div>
            
            <div style="font-size: 13pt; margin-top: 5pt; font-weight: normal; font-family: 'Times New Roman', serif;">
              ${doc.docCode}
            </div>

            ${doc.docSubjectShort ? `
              <div style="font-size: 12pt; font-style: italic; margin-top: 4pt; line-height: 1.3; font-family: 'Times New Roman', serif;">
                ${doc.docSubjectShort}
              </div>
            ` : ''}
          </td>

          <!-- Cột 2: Quốc hiệu & Tiêu ngữ HOẶC Tiêu đề Đảng -->
          <td style="width: 55%; vertical-align: top; text-align: center; padding: 0 0 0 10pt; border: none;">
            ${!doc.isPartyDoc ? `
              <div style="font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: -0.2px; font-family: 'Times New Roman', serif;">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div style="font-size: 13pt; font-weight: bold; margin-top: 2pt; font-family: 'Times New Roman', serif;">
                Độc lập - Tự do - Hạnh phúc
              </div>
              <!-- Đường kẻ ngang dưới Tiêu ngữ (bằng đúng độ dài dòng chữ) -->
              <div style="width: 82%; margin: 3pt auto 4pt auto; border-bottom: 1.2pt solid #000;"></div>
            ` : `
              <div style="font-size: 13pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; font-family: 'Times New Roman', serif;">
                ĐẢNG CỘNG SẢN VIỆT NAM
              </div>
              <!-- Nét gạch nhỏ dưới tiêu đề Đảng theo HD 05 -->
              <div style="width: 45%; margin: 4pt auto 5pt auto; border-bottom: 1.2pt solid #000;"></div>
            `}

            <div style="font-size: 13pt; font-style: italic; margin-top: 5pt; font-family: 'Times New Roman', serif;">
              ${doc.locationDate}
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

      <!-- KÍNH GỬI (ĐÃ MẶC ĐỊNH SẴN KÍNH GỬI, CÁC DÒNG CÓ GẠCH ĐẦU DÒNG -) -->
      ${recipientHeaderItems.length > 0 ? `
        <div style="margin: 12pt 0 10pt 0; font-family: 'Times New Roman', serif;">
          ${recipientHeaderItems.length === 1 && !recipientHeaderItems[0].startsWith('-') ? `
            <div style="text-indent: 1cm; font-size: 14pt; text-align: left;">
              <strong>Kính gửi:</strong> ${recipientHeaderItems[0]}
            </div>
          ` : `
            <div style="text-indent: 1cm; font-size: 14pt; text-align: left; font-weight: bold; margin-bottom: 3pt;">
              Kính gửi:
            </div>
            ${recipientHeaderItems.map(item => `
              <div style="text-indent: 1.5cm; font-size: 14pt; text-align: left; margin-bottom: 2pt;">
                ${item.startsWith('-') ? item : `- ${item}`}
              </div>
            `).join('')}
          `}
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

          // 6. Khoản (1., 2., 3...)
          if (/^\d+\.\s+/.test(cleanP)) {
            return `
              <p style="text-align: justify; margin-bottom: 5pt; text-indent: 1cm; font-family: 'Times New Roman', serif;">
                ${cleanP}
              </p>
            `;
          }

          // 7. Điểm (a), b), c)...)
          if (/^[a-zđ]\)\s+/i.test(cleanP)) {
            return `
              <p style="text-align: justify; margin-bottom: 4pt; text-indent: 1.25cm; font-family: 'Times New Roman', serif;">
                ${cleanP}
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
          <!-- Cột 1: Nơi nhận (Mặc định có Nơi nhận:, các dòng tự động bắt đầu bằng -) -->
          <td style="width: 48%; vertical-align: top; padding: 0 10pt 0 0; border: none;">
            <div style="font-size: 12pt; font-weight: bold; font-style: italic; margin-bottom: 3pt; font-family: 'Times New Roman', serif;">
              Nơi nhận:
            </div>
            <div style="font-size: 11pt; line-height: 1.35; font-family: 'Times New Roman', serif;">
              ${doc.recipients.map(r => `
                <div style="margin-bottom: 1.5pt;">${r.startsWith('-') ? r : `- ${r}`}</div>
              `).join('')}
            </div>
          </td>

          <!-- Cột 2: Quyền hạn, chức vụ & chữ ký -->
          <td style="width: 52%; vertical-align: top; text-align: center; padding: 0 0 0 10pt; border: none;">
            <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman', serif;">
              ${doc.signerAuthority}
            </div>
            <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt; font-family: 'Times New Roman', serif;">
              ${doc.signerTitle}
            </div>
            
            <!-- Khoảng trống ký tên & đóng dấu -->
            <div style="height: 55pt; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 10pt; color: #94a3b8; font-style: italic; font-family: 'Times New Roman', serif;">
                (Ký, ghi rõ họ tên / Ký số)
              </span>
            </div>

            <div style="font-size: 14pt; font-weight: bold; margin-top: 4pt; font-family: 'Times New Roman', serif;">
              ${doc.signerName}
            </div>
          </td>
        </tr>
      </table>

    </div>
  `;
}

/**
 * Chuyển đổi structured doc thành định dạng text chuẩn hóa
 */
export function reconstructNormalizedText(doc: StructuredDoc): string {
  const parts: string[] = [];

  if (doc.parentAgency) parts.push(doc.parentAgency);
  parts.push(doc.agencyName);
  parts.push(doc.docCode);
  if (doc.docSubjectShort) parts.push(doc.docSubjectShort);
  parts.push('');

  if (!doc.isPartyDoc) {
    parts.push('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    parts.push('Độc lập - Tự do - Hạnh phúc');
  } else {
    parts.push('ĐẢNG CỘNG SẢN VIỆT NAM');
  }
  parts.push(doc.locationDate);
  parts.push('');

  const isCongVan = doc.docTypeName === 'CÔNG VĂN' || (!doc.docTypeName && Boolean(doc.docSubjectShort));

  if (!isCongVan && doc.docTypeName) {
    parts.push(doc.docTypeName);
    if (doc.docTitle) parts.push(doc.docTitle);
    parts.push('');
  }

  // Kính gửi (nếu có)
  if (doc.recipientsHeader && doc.recipientsHeader.trim()) {
    const kLines = doc.recipientsHeader.split('\n').map(l => l.trim()).filter(Boolean);
    if (kLines.length === 1 && !kLines[0].startsWith('-')) {
      parts.push(`Kính gửi: ${kLines[0]}`);
    } else {
      parts.push('Kính gửi:');
      kLines.forEach(l => parts.push(l.startsWith('-') ? l : `- ${l}`));
    }
    parts.push('');
  }

  if (doc.legalBases.length > 0) {
    doc.legalBases.forEach(b => parts.push(b));
    parts.push('');
  }

  doc.bodyParagraphs.forEach(p => parts.push(p));
  parts.push('');

  parts.push('Nơi nhận:');
  doc.recipients.forEach(r => parts.push(r.startsWith('-') ? r : `- ${r}`));
  parts.push('');

  parts.push(doc.signerAuthority);
  parts.push(doc.signerTitle);
  parts.push('(Ký, ghi rõ họ tên)');
  parts.push(doc.signerName);

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
          margin: 2.0cm 2.0cm 2.0cm 3.0cm; /* Trên 2cm, Dưới 2cm, Phải 2cm, Trái 3cm chuẩn NĐ 30 */
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
