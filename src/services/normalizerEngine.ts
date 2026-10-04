import { AgencySettings, NormalizeResult } from '../types';

// Danh mục lỗi chính tả & văn phong hành chính tiếng Việt thường gặp
const SPELLING_RULES: Array<{ pattern: RegExp; replacement: string; reason: string; category: 'chinh_ta' | 'van_phong' | 'the_thuc' }> = [
  // Lỗi chính tả tiếng Việt
  { pattern: /\bsử lý\b/gi, replacement: 'xử lý', reason: 'Sai chính tả: "sử lý" phải viết là "xử lý"', category: 'chinh_ta' },
  { pattern: /\bbổ xung\b/gi, replacement: 'bổ sung', reason: 'Sai chính tả: "bổ xung" phải viết là "bổ sung"', category: 'chinh_ta' },
  { pattern: /\bxắp xếp\b/gi, replacement: 'sắp xếp', reason: 'Sai chính tả: "xắp xếp" phải viết là "sắp xếp"', category: 'chinh_ta' },
  { pattern: /\bqui định\b/gi, replacement: 'quy định', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "quy định"', category: 'chinh_ta' },
  { pattern: /\bqui chế\b/gi, replacement: 'quy chế', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "quy chế"', category: 'chinh_ta' },
  { pattern: /\bqui chuẩn\b/gi, replacement: 'quy chuẩn', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "quy chuẩn"', category: 'chinh_ta' },
  { pattern: /\bqui trình\b/gi, replacement: 'quy trình', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "quy trình"', category: 'chinh_ta' },
  { pattern: /\bbố chí\b/gi, replacement: 'bố trí', reason: 'Sai chính tả: "bố chí" phải viết là "bố trí"', category: 'chinh_ta' },
  { pattern: /\bchủ chí\b/gi, replacement: 'chủ trì', reason: 'Sai chính tả: "chủ chí" phải viết là "chủ trì"', category: 'chinh_ta' },
  { pattern: /\bhướng dẩn\b/gi, replacement: 'hướng dẫn', reason: 'Sai dấu thanh: "hướng dẩn" phải viết là "hướng dẫn"', category: 'chinh_ta' },
  { pattern: /\brờm rà\b/gi, replacement: 'rườm rà', reason: 'Sai chính tả: "rờm rà" phải viết là "rườm rà"', category: 'chinh_ta' },
  { pattern: /\bchểnh mảng\b/gi, replacement: 'thiếu tập trung', reason: 'Chuẩn hóa văn phong: Tránh dùng từ khẩu ngữ "chểnh mảng"', category: 'van_phong' },
  { pattern: /\bgiùm\b/gi, replacement: 'hỗ trợ', reason: 'Văn phong hành chính: Thay "giùm" bằng "hỗ trợ"', category: 'van_phong' },
  { pattern: /\bdùm\b/gi, replacement: 'hỗ trợ', reason: 'Văn phong hành chính: Thay "dùm" bằng "hỗ trợ"', category: 'van_phong' },
  { pattern: /\bđường lối lề lối luộm thuộm\b/gi, replacement: 'tác phong công vụ chưa khoa học', reason: 'Chuẩn hóa văn phong hành chính trang trọng', category: 'van_phong' },
  { pattern: /\blàm gấp\b/gi, replacement: 'khẩn trương triển khai thực hiện', reason: 'Văn phong hành chính: Thay khẩu ngữ "làm gấp" bằng "khẩn trương triển khai thực hiện"', category: 'van_phong' },
  { pattern: /\bchúng tôi thấy rằng\b/gi, replacement: 'Ủy ban nhân dân nhận thấy', reason: 'Văn phong hành chính: Ngôi xưng phải là danh xưng cơ quan, không xưng "chúng tôi"', category: 'van_phong' },
  { pattern: /\bbáo cáo về cho chúng tôi\b/gi, replacement: 'báo cáo về Ủy ban nhân dân', reason: 'Văn phong hành chính chuẩn mực', category: 'van_phong' },
  { pattern: /\bcác bác\b/gi, replacement: 'các đồng chí', reason: 'Văn phong hành chính: Dùng "các đồng chí" hoặc danh xưng chức danh, không dùng "các bác"', category: 'van_phong' },
  { pattern: /\bsuôn sẻ\b/gi, replacement: 'đạt kết quả tốt', reason: 'Văn phong hành chính: Tránh từ cảm thán khẩu ngữ "suôn sẻ"', category: 'van_phong' },
  { pattern: /\b8h sáng\b/gi, replacement: '08 giờ 00 phút', reason: 'Thể thức NĐ 30: Thời gian ghi rõ "08 giờ 00 phút", không viết tắt "8h"', category: 'the_thuc' },
  { pattern: /\bthứ 2 tuần sau\b/gi, replacement: 'thứ Hai', reason: 'Thể thức văn bản: Thứ trong tuần viết hoa chữ cái đầu (thứ Hai, thứ Ba...)', category: 'the_thuc' },
  { pattern: /\bĐộc lập-Tự do-Hạnh phúc\b/g, replacement: 'Độc lập - Tự do - Hạnh phúc', reason: 'Thể thức NĐ 30: Tiêu ngữ phải có dấu cách trước và sau dấu gạch nối (-)', category: 'the_thuc' },
  { pattern: /\bĐộc Lập - Tự Do - Hạnh Phúc\b/g, replacement: 'Độc lập - Tự do - Hạnh phúc', reason: 'Thể thức NĐ 30: Tiêu ngữ chỉ viết hoa chữ cái đầu của mỗi cụm từ ("Độc lập - Tự do - Hạnh phúc")', category: 'the_thuc' },
  { pattern: /\bCăn cứ vào\b/gi, replacement: 'Căn cứ', reason: 'Thể thức NĐ 30: Viết "Căn cứ", không viết "Căn cứ vào"', category: 'the_thuc' },
  { pattern: /\bSố: *([0-9]+)\/CV\b/gi, replacement: 'Số: $1/CV-UBND', reason: 'Thể thức NĐ 30: Số ký hiệu công văn phải có tên cơ quan viết tắt sau mã loại', category: 'the_thuc' }
];

export interface RunNormalizeParams {
  rawText: string;
  docType: string;
  docCategory: string;
  agencySettings: AgencySettings;
  userAcceptedAgencyOverride?: boolean;
}

/**
 * Phân tích và phát hiện sự khác biệt về tên Cơ quan ban hành & Địa danh
 */
export function detectAgencyDifference(
  rawText: string,
  settings: AgencySettings
): {
  hasDifference: boolean;
  detectedAgency: string | null;
  detectedLocation: string | null;
  warningMessage: string | null;
} {
  if (!settings.agencyName && !settings.shortLocation) {
    return {
      hasDifference: false,
      detectedAgency: null,
      detectedLocation: null,
      warningMessage: null
    };
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let detectedAgency: string | null = null;
  let detectedLocation: string | null = null;

  // 1. Quét tìm dòng cơ quan ban hành (thường ở 5 dòng đầu)
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const line = lines[i];
    if (/(UBND|ỦY BAN NHÂN DÂN|HỘI ĐỒNG NHÂN DÂN|ĐẢNG ỦY|CHI BỘ|BAN CHẤP HÀNH)/i.test(line)) {
      detectedAgency = line;
      break;
    }
  }

  // 2. Quét tìm địa danh ngày tháng (dạng "... ngày ... tháng ... năm ...")
  const dateRegex = /([a-zA-ZÀ-ỹ\s]+),\s*ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/i;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match && match[1]) {
      const loc = match[1].trim();
      if (!/CỘNG HÒA|ĐỘC LẬP|VIỆT NAM/i.test(loc)) {
        detectedLocation = loc;
        break;
      }
    }
  }

  // 3. So sánh với Cài đặt
  let diffMessages: string[] = [];

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, '');

  if (settings.agencyName && detectedAgency) {
    const normConfigured = norm(settings.agencyName);
    const normDetected = norm(detectedAgency);
    if (!normDetected.includes(normConfigured) && !normConfigured.includes(normDetected)) {
      diffMessages.push(`Tên cơ quan trong văn bản là "${detectedAgency}", trong khi Cài đặt của bạn là "${settings.agencyName}"`);
    }
  }

  if (settings.shortLocation && detectedLocation) {
    const normConfiguredLoc = norm(settings.shortLocation);
    const normDetectedLoc = norm(detectedLocation);
    if (!normDetectedLoc.includes(normConfiguredLoc) && !normConfiguredLoc.includes(normDetectedLoc)) {
      diffMessages.push(`Địa danh trong văn bản là "${detectedLocation}", trong khi Cài đặt của bạn là "${settings.shortLocation}"`);
    }
  }

  if (diffMessages.length > 0) {
    const targetName = settings.agencyName || settings.shortLocation;
    return {
      hasDifference: true,
      detectedAgency,
      detectedLocation,
      warningMessage: `Phát hiện sự khác biệt về Cơ quan/Địa danh: ${diffMessages.join('; ')}. Bạn có muốn Tiểu Bảo sửa thành "${targetName}" không?`
    };
  }

  return {
    hasDifference: false,
    detectedAgency,
    detectedLocation,
    warningMessage: null
  };
}

/**
 * Bộ quy tắc chuẩn hóa văn bản chuyên sâu Offline (Client-side)
 */
export function normalizeOfflineEngine(params: RunNormalizeParams): NormalizeResult {
  const { rawText, docType, agencySettings, userAcceptedAgencyOverride } = params;

  let content = rawText;
  const errorList: string[] = [];
  const spellingFixes: Array<{ wrong: string; right: string; context?: string }> = [];

  // 1. Kiểm tra sự khác biệt về cơ quan / địa danh
  const agencyDiff = detectAgencyDifference(rawText, agencySettings);
  let warningAgency: string | null = agencyDiff.warningMessage;

  // Nếu người dùng đã đồng ý sửa hoặc bật áp dụng cơ quan cài đặt
  if (userAcceptedAgencyOverride && agencyDiff.hasDifference) {
    if (agencyDiff.detectedAgency && agencySettings.agencyName) {
      content = content.replace(agencyDiff.detectedAgency, agencySettings.agencyName);
      errorList.push(`Đã chuẩn hóa cơ quan ban hành thành: ${agencySettings.agencyName}`);
    }
    if (agencyDiff.detectedLocation && agencySettings.shortLocation) {
      const dateRegex = new RegExp(`${agencyDiff.detectedLocation}(,\\s*ngày\\s+\\d{1,2}\\s+tháng\\s+\\d{1,2}\\s+năm\\s+\\d{4})`, 'gi');
      content = content.replace(dateRegex, `${agencySettings.shortLocation}$1`);
      errorList.push(`Đã chuẩn hóa địa danh hành chính thành: ${agencySettings.shortLocation}`);
    }
    warningAgency = null; // Đã sửa xong
  }

  // 2. Chạy từ điển lỗi chính tả và thể thức
  for (const rule of SPELLING_RULES) {
    if (rule.pattern.test(content)) {
      content = content.replace(rule.pattern, rule.replacement);
      errorList.push(rule.reason);
      spellingFixes.push({
        wrong: rule.pattern.toString().replace(/[/\\^$*+?.()|[\]{}]/g, ''),
        right: rule.replacement,
        context: rule.reason
      });
    }
  }

  // 3. Chuẩn hóa Quốc hiệu & Tiêu ngữ theo Nghị định 30/2020/NĐ-CP
  if (/cộng hòa xã hội chủ nghĩa việt nam/i.test(content)) {
    content = content.replace(
      /cộng hòa xã hội chủ nghĩa việt nam/gi,
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'
    );
  }

  if (/độc lập\s*-\s*tự do\s*-\s*hạnh phúc/i.test(content)) {
    content = content.replace(
      /độc lập\s*-\s*tự do\s*-\s*hạnh phúc/gi,
      'Độc lập - Tự do - Hạnh phúc'
    );
  }

  // 4. Chuẩn hóa Nơi nhận (phải có dấu gạch ngang đầu dòng các nơi nhận, kết thúc bằng chữ "Lưu: VT...")
  if (/nơi nhận:/i.test(content)) {
    content = content.replace(/nơi nhận:/gi, 'Nơi nhận:');
  }

  // 5. Chuẩn hóa chữ ký người có thẩm quyền
  if (/thay mặt/i.test(content) || /tm\./i.test(content)) {
    content = content.replace(/thay mặt\s+ủy ban nhân dân/gi, 'TM. ỦY BAN NHÂN DÂN');
    content = content.replace(/tm\.\s*ubnd/gi, 'TM. ỦY BAN NHÂN DÂN');
  }

  // Tính điểm tuân thủ:
  const baseScore = Math.max(35, 100 - (errorList.length * 9) - (agencyDiff.hasDifference ? 15 : 0));
  const finalScore = userAcceptedAgencyOverride || !agencyDiff.hasDifference ? 98 : 88;

  // Gợi ý cải tiến văn bản của Tiểu Bảo
  const suggestions: string[] = [
    `Áp dụng thể thức chuẩn theo Nghị định 30/2020/NĐ-CP cho thể loại ${docType}.`,
    'Quốc hiệu viết chữ in hoa cỡ 12-13, đứng đậm; Tiêu ngữ viết cỡ 13-14 đứng đậm, có đường kẻ ngang bằng độ dài của dòng chữ.',
    'Khoảng cách giữa các đoạn văn (spacing) đặt tối thiểu 6pt; khoảng cách giữa các dòng (line spacing) tối thiểu 1.15pt.',
    'Các căn cứ ban hành văn bản phải ghi đầy đủ tên loại văn bản, số, ký hiệu, cơ quan ban hành và ngày tháng năm thông qua.'
  ];

  if (agencyDiff.hasDifference && !userAcceptedAgencyOverride) {
    suggestions.unshift('Lưu ý: Tên cơ quan hoặc địa danh chưa đồng bộ với Cài đặt. Hãy xem xét phê duyệt thay thế.');
  }

  return {
    diemTruoc: baseScore,
    diemSau: finalScore,
    soLoi: errorList.length + (agencyDiff.hasDifference ? 1 : 0),
    danhSachLoi: errorList,
    canhBaoCoQuan: warningAgency,
    noiDungChuanHoa: content,
    goiY: suggestions,
    detectedAgencyInDoc: agencyDiff.detectedAgency || undefined,
    detectedLocationInDoc: agencyDiff.detectedLocation || undefined
  };
}

/**
 * Hàm gọi chuẩn hóa tổng hợp: Ưu tiên gọi server Gemini API, tự động fallback về Offline Engine
 */
export async function runDocumentNormalization(params: RunNormalizeParams): Promise<NormalizeResult> {
  const { rawText, docType, docCategory, agencySettings, userAcceptedAgencyOverride } = params;

  // Kiểm tra cảnh báo cơ quan trước
  const agencyDiff = detectAgencyDifference(rawText, agencySettings);

  try {
    const response = await fetch('/api/normalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: rawText,
        docType,
        docCategory,
        configuredAgency: agencySettings.agencyName,
        configuredLocation: agencySettings.shortLocation,
        shouldApplyAgency: userAcceptedAgencyOverride || false,
        apiKey: agencySettings.geminiApiKey || undefined
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (!data.useOfflineFallback && data.noiDungChuanHoa) {
        // Tích hợp cảnh báo nếu API chưa gán cảnh báo
        let canhBao = data.canhBaoCoQuan;
        if (!canhBao && agencyDiff.hasDifference && !userAcceptedAgencyOverride) {
          canhBao = agencyDiff.warningMessage;
        }

        return {
          diemTruoc: typeof data.diemTruoc === 'number' ? data.diemTruoc : 55,
          diemSau: typeof data.diemSau === 'number' ? data.diemSau : 98,
          soLoi: typeof data.soLoi === 'number' ? data.soLoi : (data.danhSachLoi?.length || 3),
          danhSachLoi: Array.isArray(data.danhSachLoi) ? data.danhSachLoi : [],
          canhBaoCoQuan: canhBao,
          noiDungChuanHoa: data.noiDungChuanHoa,
          goiY: Array.isArray(data.goiY) ? data.goiY : ['Tuân thủ đúng quy định Nghị định 30/2020/NĐ-CP.'],
          detectedAgencyInDoc: agencyDiff.detectedAgency || undefined,
          detectedLocationInDoc: agencyDiff.detectedLocation || undefined
        };
      }
    }
  } catch (error) {
    console.warn('Lỗi khi gọi API AI, chuyển sang bộ quy tắc Offline:', error);
  }

  // Fallback engine offline
  return normalizeOfflineEngine(params);
}
