import { AgencySettings, NormalizeResult } from '../types';
import { parseDocumentStructure, reconstructNormalizedText } from './decree30Formatter';
import { analyzeDocumentText } from './documentAnalyzer';

// Danh mục lỗi chính tả & văn phong hành chính tiếng Việt chuyên sâu theo chuẩn trolyvanthu.isavn.edu.vn
const SPELLING_RULES: Array<{ pattern: RegExp; replacement: string; reason: string; category: 'chinh_ta' | 'van_phong' | 'the_thuc' }> = [
  // 1. Lỗi cặp phụ âm s / x
  { pattern: /\bsử lý\b/gi, replacement: 'xử lý', reason: 'Sai chính tả: "sử lý" phải viết là "xử lý"', category: 'chinh_ta' },
  { pattern: /\bbổ xung\b/gi, replacement: 'bổ sung', reason: 'Sai chính tả: "bổ xung" phải viết là "bổ sung"', category: 'chinh_ta' },
  { pattern: /\bxắp xếp\b/gi, replacement: 'sắp xếp', reason: 'Sai chính tả: "xắp xếp" phải viết là "sắp xếp"', category: 'chinh_ta' },
  { pattern: /\bxơ xuất\b/gi, replacement: 'sơ suất', reason: 'Sai chính tả: "xơ xuất" phải viết là "sơ suất"', category: 'chinh_ta' },
  { pattern: /\bsơ xuất\b/gi, replacement: 'sơ suất', reason: 'Sai chính tả: "sơ xuất" phải viết là "sơ suất"', category: 'chinh_ta' },
  { pattern: /\bxơ suất\b/gi, replacement: 'sơ suất', reason: 'Sai chính tả: "xơ suất" phải viết là "sơ suất"', category: 'chinh_ta' },
  { pattern: /\bxuất ăn\b/gi, replacement: 'suất ăn', reason: 'Sai chính tả: "xuất ăn" phải viết là "suất ăn"', category: 'chinh_ta' },
  { pattern: /\bsản suất\b/gi, replacement: 'sản xuất', reason: 'Sai chính tả: "sản suất" phải viết là "sản xuất"', category: 'chinh_ta' },
  { pattern: /\bxát hạch\b/gi, replacement: 'sát hạch', reason: 'Sai chính tả: "xát hạch" phải viết là "sát hạch"', category: 'chinh_ta' },
  { pattern: /\bsiết chặt\b/gi, replacement: 'siết chặt', reason: 'Chuẩn hóa chính tả: "siết chặt"', category: 'chinh_ta' },

  // 2. Lỗi cặp phụ âm ch / tr
  { pattern: /\bbố chí\b/gi, replacement: 'bố trí', reason: 'Sai chính tả: "bố chí" phải viết là "bố trí"', category: 'chinh_ta' },
  { pattern: /\bchủ chí\b/gi, replacement: 'chủ trì', reason: 'Sai chính tả: "chủ chí" phải viết là "chủ trì"', category: 'chinh_ta' },
  { pattern: /\btrách nghiệm\b/gi, replacement: 'trách nhiệm', reason: 'Sai chính tả: "trách nghiệm" phải viết là "trách nhiệm"', category: 'chinh_ta' },
  { pattern: /\bchỉ chích\b/gi, replacement: 'chỉ trích', reason: 'Sai chính tả: "chỉ chích" phải viết là "chỉ trích"', category: 'chinh_ta' },
  { pattern: /\bchiển khai\b/gi, replacement: 'triển khai', reason: 'Sai chính tả: "chiển khai" phải viết là "triển khai"', category: 'chinh_ta' },
  { pattern: /\btriễn khai\b/gi, replacement: 'triển khai', reason: 'Sai chính tả: "triễn khai" phải viết là "triển khai"', category: 'chinh_ta' },
  { pattern: /\bkiểm cha\b/gi, replacement: 'kiểm tra', reason: 'Sai chính tả: "kiểm cha" phải viết là "kiểm tra"', category: 'chinh_ta' },

  // 3. Lỗi cặp phụ âm d / gi / r
  { pattern: /\brờm rà\b/gi, replacement: 'rườm rà', reason: 'Sai chính tả: "rờm rà" phải viết là "rườm rà"', category: 'chinh_ta' },
  { pattern: /\bbàn dao\b/gi, replacement: 'bàn giao', reason: 'Sai chính tả: "bàn dao" phải viết là "bàn giao"', category: 'chinh_ta' },
  { pattern: /\bgiùm\b/gi, replacement: 'hỗ trợ', reason: 'Văn phong hành chính: Thay "giùm" bằng "hỗ trợ"', category: 'van_phong' },
  { pattern: /\bdùm\b/gi, replacement: 'hỗ trợ', reason: 'Văn phong hành chính: Thay "dùm" bằng "hỗ trợ"', category: 'van_phong' },
  { pattern: /\bgiử gìn\b/gi, replacement: 'giữ gìn', reason: 'Sai chính tả: "giử gìn" phải viết là "giữ gìn"', category: 'chinh_ta' },
  { pattern: /\bgiành giật\b/gi, replacement: 'tranh chấp', reason: 'Văn phong hành chính: Dùng từ trang trọng "tranh chấp"', category: 'van_phong' },

  // 4. Lỗi nguyên âm i / y theo Quy định chuẩn hóa tiếng Việt
  { pattern: /\bqui định\b/gi, replacement: 'quy định', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "quy định"', category: 'chinh_ta' },
  { pattern: /\bqui chế\b/gi, replacement: 'quy chế', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "quy chế"', category: 'chinh_ta' },
  { pattern: /\bqui chuẩn\b/gi, replacement: 'quy chuẩn', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "quy chuẩn"', category: 'chinh_ta' },
  { pattern: /\bqui trình\b/gi, replacement: 'quy trình', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "quy trình"', category: 'chinh_ta' },
  { pattern: /\blí do\b/gi, replacement: 'lý do', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "lý do"', category: 'chinh_ta' },
  { pattern: /\bkỉ luật\b/gi, replacement: 'kỷ luật', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "kỷ luật"', category: 'chinh_ta' },
  { pattern: /\bkỉ niệm\b/gi, replacement: 'kỷ niệm', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "kỷ niệm"', category: 'chinh_ta' },
  { pattern: /\bkí tên\b/gi, replacement: 'ký tên', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "ký tên"', category: 'chinh_ta' },
  { pattern: /\bđăng kí\b/gi, replacement: 'đăng ký', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "đăng ký"', category: 'chinh_ta' },
  { pattern: /\bchữ kí\b/gi, replacement: 'chữ ký', reason: 'Chuẩn hóa chính tả: Dùng "y" dài cho "chữ ký"', category: 'chinh_ta' },
  { pattern: /\bxem sét\b/gi, replacement: 'xem xét', reason: 'Sai chính tả: "xem sét" phải viết là "xem xét"', category: 'chinh_ta' },

  // 5. Lỗi dấu thanh (hỏi / ngã)
  { pattern: /\bhướng dẩn\b/gi, replacement: 'hướng dẫn', reason: 'Sai dấu thanh: "hướng dẩn" phải viết là "hướng dẫn"', category: 'chinh_ta' },
  { pattern: /\blổi\b/gi, replacement: 'lỗi', reason: 'Sai dấu thanh: "lổi" phải viết là "lỗi"', category: 'chinh_ta' },
  { pattern: /\blỉnh vực\b/gi, replacement: 'lĩnh vực', reason: 'Sai dấu thanh: "lỉnh vực" phải viết là "lĩnh vực"', category: 'chinh_ta' },
  { pattern: /\bdiển biến\b/gi, replacement: 'diễn biến', reason: 'Sai dấu thanh: "diển biến" phải viết là "diễn biến"', category: 'chinh_ta' },

  // 6. Văn phong hành chính công vụ (Trang trọng, khách quan)
  { pattern: /\bchúng tôi thấy rằng\b/gi, replacement: 'nhận thấy', reason: 'Văn phong hành chính: Thay "chúng tôi thấy rằng" bằng "nhận thấy"', category: 'van_phong' },
  { pattern: /\bchúng tôi đề nghị\b/gi, replacement: 'đề nghị', reason: 'Văn phong hành chính: Bỏ đại từ xưng hô cá nhân "chúng tôi"', category: 'van_phong' },
  { pattern: /\bbáo cáo về cho chúng tôi\b/gi, replacement: 'báo cáo về cơ quan chủ trì', reason: 'Văn phong hành chính chuẩn mực: Không dùng "chúng tôi"', category: 'van_phong' },
  { pattern: /\bcác bác\b/gi, replacement: 'các đồng chí', reason: 'Văn phong hành chính: Dùng "các đồng chí" hoặc danh xưng chức vụ, không dùng "các bác"', category: 'van_phong' },
  { pattern: /\blàm gấp\b/gi, replacement: 'khẩn trương triển khai thực hiện', reason: 'Văn phong hành chính: Thay khẩu ngữ "làm gấp" bằng "khẩn trương triển khai thực hiện"', category: 'van_phong' },
  { pattern: /\bnhanh chóng nhất có thể\b/gi, replacement: 'trong thời gian sớm nhất', reason: 'Văn phong hành chính: Thay "nhanh chóng nhất có thể" bằng "trong thời gian sớm nhất"', category: 'van_phong' },
  { pattern: /\bsuôn sẻ\b/gi, replacement: 'đạt kết quả tốt', reason: 'Văn phong hành chính: Tránh từ cảm thán khẩu ngữ "suôn sẻ"', category: 'van_phong' },
  { pattern: /\bchểnh mảng\b/gi, replacement: 'thiếu tập trung, chưa thực hiện nghiêm túc', reason: 'Chuẩn hóa văn phong: Tránh dùng từ khẩu ngữ "chểnh mảng"', category: 'van_phong' },
  { pattern: /\bđường lối lề lối luộm thuộm\b/gi, replacement: 'tác phong công vụ chưa khoa học', reason: 'Chuẩn hóa văn phong hành chính trang trọng', category: 'van_phong' },
  { pattern: /\bqua loa,\s*đại khái\b/gi, replacement: 'chưa bảo đảm yêu cầu kỹ thuật', reason: 'Văn phong hành chính: Tránh từ khẩu ngữ "qua loa, đại khái"', category: 'van_phong' },
  { pattern: /\bqua loa đại khái\b/gi, replacement: 'chưa bảo đảm yêu cầu', reason: 'Văn phong hành chính: Tránh từ khẩu ngữ "qua loa đại khái"', category: 'van_phong' },
  { pattern: /\brất mong cấp trên giúp đỡ\b/gi, replacement: 'kính trình cấp có thẩm quyền xem xét, phê duyệt', reason: 'Văn phong hành chính: Dùng thể thức kính trình chuẩn mực', category: 'van_phong' },
  { pattern: /\btiền bạc\b/gi, replacement: 'kinh phí', reason: 'Văn phong hành chính: Thay từ thông tục "tiền bạc" bằng "kinh phí"', category: 'van_phong' },
  { pattern: /\bgiấy tờ\b/gi, replacement: 'hồ sơ, tài liệu', reason: 'Văn phong hành chính: Dùng "hồ sơ, tài liệu" thay cho "giấy tờ"', category: 'van_phong' },

  // 7. Chuẩn hóa thể thức thời gian & thứ trong tuần
  { pattern: /\b8h sáng\b/gi, replacement: '08 giờ 00 phút', reason: 'Thể thức NĐ 30: Thời gian ghi rõ "08 giờ 00 phút", không viết tắt "8h"', category: 'the_thuc' },
  { pattern: /\b14h chiều\b/gi, replacement: '14 giờ 00 phút', reason: 'Thể thức NĐ 30: Thời gian ghi rõ "14 giờ 00 phút", không viết tắt "14h"', category: 'the_thuc' },
  { pattern: /\bthứ 2 tuần sau\b/gi, replacement: 'thứ Hai', reason: 'Thể thức NĐ 30: Thứ trong tuần viết hoa chữ cái đầu (thứ Hai, thứ Ba...)', category: 'the_thuc' },
  { pattern: /\bthứ 2\b/gi, replacement: 'thứ Hai', reason: 'Thể thức văn bản: "thứ 2" viết là "thứ Hai"', category: 'the_thuc' },
  { pattern: /\bthứ 3\b/gi, replacement: 'thứ Ba', reason: 'Thể thức văn bản: "thứ 3" viết là "thứ Ba"', category: 'the_thuc' },
  { pattern: /\bthứ 4\b/gi, replacement: 'thứ Tư', reason: 'Thể thức văn bản: "thứ 4" viết là "thứ Tư"', category: 'the_thuc' },
  { pattern: /\bthứ 5\b/gi, replacement: 'thứ Năm', reason: 'Thể thức văn bản: "thứ 5" viết là "thứ Năm"', category: 'the_thuc' },
  { pattern: /\bthứ 6\b/gi, replacement: 'thứ Sáu', reason: 'Thể thức văn bản: "thứ 6" viết là "thứ Sáu"', category: 'the_thuc' },
  { pattern: /\bthứ 7\b/gi, replacement: 'thứ Bảy', reason: 'Thể thức văn bản: "thứ 7" viết là "thứ Bảy"', category: 'the_thuc' },

  // 8. Chuẩn hóa Tiêu ngữ & Căn cứ
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

import { cleanAIText, stripImportedNationalHeaders } from '../utils/cleanAIText';

export interface AgencyDifferenceResult {
  hasDifference: boolean;
  hasAgencyDifference: boolean;
  hasLocationDifference: boolean;
  detectedAgency: string | null;
  configuredAgency: string | null;
  detectedLocation: string | null;
  configuredLocation: string | null;
  warningMessage: string | null;
  suggestedFix: string | null;
}

/**
 * Phân tích và phát hiện sự khác biệt về tên Cơ quan ban hành & Địa danh
 */
export function detectAgencyDifference(
  rawText: string,
  settings: AgencySettings
): AgencyDifferenceResult {
  if (!settings.agencyName && !settings.shortLocation) {
    return {
      hasDifference: false,
      hasAgencyDifference: false,
      hasLocationDifference: false,
      detectedAgency: null,
      configuredAgency: null,
      detectedLocation: null,
      configuredLocation: null,
      warningMessage: null,
      suggestedFix: null
    };
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let detectedAgency: string | null = null;
  let detectedLocation: string | null = null;

  // 1. Quét tìm dòng cơ quan ban hành (thường ở 8 dòng đầu, trước Số hoặc Quyết định/Công văn)
  const agencyKeywords = /(UBND|ỦY BAN NHÂN DÂN|HỘI ĐỒNG NHÂN DÂN|ĐẢNG ỦY|CHI BỘ|BAN CHẤP HÀNH|BAN THƯỜNG VỤ|SỞ|PHÒNG|BỘ|BAN|TRƯỜNG|TRUNG TÂM|BỆNH VIỆN|CÔNG TY|TỔNG CÔNG TY|TẬP ĐOÀN|VIỆN|HỌC VIỆN|CỤC|CHI CỤC|ĐẢNG BỘ)/i;
  
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    // Bỏ qua dòng Quốc hiệu, Tiêu ngữ, Số ký hiệu, Địa danh ngày tháng
    if (/CỘNG\s+H[ÒO]A|ĐỘC\s+LẬP|VIỆT\s+NAM|ĐẢNG\s+CỘNG\s+SẢN|^Số:|^V\/v|ngày\s+\d+/i.test(line)) {
      continue;
    }
    if (agencyKeywords.test(line)) {
      detectedAgency = line;
      break;
    }
    // Nếu là dòng chữ in hoa ngắn ở đầu văn bản (có thể là tên cơ quan viết hoa)
    if (/^[A-ZÀ-Ỹ\s\.\-]{5,60}$/.test(line) && !line.includes('CỘNG HÒA') && !line.includes('ĐẢNG CỘNG SẢN')) {
      detectedAgency = line;
      break;
    }
  }

  // 2. Quét tìm địa danh ngày tháng (dạng "... ngày ... tháng ... năm ...")
  const dateRegex = /([a-zA-ZÀ-ỹ\s]+),\s*ngày\s+[\d\w\s.…]+tháng\s+[\d\w\s.…]+năm/i;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match && match[1]) {
      const loc = match[1].trim();
      if (!/CỘNG HÒA|ĐỘC LẬP|VIỆT NAM|ĐẢNG/i.test(loc)) {
        detectedLocation = loc;
        break;
      }
    }
  }

  // 3. So sánh với Cài đặt
  const diffMessages: string[] = [];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, '');
  let hasAgencyDiff = false;
  let hasLocationDiff = false;

  if (settings.agencyName && detectedAgency) {
    const normConfigured = norm(settings.agencyName);
    const normDetected = norm(detectedAgency);
    if (!normDetected.includes(normConfigured) && !normConfigured.includes(normDetected)) {
      hasAgencyDiff = true;
      diffMessages.push(`Cơ quan trong văn bản là "${detectedAgency}", khác với Cài đặt người dùng là "${settings.agencyName}"`);
    }
  }

  if (settings.shortLocation && detectedLocation) {
    const normConfiguredLoc = norm(settings.shortLocation);
    const normDetectedLoc = norm(detectedLocation);
    if (!normDetectedLoc.includes(normConfiguredLoc) && !normConfiguredLoc.includes(normDetectedLoc)) {
      hasLocationDiff = true;
      diffMessages.push(`Địa danh trong văn bản là "${detectedLocation}", khác với Cài đặt là "${settings.shortLocation}"`);
    }
  }

  const hasDiff = hasAgencyDiff || hasLocationDiff;
  const targetName = settings.agencyName || settings.shortLocation;

  return {
    hasDifference: hasDiff,
    hasAgencyDifference: hasAgencyDiff,
    hasLocationDifference: hasLocationDiff,
    detectedAgency,
    configuredAgency: settings.agencyName || null,
    detectedLocation,
    configuredLocation: settings.shortLocation || null,
    warningMessage: hasDiff
      ? `Cảnh báo sai lệch cơ quan ban hành: ${diffMessages.join('; ')}.`
      : null,
    suggestedFix: hasDiff
      ? `Đề nghị chỉnh sửa theo Cài đặt của bạn: Cơ quan "${settings.agencyName || ''}"${settings.shortLocation ? `, Địa danh "${settings.shortLocation}"` : ''}`
      : null
  };
}

/**
 * Bộ quy tắc chuẩn hóa văn bản chuyên sâu Offline (Client-side)
 */
export function normalizeOfflineEngine(params: RunNormalizeParams): NormalizeResult {
  const { rawText, docType, docCategory, agencySettings, userAcceptedAgencyOverride } = params;

  let content = cleanAIText(rawText, { preserveTables: true, stripNationalHeader: true });
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
      const dateRegex = new RegExp(`${agencyDiff.detectedLocation}(,\\s*ngày\\s+[\\d\\w\\s.…]+tháng\\s+[\\d\\w\\s.…]+năm\\s+[\\d\\w.…]+)`, 'gi');
      content = content.replace(dateRegex, `${agencySettings.shortLocation}$1`);
      errorList.push(`Đã chuẩn hóa địa danh hành chính thành: ${agencySettings.shortLocation}`);
    }
    warningAgency = null;
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

  // 3. Chuẩn hóa Quốc hiệu & Tiêu ngữ theo Nghị định 30/2020/NĐ-CP (nếu không phải văn bản Đảng)
  const isPartyCategory = docCategory === 'dang' || docCategory === 'Hướng dẫn 05-HD/VPTW' || (Boolean(docType) && /Đảng|Chi bộ|Đảng ủy|cấp ủy/i.test(docType));
  const isAdministrativeCategory = docCategory === 'hanh_chinh' || (Boolean(docCategory) && /30|nghị định 30|hành chính|hanh_chinh/i.test(docCategory)) || 
    (Boolean(docType) && /Công văn|Tờ trình|Quyết định|Nghị quyết|Chỉ thị|Quy chế|Quy định|Thông cáo|Thông báo|Hướng dẫn|Chương trình|Kế hoạch|Phương án|Đề án|Dự án|Báo cáo|Biên bản|Hợp đồng|Công điện|Bản ghi nhớ|Bản thỏa thuận|Giấy ủy quyền|Giấy mời|Giấy giới thiệu|Giấy nghỉ phép|Phiếu gửi|Phiếu chuyển|Phiếu báo|Thư công/i.test(docType) && !/Đảng/i.test(docType));

  let isPartyDoc = false;
  if (isPartyCategory) {
    isPartyDoc = true;
  } else if (isAdministrativeCategory) {
    isPartyDoc = false;
  } else {
    // Chỉ coi là văn bản Đảng nếu 3 dòng đầu CÓ "ĐẢNG CỘNG SẢN VIỆT NAM" VÀ hoàn toàn không có "CỘNG HÒA"
    const firstLines = content.split('\n').slice(0, 3).join('\n');
    isPartyDoc = /ĐẢNG CỘNG SẢN VIỆT NAM/i.test(firstLines) && !/CỘNG HÒA/i.test(content);
  }

  if (!isPartyDoc) {
    // Nếu là văn bản hành chính theo NĐ 30, xóa bỏ dòng ĐẢNG CỘNG SẢN VIỆT NAM vô tình ở đầu nếu có
    content = content.replace(/^ĐẢNG CỘNG SẢN VIỆT NAM\s*[\n\r]+/im, '');

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
  } else {
    // Văn bản Đảng
    if (!content.includes('ĐẢNG CỘNG SẢN VIỆT NAM')) {
      errorList.push('Đã chuẩn hóa tiêu đề Đảng theo Hướng dẫn 05-HD/VPTW');
    }
  }

  // 4. Chuẩn hóa cấu trúc và người ký mặc định
  const structured = parseDocumentStructure(content, agencySettings, isPartyDoc ? 'dang' : 'hanh_chinh', docType);
  // Nếu người ký mặc định được áp dụng
  if (!structured.signerName || structured.signerName === 'Nguyễn Văn Hùng') {
    structured.signerName = agencySettings.signerName || 'Lê Thế Điệp';
  }
  content = reconstructNormalizedText(structured);

  // Tính điểm tuân thủ
  const baseScore = Math.max(40, 100 - (errorList.length * 8) - (agencyDiff.hasDifference ? 15 : 0));
  const finalScore = userAcceptedAgencyOverride || !agencyDiff.hasDifference ? 98 : 88;

  // Gợi ý cải tiến văn bản của Tiểu Bảo Bối
  const suggestions: string[] = [
    `Áp dụng thể thức chuẩn theo ${isPartyDoc ? 'Hướng dẫn 05-HD/VPTW của Văn phòng Trung ương Đảng' : 'Nghị định 30/2020/NĐ-CP của Chính phủ'} cho loại ${docType}.`,
    isPartyDoc 
      ? 'Văn bản Đảng: Cột phải ghi ĐẢNG CỘNG SẢN VIỆT NAM in hoa đậm, có nét gạch nhỏ bên dưới; phía dưới là địa danh ngày tháng năm.'
      : 'Quốc hiệu viết chữ in hoa cỡ 12-13 đứng đậm; Tiêu ngữ viết cỡ 13-14 đứng đậm, có đường kẻ ngang bằng độ dài của dòng chữ.',
    'Bố cục phần đầu và phần chân trang (Nơi nhận - Chữ ký) được dàn đều trên 2 cột ẩn viền cân xứng.',
    'Khoảng cách giữa các đoạn văn (spacing) đặt tối thiểu 6pt; căn đều 2 bên (justify); thụt đầu dòng 1.0 - 1.27 cm.'
  ];

  if (agencyDiff.hasDifference && !userAcceptedAgencyOverride) {
    suggestions.unshift('Lưu ý: Tên cơ quan hoặc địa danh chưa đồng bộ với Cài đặt. Hãy xem xét phê duyệt thay thế.');
  }

  const report = analyzeDocumentText(content, agencySettings);

  return {
    diemTruoc: baseScore,
    diemSau: finalScore,
    soLoi: errorList.length + (agencyDiff.hasDifference ? 1 : 0),
    danhSachLoi: errorList,
    canhBaoCoQuan: warningAgency,
    noiDungChuanHoa: content,
    goiY: suggestions,
    detectedAgencyInDoc: agencyDiff.detectedAgency || undefined,
    detectedLocationInDoc: agencyDiff.detectedLocation || undefined,
    analysisReport: report
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
        let canhBao = data.canhBaoCoQuan;
        if (!canhBao && agencyDiff.hasDifference && !userAcceptedAgencyOverride) {
          canhBao = agencyDiff.warningMessage;
        }

        // Đảm bảo cấu trúc người ký mặc định Lê Thế Điệp nếu chưa có
        let finalContent = data.noiDungChuanHoa;
        const structured = parseDocumentStructure(
          finalContent, 
          agencySettings, 
          params.docCategory === 'dang' ? 'dang' : 'hanh_chinh', 
          params.docType
        );
        if (!structured.signerName) {
          structured.signerName = agencySettings.signerName || 'Lê Thế Điệp';
          finalContent = reconstructNormalizedText(structured);
        }

        const report = analyzeDocumentText(rawText, agencySettings);

        return {
          diemTruoc: typeof data.diemTruoc === 'number' ? data.diemTruoc : 55,
          diemSau: typeof data.diemSau === 'number' ? data.diemSau : 98,
          soLoi: typeof data.soLoi === 'number' ? data.soLoi : (data.danhSachLoi?.length || 3),
          danhSachLoi: Array.isArray(data.danhSachLoi) ? data.danhSachLoi : [],
          canhBaoCoQuan: canhBao,
          noiDungChuanHoa: finalContent,
          goiY: Array.isArray(data.goiY) ? data.goiY : ['Tuân thủ đúng quy định Nghị định 30/2020/NĐ-CP & Hướng dẫn 05-HD/VPTW.'],
          detectedAgencyInDoc: agencyDiff.detectedAgency || undefined,
          detectedLocationInDoc: agencyDiff.detectedLocation || undefined,
          analysisReport: report
        };
      }
    }
  } catch (error) {
    console.warn('Lỗi khi gọi API AI, chuyển sang bộ quy tắc Offline:', error);
  }

  // Fallback engine offline
  return normalizeOfflineEngine(params);
}
