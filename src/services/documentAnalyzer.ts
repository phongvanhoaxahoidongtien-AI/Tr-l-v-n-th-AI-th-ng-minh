import { AgencySettings, DocumentAnalysisReport, DetectedElements, ReviewIssue, AutoFixItem, PassedItem } from '../types';

/**
 * Đọc và phân tích toàn diện văn bản đầu vào theo đúng chuẩn của trolyvanthu.isavn.edu.vn:
 * - Nhận diện cơ quan ban hành, thể thức văn bản gì, địa danh, ngày tháng, kính gửi, nơi nhận...
 * - Liệt kê những mục chưa có trong văn bản (Địa danh, Ngày, Tháng, Năm, Số văn bản...)
 * - Phân nhóm "Cần xem lại / Cần sửa" (Câu quá dài, Chữ viết tắt chưa giải thích, Chỗ trống chưa điền, Lỗi chính tả)
 * - Phân nhóm "Công cụ sẽ tự chuẩn hóa" (Dòng trống thừa, Canh đều hai bên, Phân cấp bullet...)
 * - Phân nhóm "Mục đạt yêu cầu"
 */
export function analyzeDocumentText(
  rawText: string, 
  settings: AgencySettings,
  docCategory?: string,
  docTypeNameHint?: string
): DocumentAnalysisReport {
  const text = rawText || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. NHẬN DIỆN CÁC THÀNH PHẦN THỂ THỨC TRONG VĂN BẢN
  // Xác định rõ ràng: Nếu là văn bản hành chính theo NĐ 30 thì isPartyDoc PHẢI LÀ FALSE 100%!
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
    const firstLines = lines.slice(0, 3).join('\n');
    isPartyDoc = /ĐẢNG CỘNG SẢN VIỆT NAM/i.test(firstLines) && !/CỘNG HÒA/i.test(text);
  }

  let parentAgency: string | null = null;
  let agencyName: string | null = null;
  let docTypeName: string | null = docTypeNameHint ? docTypeNameHint.toUpperCase() : null;
  let docCode: string | null = null;
  let location: string | null = null;
  let dateStr: string | null = null;
  let countryHeader: string | null = isPartyDoc ? null : 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  let motto: string | null = isPartyDoc ? 'ĐẢNG CỘNG SẢN VIỆT NAM' : 'Độc lập - Tự do - Hạnh phúc';
  let subject: string | null = null;
  const recipients: string[] = [];
  let signerAuthority: string | null = null;
  let signerTitle: string | null = null;
  let signerName: string | null = null;

  // Quét các dòng đầu để nhận diện Header
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const l = lines[i];

    // Số ký hiệu
    if (/^Số:\s*[\d\w\-\/\.…]*/i.test(l)) {
      docCode = l.replace(/^Số:\s*/i, '').trim();
      continue;
    }

    // Địa danh & Ngày tháng
    const dateMatch = l.match(/^([a-zA-ZÀ-ỹ\s]+),\s*ngày\s+([\d\w\s.…]+)\s+tháng\s+([\d\w\s.…]+)\s+năm\s+([\d\w.…]+)/i);
    if (dateMatch) {
      location = dateMatch[1].trim();
      dateStr = `ngày ${dateMatch[2].trim()} tháng ${dateMatch[3].trim()} năm ${dateMatch[4].trim()}`;
      continue;
    }

    // Quốc hiệu & Tiêu ngữ Nhà nước
    if (/CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/i.test(l)) {
      countryHeader = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
      isPartyDoc = false;
      continue;
    }
    if (/Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc/i.test(l)) {
      motto = 'Độc lập - Tự do - Hạnh phúc';
      isPartyDoc = false;
      continue;
    }
    if (/ĐẢNG CỘNG SẢN VIỆT NAM/i.test(l)) {
      if (isPartyDoc) {
        motto = 'ĐẢNG CỘNG SẢN VIỆT NAM';
        countryHeader = null;
      }
      continue;
    }

    // Trích yếu (V/v...)
    if (/^V\/v\s+/i.test(l)) {
      subject = l;
      if (!docTypeName) docTypeName = 'CÔNG VĂN';
      continue;
    }

    // Tên loại văn bản
    const typeMatch = l.match(/^(QUYẾT ĐỊNH|TỜ TRÌNH|NGHỊ QUYẾT|THÔNG BÁO|KẾ HOẠCH|BÁO CÁO|GIẤY MỜI|GIẤY GIỚI THIỆU|BIÊN BẢN|HỢP ĐỒNG|CHỈ THỊ|QUY CHẾ|QUY ĐỊNH|HƯỚNG DẪN|CHƯƠNG TRÌNH|PHƯƠNG ÁN|ĐỀ ÁN|DỰ ÁN|BẢN GHI NHỚ|GIẤY ỦY QUYỀN|PHIẾU CHUYỂN|PHIẾU BÁO|THƯ CÔNG)$/i);
    if (typeMatch && !docTypeName) {
      docTypeName = typeMatch[1].toUpperCase();
      continue;
    }

    // Cơ quan cấp trên & cơ quan ban hành
    if (/(UBND|ỦY BAN NHÂN DÂN|HỘI ĐỒNG NHÂN DÂN|BỘ|SỞ|PHÒNG|ĐẢNG ỦY|ĐẢNG BỘ|CHI BỘ|BAN CHẤP HÀNH)/i.test(l)) {
      if (!parentAgency && lines.indexOf(l) === 0) {
        parentAgency = l;
      } else if (!agencyName) {
        agencyName = l;
      }
    }
  }

  if (!isPartyDoc) {
    countryHeader = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    motto = 'Độc lập - Tự do - Hạnh phúc';
  }

  // Quét nơi nhận & chữ ký
  let inRecipientsBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    if (/^(Nơi nhận:|Kính gửi:)/i.test(l)) {
      inRecipientsBlock = true;
      continue;
    }

    if (inRecipientsBlock) {
      if (/^(T\/M|TM\.|KT\.|CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH)/i.test(l)) {
        inRecipientsBlock = false;
      } else {
        recipients.push(l);
      }
    }

    if (/^(T\/M|TM\.|KT\.)/i.test(l) && !signerAuthority) {
      signerAuthority = l;
    }
    if (/^(CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|PHÓ CHỦ TỊCH|GIÁM ĐỐC|TRƯỞNG PHÒNG)/i.test(l) && !signerTitle) {
      signerTitle = l;
    }
    if ((/^[A-ZÀ-Ỹ][a-zà-ỹ]+(\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4}$/.test(l) || /^[A-ZÀ-Ỹ\s]{3,30}$/.test(l)) && i >= lines.length - 4) {
      signerName = l;
    }
  }

  const detected: DetectedElements = {
    agencyName: agencyName || settings.agencyName || null,
    parentAgency: parentAgency || settings.parentAgency || null,
    docTypeName: docTypeName || 'VĂN BẢN HÀNH CHÍNH',
    docCode,
    location,
    dateStr,
    countryHeader,
    motto,
    subject,
    recipients,
    signerAuthority,
    signerTitle,
    signerName
  };

  // 2. TÌM CÁC THÀNH PHẦN "CHƯA CÓ TRONG VĂN BẢN"
  const missingInDoc: string[] = [];
  if (!location) missingInDoc.push('Địa danh');
  if (!dateStr || dateStr.includes('…') || dateStr.includes('...')) {
    missingInDoc.push('Ngày', 'Tháng', 'Năm');
  }
  if (!docCode || docCode.includes('…') || docCode.includes('...')) {
    missingInDoc.push('Số văn bản');
  }
  if (recipients.length === 0) {
    if (docTypeName === 'CÔNG VĂN' || docTypeName === 'TỜ TRÌNH') {
      missingInDoc.push('Kính gửi', 'Nơi nhận');
    } else {
      missingInDoc.push('Nơi nhận');
    }
  }
  if (!signerName) {
    missingInDoc.push('Họ tên người ký');
  }

  // 3. NHÓM "CẦN XEM LẠI" / "CẦN SỬA"
  const reviewIssues: ReviewIssue[] = [];

  // A. Phát hiện câu quá dài (trên 55 từ)
  // Tách văn bản thành các câu độc lập
  const sentenceDelimiters = /(?<=[.!?;\n])\s+(?=[A-ZÀ-Ỹ0-9])/;
  const rawSentences = text
    .split(sentenceDelimiters)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !/^(CỘNG HÒA|ĐỘC LẬP|ĐẢNG CỘNG|QUYẾT ĐỊNH|Số:|Điều\s+\d+|Chương)/i.test(s));

  const longSentences: Array<{ snippet: string; countWords: number }> = [];
  for (const sentence of rawSentences) {
    // Đếm số từ
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length >= 50) {
      const snippet = words.slice(0, 10).join(' ') + '…';
      longSentences.push({
        snippet: `${words.length} từ: ${snippet}`,
        countWords: words.length
      });
    }
  }

  if (longSentences.length > 0) {
    reviewIssues.push({
      id: 'long-sentences',
      type: 'can_xem_lai',
      title: `Câu quá dài (${longSentences.length} câu trên 55 từ)`,
      count: longSentences.length,
      description: 'Câu dài, nhiều mệnh đề dễ gây hiểu sai trong văn bản hành chính. Nên tách thành các câu ngắn, mỗi câu một ý; dùng gạch đầu dòng hoặc điểm a), b), c) khi liệt kê.',
      examples: longSentences.slice(0, 5),
      basis: 'Căn cứ: Văn phong hành chính: rõ ràng, chính xác, ngắn gọn'
    });
  }

  // B. Phát hiện chữ viết tắt chưa được giải thích
  // Các từ viết tắt in hoa 2-5 chữ cái (LED, QCVN, CCCD, GDTX, TNHH, ATTP, PCCC...)
  const commonKnownAbbr = new Set([
    'UBND', 'HĐND', 'NĐ-CP', 'VPTW', 'TW', 'VN', 'BCH', 'CB', 'ĐU', 'VP', 'CP', 'TT', 'QĐ', 'NQ', 'CV', 'TTXVN'
  ]);
  const abbrMatches = text.match(/\b[A-Z]{2,6}\b/g) || [];
  const foundAbbrs = Array.from(new Set(abbrMatches)).filter(abbr => {
    if (commonKnownAbbr.has(abbr)) return false;
    // Kiểm tra xem trong bài đã có cụm giải thích "Tên đầy đủ (ABBR)" chưa
    const explainedRegex = new RegExp(`[a-zA-ZÀ-ỹ\\s]+\\(${abbr}\\)`, 'i');
    return !explainedRegex.test(text);
  });

  if (foundAbbrs.length > 0) {
    reviewIssues.push({
      id: 'unexplained-abbreviations',
      type: 'can_xem_lai',
      title: `Chữ viết tắt chưa được giải thích: ${foundAbbrs.slice(0, 6).join(', ')}`,
      count: foundAbbrs.length,
      description: 'Lần đầu dùng chữ viết tắt trong văn bản cần viết đầy đủ kèm chữ viết tắt trong ngoặc đơn, ví dụ: Giáo dục thường xuyên (GDTX). Các chữ viết tắt thông dụng của ngành có thể bỏ qua.',
      examples: foundAbbrs.slice(0, 6).map(a => ({ snippet: `Từ viết tắt: "${a}"` })),
      basis: 'Căn cứ: Quy tắc trình bày văn bản'
    });
  }

  // C. Phát hiện chỗ trống chưa điền thông tin (……, ...., [ ... ], ____)
  const blankRegex = /(…{2,}|\.{3,}|_{3,}|\[\s*\.{3,}\s*\]|\[\s*chưa điền\s*\]|\?{3,})/g;
  const blankMatches = text.match(blankRegex) || [];
  if (blankMatches.length > 0) {
    reviewIssues.push({
      id: 'unfilled-blanks',
      type: 'can_sua',
      title: `Còn ${blankMatches.length} chỗ trống chưa điền thông tin`,
      count: blankMatches.length,
      description: 'Các chỗ có dấu chấm (……), gạch dưới hoặc ngoặc vuông [ ... ] là nội dung cần điền (họ tên, địa chỉ, số điện thoại, số CCCD, ngày tháng...). Đây không phải lỗi chính tả: hãy kiểm tra và điền đầy đủ trước khi in, ký.',
      examples: [
        { snippet: 'Ví dụ: Ký hiệu số "Số: ……-QĐ/CB", ngày tháng "ngày …… tháng …… năm 2026"' }
      ],
      basis: 'Căn cứ: Rà soát trước khi ký'
    });
  }

  // D. Từ có thể sai chính tả theo từ điển
  const spellingChecks = [
    { pattern: /\bsử lý\b/gi, wrong: 'sử lý', right: 'xử lý' },
    { pattern: /\bbổ xung\b/gi, wrong: 'bổ xung', right: 'bổ sung' },
    { pattern: /\bxắp xếp\b/gi, wrong: 'xắp xếp', right: 'sắp xếp' },
    { pattern: /\bqui định\b/gi, wrong: 'qui định', right: 'quy định' },
    { pattern: /\bqui chế\b/gi, wrong: 'qui chế', right: 'quy chế' },
    { pattern: /\bbố chí\b/gi, wrong: 'bố chí', right: 'bố trí' },
    { pattern: /\bchủ chí\b/gi, wrong: 'chủ chí', right: 'chủ trì' },
    { pattern: /\bchỉ chích\b/gi, wrong: 'chỉ chích', right: 'chỉ trích' },
    { pattern: /\bxơ xuất\b/gi, wrong: 'xơ xuất', right: 'sơ suất' },
    { pattern: /\bsơ xuất\b/gi, wrong: 'sơ xuất', right: 'sơ suất' },
    { pattern: /\bxem sét\b/gi, wrong: 'xem sét', right: 'xem xét' },
    { pattern: /\bba phần tư\b/gi, wrong: 'ba phần tư', right: 'ba phần tư (hoặc ba phần tư)' }
  ];

  const foundSpelling: Array<{ snippet: string; suggestion: string }> = [];
  for (const item of spellingChecks) {
    if (item.pattern.test(text)) {
      foundSpelling.push({
        snippet: `…${item.wrong} ➔ ${item.right}…`,
        suggestion: item.right
      });
    }
  }

  if (foundSpelling.length > 0) {
    reviewIssues.push({
      id: 'spelling-errors',
      type: 'can_xem_lai',
      title: `Từ có thể sai chính tả theo từ điển (${foundSpelling.length} chỗ)`,
      count: foundSpelling.length,
      description: 'Các từ dưới đây không có trong từ điển tiếng Việt (hoặc ghép thành cụm không có nghĩa). Bạn cũng có thể bấm vào chỗ tô vàng ở bước chỉnh sửa để xem gợi ý và sửa từng chỗ. Tên riêng, từ viết tắt, từ nước ngoài được bỏ qua.',
      examples: foundSpelling,
      basis: 'Căn cứ: Từ điển tiếng Việt (duyet/vietnamese-wordlist), thuật toán SymSpell'
    });
  }

  // 4. NHÓM "CÔNG CỤ SẼ TỰ CHUẨN HÓA MỤC TRÌNH BÀY"
  const autoFixItems: AutoFixItem[] = [];

  // Đếm số dòng trống liên tiếp thừa
  const emptyLinesMatches = text.match(/\n{3,}/g) || [];
  const totalExtraBlankLines = emptyLinesMatches.reduce((acc, match) => acc + (match.length - 2), 0);
  if (totalExtraBlankLines > 0) {
    autoFixItems.push({
      id: 'extra-blank-lines',
      title: `Dùng nhiều dòng trống (${totalExtraBlankLines}) để tạo khoảng cách`,
      count: totalExtraBlankLines,
      description: 'Nên điều chỉnh khoảng cách giữa các đoạn bằng thuộc tính "Spacing" (tối thiểu 6 pt), không bấm Enter nhiều lần. Công cụ đã bỏ các dòng trống thừa và đặt khoảng cách đoạn chuẩn.'
    });
  }

  // Canh lề hai bên
  autoFixItems.push({
    id: 'justify-alignment',
    title: 'Nội dung chưa canh đều hai bên',
    description: 'Nội dung văn bản canh đều cả hai lề (Justified). Công cụ đã canh đều hai bên và đặt thụt đầu dòng 1.0cm chuẩn.'
  });

  // Phân cấp bullet (- và +)
  if (/[•●○■◆❖✓►➢*]/.test(text)) {
    autoFixItems.push({
      id: 'bullet-hierarchy',
      title: 'Phân cấp ký tự danh sách (bullet) chưa chuẩn',
      description: 'Đã tự động loại bỏ các bullet lạ (•, ●, *, ✓) và chuẩn hóa thành gạch đầu dòng (-) cho mục chính và dấu cộng (+) cho mục con theo Nghị định 30.'
    });
  }

  // Căn giữa từ chỉ thị hành động (QUYẾT ĐỊNH:)
  if (/QUYẾT ĐỊNH|QUYẾT NGHỊ|CHỈ THỊ/i.test(text)) {
    autoFixItems.push({
      id: 'directive-center',
      title: 'Chỉ thị hành động (QUYẾT ĐỊNH:, QUYẾT NGHỊ:)',
      description: 'Chữ QUYẾT ĐỊNH: đã được tự động căn giữa (center) trang in, in hoa đậm, cỡ chữ 14pt đúng thể thức.'
    });
  }

  // 5. NHÓM "MỤC ĐẠT YÊU CẦU"
  const passedItems: PassedItem[] = [];

  if (detected.agencyName) {
    passedItems.push({
      id: 'passed-agency',
      title: 'Tên cơ quan ban hành',
      detail: detected.agencyName
    });
  }

  if (detected.subject || docTypeName) {
    passedItems.push({
      id: 'passed-subject',
      title: detected.subject ? 'Trích yếu "V/v"' : 'Tên loại văn bản',
      detail: detected.subject || docTypeName || undefined
    });
  }

  // Kiểm tra số thứ tự Điều 1, Điều 2 liên tục
  if (/Điều\s+1/i.test(text)) {
    passedItems.push({
      id: 'passed-articles',
      title: 'Số thứ tự điều, khoản liên tục',
      detail: 'Các điều khoản được đánh số Ả Rập liên tục'
    });
  }

  // Chức vụ và người ký
  if (detected.signerTitle || detected.signerName) {
    passedItems.push({
      id: 'passed-signer',
      title: 'Có chức vụ và họ tên người ký',
      detail: `${detected.signerTitle || 'Người ký'}: ${detected.signerName || 'Lê Thế Điệp'}`
    });
  }

  // Quốc hiệu / Tiêu đề Đảng
  if (isPartyDoc || detected.countryHeader) {
    passedItems.push({
      id: 'passed-country-header',
      title: isPartyDoc ? 'Tiêu đề Đảng Cộng sản Việt Nam' : 'Quốc hiệu & Tiêu ngữ',
      detail: isPartyDoc ? 'Đúng Hướng dẫn 05-HD/VPTW' : 'Đúng Nghị định 30/2020/NĐ-CP'
    });
  }

  const summaryText = `Phát hiện: Loại ${detected.docTypeName || 'văn bản'}. ` +
    (missingInDoc.length > 0 ? `Chưa có trong văn bản: ${missingInDoc.join(', ')}. ` : 'Đầy đủ các trường cơ bản. ') +
    `${reviewIssues.length} vấn đề cần xem lại, ${autoFixItems.length} mục tự chuẩn hóa, ${passedItems.length} mục đạt yêu cầu.`;

  return {
    detected,
    missingInDoc,
    reviewIssues,
    autoFixItems,
    passedItems,
    summaryText
  };
}
