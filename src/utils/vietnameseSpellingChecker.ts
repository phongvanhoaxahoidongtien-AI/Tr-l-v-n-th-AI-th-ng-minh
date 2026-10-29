/**
 * Bộ từ điển và thuật toán soát lỗi chính tả tiếng Việt & văn phong hành chính chuyên sâu
 * Chuẩn hóa theo Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW
 * Khắc phục triệt để các cặp phụ âm s/x, ch/tr, d/gi/r, nguyên âm i/y, dấu thanh hỏi/ngã, phụ âm cuối c/t, n/ng
 * Sử dụng regex ranh giới từ tiếng Việt an toàn (tránh lỗi của \\b trên ký tự có dấu)
 */

import { SpellingProposal, IllogicalSegment, AgencySettings } from '../types';
import { detectIllogicalAdministrativeText } from './illogicalTextDetector';

export interface SpellingRule {
  pattern: RegExp;
  wrong: string;
  right: string;
  reason: string;
  category: 'chinh_ta' | 'nham_tu' | 'logic' | 'van_phong' | 'the_thuc' | 'lap_tu';
}

export interface SpellingErrorMatch {
  wrong: string;
  right: string;
  reason: string;
  category: string;
  snippet: string;
  index: number;
}

// Bảng ký tự tiếng Việt đầy đủ phục vụ định nghĩa ranh giới từ (Word Boundary an toàn)
const VN_CHARS = 'a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ_';

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tạo RegExp ranh giới từ tiếng Việt chuẩn xác (hoạt động 100% với ký tự có dấu, hỗ trợ linh hoạt khoảng cách giữa các từ)
 */
export function createVnWordRegex(phrase: string, flags: string = 'gi'): RegExp {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  const escapedPattern = words.map(escapeRegex).join('[\\s\\u00A0]+');
  return new RegExp(`(?<![${VN_CHARS}])${escapedPattern}(?![${VN_CHARS}])`, flags);
}

/**
 * Tự động điều chỉnh chữ hoa / chữ thường của từ đề xuất (right) tương ứng với từ viết sai trong văn bản (wrong)
 */
export function adaptCapitalization(wrong: string, right: string): string {
  if (!wrong || !right) return right;
  if (/^(?:Xóa bỏ|Gỡ bỏ|Loại bỏ)\b/i.test(right)) return right;
  // Toàn bộ viết hoa (vd: SỬ LÝ -> XỬ LÝ, KẾ HOẠC -> KẾ HOẠCH)
  if (wrong === wrong.toUpperCase() && wrong !== wrong.toLowerCase()) {
    return right.toUpperCase();
  }
  // Chữ cái đầu viết hoa (vd: Sử lý -> Xử lý, Quyêt định -> Quyết định)
  const first = wrong.charAt(0);
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return right.charAt(0).toUpperCase() + right.slice(1);
  }
  return right;
}

interface RawSpellingEntry {
  wrong: string;
  right: string;
  reason: string;
  category?: 'chinh_ta' | 'nham_tu' | 'logic' | 'van_phong' | 'the_thuc' | 'lap_tu';
  caseSensitive?: boolean;
}

const RAW_SPELLING_ENTRIES: RawSpellingEntry[] = [
  // 1. Cặp phụ âm s / x
  { wrong: 'sử lý', right: 'xử lý', reason: 'Sai phụ âm: "sử lý" ➔ "xử lý"' },
  { wrong: 'xử lí', right: 'xử lý', reason: 'Chuẩn chính tả: "xử lí" ➔ "xử lý"' },
  { wrong: 'bổ xung', right: 'bổ sung', reason: 'Sai phụ âm: "bổ xung" ➔ "bổ sung"' },
  { wrong: 'xắp xếp', right: 'sắp xếp', reason: 'Sai phụ âm: "xắp xếp" ➔ "sắp xếp"' },
  { wrong: 'sắp sếp', right: 'sắp xếp', reason: 'Sai phụ âm: "sắp sếp" ➔ "sắp xếp"' },
  { wrong: 'xơ xuất', right: 'sơ suất', reason: 'Sai chính tả: "xơ xuất" ➔ "sơ suất"' },
  { wrong: 'sơ xuất', right: 'sơ suất', reason: 'Sai phụ âm cuối: "sơ xuất" ➔ "sơ suất"' },
  { wrong: 'xơ suất', right: 'sơ suất', reason: 'Sai phụ âm đầu: "xơ suất" ➔ "sơ suất"' },
  { wrong: 'xuất ăn', right: 'suất ăn', reason: 'Sai chính tả: "xuất ăn" ➔ "suất ăn"' },
  { wrong: 'sản suất', right: 'sản xuất', reason: 'Sai chính tả: "sản suất" ➔ "sản xuất"' },
  { wrong: 'xát hạch', right: 'sát hạch', reason: 'Sai phụ âm: "xát hạch" ➔ "sát hạch"' },
  { wrong: 'xiết chặt', right: 'siết chặt', reason: 'Sai phụ âm: "xiết chặt" ➔ "siết chặt"' },
  { wrong: 'xáng kiến', right: 'sáng kiến', reason: 'Sai phụ âm: "xáng kiến" ➔ "sáng kiến"' },
  { wrong: 'xâu sắc', right: 'sâu sắc', reason: 'Sai phụ âm: "xâu sắc" ➔ "sâu sắc"' },
  { wrong: 'xai sót', right: 'sai sót', reason: 'Sai phụ âm: "xai sót" ➔ "sai sót"' },
  { wrong: 'sai xót', right: 'sai sót', reason: 'Sai phụ âm: "sai xót" ➔ "sai sót"' },
  { wrong: 'suất sắc', right: 'xuất sắc', reason: 'Sai phụ âm: "suất sắc" ➔ "xuất sắc"' },
  { wrong: 'chia xẻ', right: 'chia sẻ', reason: 'Sai chính tả: "chia xẻ" ➔ "chia sẻ"' },
  { wrong: 'sác nhận', right: 'xác nhận', reason: 'Sai phụ âm: "sác nhận" ➔ "xác nhận"' },
  { wrong: 'súc tiến', right: 'xúc tiến', reason: 'Sai phụ âm: "súc tiến" ➔ "xúc tiến"' },
  { wrong: 'xáp nhập', right: 'sáp nhập', reason: 'Sai phụ âm: "xáp nhập" ➔ "sáp nhập"' },
  { wrong: 'suất bản', right: 'xuất bản', reason: 'Sai phụ âm: "suất bản" ➔ "xuất bản"' },
  { wrong: 'chuẩn sác', right: 'chuẩn xác', reason: 'Sai phụ âm: "chuẩn sác" ➔ "chuẩn xác"' },
  { wrong: 'xoạn thảo', right: 'soạn thảo', reason: 'Sai phụ âm: "xoạn thảo" ➔ "soạn thảo"' },
  { wrong: 'soạn sảo', right: 'soạn thảo', reason: 'Sai chính tả: "soạn sảo" ➔ "soạn thảo"' },
  { wrong: 'sơ sài', right: 'sơ sài', reason: 'Chuẩn chính tả: "sơ sài"' },
  { wrong: 'xơ xài', right: 'sơ sài', reason: 'Sai phụ âm: "xơ xài" ➔ "sơ sài"' },
  { wrong: 'san xẻ', right: 'san sẻ', reason: 'Sai chính tả: "san xẻ" ➔ "san sẻ"' },
  { wrong: 'xan sẻ', right: 'san sẻ', reason: 'Sai phụ âm: "xan sẻ" ➔ "san sẻ"' },
  { wrong: 'suất trình', right: 'xuất trình', reason: 'Sai phụ âm: "suất trình" ➔ "xuất trình"' },
  { wrong: 'xúc tích', right: 'súc tích', reason: 'Sai phụ âm: "xúc tích" ➔ "súc tích"' },
  { wrong: 'sác thực', right: 'xác thực', reason: 'Sai phụ âm: "sác thực" ➔ "xác thực"' },
  { wrong: 'sâm nhập', right: 'xâm nhập', reason: 'Sai phụ âm: "sâm nhập" ➔ "xâm nhập"' },
  { wrong: 'sông xáo', right: 'xông xáo', reason: 'Sai phụ âm: "sông xáo" ➔ "xông xáo"' },
  { wrong: 'xem sét', right: 'xem xét', reason: 'Sai chính tả: "xem sét" ➔ "xem xét"' },
  { wrong: 'dò xét', right: 'dò xét', reason: 'Chuẩn chính tả: "dò xét"' },
  { wrong: 'xát nhập', right: 'sáp nhập', reason: 'Sai chính tả: "xát nhập" ➔ "sáp nhập"' },

  // 2. Cặp phụ âm ch / tr
  { wrong: 'bố chí', right: 'bố trí', reason: 'Sai phụ âm: "bố chí" ➔ "bố trí"' },
  { wrong: 'chủ chí', right: 'chủ trì', reason: 'Sai phụ âm: "chủ chí" ➔ "chủ trì"' },
  { wrong: 'trách nghiệm', right: 'trách nhiệm', reason: 'Sai chính tả: "trách nghiệm" ➔ "trách nhiệm"' },
  { wrong: 'chỉ chích', right: 'chỉ trích', reason: 'Sai phụ âm: "chỉ chích" ➔ "chỉ trích"' },
  { wrong: 'chiển khai', right: 'triển khai', reason: 'Sai phụ âm: "chiển khai" ➔ "triển khai"' },
  { wrong: 'triễn khai', right: 'triển khai', reason: 'Sai dấu thanh: "triễn khai" ➔ "triển khai"' },
  { wrong: 'kiểm cha', right: 'kiểm tra', reason: 'Sai phụ âm: "kiểm cha" ➔ "kiểm tra"' },
  { wrong: 'chực tiếp', right: 'trực tiếp', reason: 'Sai phụ âm: "chực tiếp" ➔ "trực tiếp"' },
  { wrong: 'chung tâm', right: 'trung tâm', reason: 'Sai phụ âm: "chung tâm" ➔ "trung tâm"' },
  { wrong: 'chọng tâm', right: 'trọng tâm', reason: 'Sai phụ âm: "chọng tâm" ➔ "trọng tâm"' },
  { wrong: 'trấn chỉnh', right: 'chấn chỉnh', reason: 'Sai phụ âm: "trấn chỉnh" ➔ "chấn chỉnh"' },
  { wrong: 'khẩn chương', right: 'khẩn trương', reason: 'Sai phụ âm: "khẩn chương" ➔ "khẩn trương"' },
  { wrong: 'chao đổi', right: 'trao đổi', reason: 'Sai phụ âm: "chao đổi" ➔ "trao đổi"' },
  { wrong: 'cha cứu', right: 'tra cứu', reason: 'Sai phụ âm: "cha cứu" ➔ "tra cứu"' },
  { wrong: 'chuyền đạt', right: 'truyền đạt', reason: 'Sai phụ âm: "chuyền đạt" ➔ "truyền đạt"' },
  { wrong: 'chân trọng', right: 'trân trọng', reason: 'Sai phụ âm: "chân trọng" ➔ "trân trọng"' },
  { wrong: 'trân thành', right: 'chân thành', reason: 'Sai phụ âm: "trân thành" ➔ "chân thành"' },
  { wrong: 'tru toàn', right: 'chu toàn', reason: 'Sai phụ âm: "tru toàn" ➔ "chu toàn"' },
  { wrong: 'trấp hành', right: 'chấp hành', reason: 'Sai phụ âm: "trấp hành" ➔ "chấp hành"' },
  { wrong: 'trế tài', right: 'chế tài', reason: 'Sai phụ âm: "trế tài" ➔ "chế tài"' },
  { wrong: 'tri trả', right: 'chi trả', reason: 'Sai phụ âm: "tri trả" ➔ "chi trả"' },
  { wrong: 'tri bộ', right: 'chi bộ', reason: 'Sai phụ âm: "tri bộ" ➔ "chi bộ"' },
  { wrong: 'chật tự', right: 'trật tự', reason: 'Sai phụ âm: "chật tự" ➔ "trật tự"' },
  { wrong: 'chanh chấp', right: 'tranh chấp', reason: 'Sai phụ âm: "chanh chấp" ➔ "tranh chấp"' },
  { wrong: 'chường hợp', right: 'trường hợp', reason: 'Sai phụ âm: "chường hợp" ➔ "trường hợp"' },
  { wrong: 'chiệu tập', right: 'triệu tập', reason: 'Sai phụ âm: "chiệu tập" ➔ "triệu tập"' },
  { wrong: 'chưng cầu', right: 'trưng cầu', reason: 'Sai phụ âm: "chưng cầu" ➔ "trưng cầu"' },
  { wrong: 'chừng phạt', right: 'trừng phạt', reason: 'Sai phụ âm: "chừng phạt" ➔ "trừng phạt"' },
  { wrong: 'tri tiêu', right: 'chi tiêu', reason: 'Sai phụ âm: "tri tiêu" ➔ "chi tiêu"' },

  // 3. Cặp phụ âm d / gi / r
  { wrong: 'bàn dao', right: 'bàn giao', reason: 'Sai phụ âm: "bàn dao" ➔ "bàn giao"' },
  { wrong: 'giử gìn', right: 'giữ gìn', reason: 'Sai dấu thanh: "giử gìn" ➔ "giữ gìn"' },
  { wrong: 'gìn giử', right: 'gìn giữ', reason: 'Sai dấu thanh: "gìn giử" ➔ "gìn giữ"' },
  { wrong: 'rờm rà', right: 'rườm rà', reason: 'Sai chính tả: "rờm rà" ➔ "rườm rà"' },
  { wrong: 'giành cho', right: 'dành cho', reason: 'Sai phụ âm: "giành cho" ➔ "dành cho"' },
  { wrong: 'giành riêng', right: 'dành riêng', reason: 'Sai phụ âm: "giành riêng" ➔ "dành riêng"' },
  { wrong: 'giấu ấn', right: 'dấu ấn', reason: 'Sai phụ âm: "giấu ấn" ➔ "dấu ấn"' },
  { wrong: 'dám sát', right: 'giám sát', reason: 'Sai phụ âm: "dám sát" ➔ "giám sát"' },
  { wrong: 'giùm', right: 'hỗ trợ', reason: 'Văn phong hành chính: Thay "giùm" bằng "hỗ trợ"', category: 'van_phong' },
  { wrong: 'dùm', right: 'hỗ trợ', reason: 'Văn phong hành chính: Thay "dùm" bằng "hỗ trợ"', category: 'van_phong' },
  { wrong: 'giành giật', right: 'tranh chấp', reason: 'Văn phong hành chính: Dùng "tranh chấp"', category: 'van_phong' },
  { wrong: 'dán đoạn', right: 'gián đoạn', reason: 'Sai phụ âm: "dán đoạn" ➔ "gián đoạn"' },
  { wrong: 'giứt điểm', right: 'dứt điểm', reason: 'Sai phụ âm: "giứt điểm" ➔ "dứt điểm"' },
  { wrong: 'dao dịch', right: 'giao dịch', reason: 'Sai phụ âm: "dao dịch" ➔ "giao dịch"' },
  { wrong: 'da hạn', right: 'gia hạn', reason: 'Sai phụ âm: "da hạn" ➔ "gia hạn"' },
  { wrong: 'giâng hiến', right: 'dâng hiến', reason: 'Sai phụ âm: "giâng hiến" ➔ "dâng hiến"' },
  { wrong: 'dò rỉ', right: 'rò rỉ', reason: 'Sai phụ âm: "dò rỉ" ➔ "rò rỉ"' },
  { wrong: 'ra soát', right: 'rà soát', reason: 'Sai chính tả: "ra soát" ➔ "rà soát"' },

  // 4. Nguyên âm i / y theo Quy định chuẩn hóa tiếng Việt
  { wrong: 'qui định', right: 'quy định', reason: 'Chuẩn chính tả: Dùng "y" dài trong "quy định"' },
  { wrong: 'qui chế', right: 'quy chế', reason: 'Chuẩn chính tả: Dùng "y" dài trong "quy chế"' },
  { wrong: 'qui chuẩn', right: 'quy chuẩn', reason: 'Chuẩn chính tả: Dùng "y" dài trong "quy chuẩn"' },
  { wrong: 'qui trình', right: 'quy trình', reason: 'Chuẩn chính tả: Dùng "y" dài trong "quy trình"' },
  { wrong: 'lí do', right: 'lý do', reason: 'Chuẩn chính tả: Dùng "y" dài trong "lý do"' },
  { wrong: 'kỉ luật', right: 'kỷ luật', reason: 'Chuẩn chính tả: Dùng "y" dài trong "kỷ luật"' },
  { wrong: 'kỉ niệm', right: 'kỷ niệm', reason: 'Chuẩn chính tả: Dùng "y" dài trong "kỷ niệm"' },
  { wrong: 'kí tên', right: 'ký tên', reason: 'Chuẩn chính tả: Dùng "y" dài trong "ký tên"' },
  { wrong: 'đăng kí', right: 'đăng ký', reason: 'Chuẩn chính tả: Dùng "y" dài trong "đăng ký"' },
  { wrong: 'chữ kí', right: 'chữ ký', reason: 'Chuẩn chính tả: Dùng "y" dài trong "chữ ký"' },
  { wrong: 'thẩm mĩ', right: 'thẩm mỹ', reason: 'Chuẩn chính tả: Dùng "y" dài trong "thẩm mỹ"' },
  { wrong: 'địa lí', right: 'địa lý', reason: 'Chuẩn chính tả: Dùng "y" dài trong "địa lý"' },
  { wrong: 'quản lí', right: 'quản lý', reason: 'Chuẩn chính tả: Dùng "y" dài trong "quản lý"' },

  // 5. Lỗi dấu thanh (hỏi / ngã)
  { wrong: 'hướng dẩn', right: 'hướng dẫn', reason: 'Sai dấu thanh: "hướng dẩn" ➔ "hướng dẫn"' },
  { wrong: 'lổi', right: 'lỗi', reason: 'Sai dấu thanh: "lổi" ➔ "lỗi"' },
  { wrong: 'lỉnh vực', right: 'lĩnh vực', reason: 'Sai dấu thanh: "lỉnh vực" ➔ "lĩnh vực"' },
  { wrong: 'diển biến', right: 'diễn biến', reason: 'Sai dấu thanh: "diển biến" ➔ "diễn biến"' },
  { wrong: 'chặt chẻ', right: 'chặt chẽ', reason: 'Sai dấu thanh: "chặt chẻ" ➔ "chặt chẽ"' },
  { wrong: 'kỹ lưởng', right: 'kỹ lưỡng', reason: 'Sai dấu thanh: "kỹ lưởng" ➔ "kỹ lưỡng"' },
  { wrong: 'kỉ lưỡng', right: 'kỹ lưỡng', reason: 'Sai chính tả: "kỉ lưỡng" ➔ "kỹ lưỡng"' },
  { wrong: 'kỷ lưởng', right: 'kỹ lưỡng', reason: 'Sai dấu thanh: "kỷ lưởng" ➔ "kỹ lưỡng"' },
  { wrong: 'đầy đũ', right: 'đầy đủ', reason: 'Sai dấu thanh: "đầy đũ" ➔ "đầy đủ"' },
  { wrong: 'nổ lực', right: 'nỗ lực', reason: 'Sai dấu thanh: "nổ lực" ➔ "nỗ lực"' },
  { wrong: 'hiệu quã', right: 'hiệu quả', reason: 'Sai dấu thanh: "hiệu quã" ➔ "hiệu quả"' },
  { wrong: 'nghỉa vụ', right: 'nghĩa vụ', reason: 'Sai dấu thanh: "nghỉa vụ" ➔ "nghĩa vụ"' },
  { wrong: 'cãn trở', right: 'cản trở', reason: 'Sai dấu thanh: "cãn trở" ➔ "cản trở"' },
  { wrong: 'bải bỏ', right: 'bãi bỏ', reason: 'Sai dấu thanh: "bải bỏ" ➔ "bãi bỏ"' },
  { wrong: 'biểu mẩu', right: 'biểu mẫu', reason: 'Sai dấu thanh: "biểu mẩu" ➔ "biểu mẫu"' },
  { wrong: 'bỗ sung', right: 'bổ sung', reason: 'Sai dấu thanh: "bỗ sung" ➔ "bổ sung"' },
  { wrong: 'chi trã', right: 'chi trả', reason: 'Sai dấu thanh: "chi trã" ➔ "chi trả"' },
  { wrong: 'củ kỹ', right: 'cũ kỹ', reason: 'Sai dấu thanh: "củ kỹ" ➔ "cũ kỹ"' },
  { wrong: 'đổ đạt', right: 'đỗ đạt', reason: 'Sai dấu thanh: "đổ đạt" ➔ "đỗ đạt"' },
  { wrong: 'gữi gắm', right: 'gửi gắm', reason: 'Sai dấu thanh: "gữi gắm" ➔ "gửi gắm"' },
  { wrong: 'mẩu mã', right: 'mẫu mã', reason: 'Sai dấu thanh: "mẩu mã" ➔ "mẫu mã"' },
  { wrong: 'ngở ngàng', right: 'ngỡ ngàng', reason: 'Sai dấu thanh: "ngở ngàng" ➔ "ngỡ ngàng"' },
  { wrong: 'rãi rác', right: 'rải rác', reason: 'Sai dấu thanh: "rãi rác" ➔ "rải rác"' },
  { wrong: 'rực rở', right: 'rực rỡ', reason: 'Sai dấu thanh: "rực rở" ➔ "rực rỡ"' },
  { wrong: 'sẳn sàng', right: 'sẵn sàng', reason: 'Sai dấu thanh: "sẳn sàng" ➔ "sẵn sàng"' },
  { wrong: 'sửa chửa', right: 'sửa chữa', reason: 'Sai dấu thanh: "sửa chửa" ➔ "sửa chữa"' },
  { wrong: 'sữa chữa', right: 'sửa chữa', reason: 'Sai dấu thanh: "sữa chữa" ➔ "sửa chữa"' },
  { wrong: 'sữa đổi', right: 'sửa đổi', reason: 'Sai dấu thanh: "sữa đổi" ➔ "sửa đổi"' },
  { wrong: 'vửng vàng', right: 'vững vàng', reason: 'Sai dấu thanh: "vửng vàng" ➔ "vững vàng"' },
  { wrong: 'xử phat', right: 'xử phạt', reason: 'Sai chính tả: "xử phat" ➔ "xử phạt"' },

  // 6. Lỗi phụ âm cuối c/t, n/ng
  { wrong: 'bắt buột', right: 'bắt buộc', reason: 'Sai phụ âm cuối: "bắt buột" ➔ "bắt buộc"' },
  { wrong: 'nghiêm ngặc', right: 'nghiêm ngặt', reason: 'Sai phụ âm cuối: "nghiêm ngặc" ➔ "nghiêm ngặt"' },
  { wrong: 'ngặc nghèo', right: 'ngặt nghèo', reason: 'Sai phụ âm cuối: "ngặc nghèo" ➔ "ngặt nghèo"' },
  { wrong: 'bàng quang', right: 'bàng quan', reason: 'Sai chính tả: "bàng quang" ➔ "bàng quan" (thờ ơ)' },
  { wrong: 'chính sát', right: 'chính xác', reason: 'Sai phụ âm cuối: "chính sát" ➔ "chính xác"' },
  { wrong: 'công tát', right: 'công tác', reason: 'Sai phụ âm cuối: "công tát" ➔ "công tác"' },
  { wrong: 'kế hoạc', right: 'kế hoạch', reason: 'Sai phụ âm cuối: "kế hoạc" ➔ "kế hoạch"' },
  { wrong: 'man mát', right: 'man mác', reason: 'Sai phụ âm cuối: "man mát" ➔ "man mác"' },
  { wrong: 'mất mác', right: 'mất mát', reason: 'Sai phụ âm cuối: "mất mác" ➔ "mất mát"' },
  { wrong: 'mộc mạt', right: 'mộc mạc', reason: 'Sai phụ âm cuối: "mộc mạt" ➔ "mộc mạc"' },
  { wrong: 'một mạc', right: 'một mạch', reason: 'Sai phụ âm cuối: "một mạc" ➔ "một mạch"' },
  { wrong: 'nồng nạc', right: 'nồng nặc', reason: 'Sai phụ âm cuối: "nồng nạc" ➔ "nồng nặc"' },
  { wrong: 'tắt trách', right: 'tắc trách', reason: 'Sai phụ âm cuối: "tắt trách" ➔ "tắc trách"' },
  { wrong: 'tất bậc', right: 'tất bật', reason: 'Sai phụ âm cuối: "tất bậc" ➔ "tất bật"' },
  { wrong: 'thắc chặt', right: 'thắt chặt', reason: 'Sai phụ âm cuối: "thắc chặt" ➔ "thắt chặt"' },

  // 7. Văn phong hành chính công vụ (Trang trọng, khách quan)
  { wrong: 'chúng tôi thấy rằng', right: 'nhận thấy', reason: 'Văn phong hành chính: Thay "chúng tôi thấy rằng" bằng "nhận thấy"', category: 'van_phong' },
  { wrong: 'chúng tôi đề nghị', right: 'đề nghị', reason: 'Văn phong hành chính: Bỏ đại từ "chúng tôi"', category: 'van_phong' },
  { wrong: 'báo cáo về cho chúng tôi', right: 'báo cáo về cơ quan chủ trì', reason: 'Văn phong hành chính: Không dùng "chúng tôi"', category: 'van_phong' },
  { wrong: 'các bác', right: 'các đồng chí', reason: 'Văn phong hành chính: Dùng "các đồng chí" hoặc chức danh', category: 'van_phong' },
  { wrong: 'làm gấp', right: 'khẩn trương triển khai thực hiện', reason: 'Văn phong hành chính: Thay khẩu ngữ "làm gấp"', category: 'van_phong' },
  { wrong: 'làm liền', right: 'triển khai ngay', reason: 'Văn phong hành chính: Thay từ khẩu ngữ "làm liền"', category: 'van_phong' },
  { wrong: 'nhanh chóng nhất có thể', right: 'trong thời gian sớm nhất', reason: 'Văn phong hành chính: Thay "nhanh chóng nhất có thể"', category: 'van_phong' },
  { wrong: 'suôn sẻ', right: 'đạt kết quả tốt', reason: 'Văn phong hành chính: Tránh từ cảm thán "suôn sẻ"', category: 'van_phong' },
  { wrong: 'chểnh mảng', right: 'thiếu tập trung, chưa thực hiện nghiêm túc', reason: 'Văn phong hành chính: Tránh dùng từ khẩu ngữ "chểnh mảng"', category: 'van_phong' },
  { wrong: 'đường lối lề lối luộm thuộm', right: 'tác phong công vụ chưa khoa học', reason: 'Văn phong hành chính: Chuẩn hóa tác phong công vụ', category: 'van_phong' },
  { wrong: 'qua loa, đại khái', right: 'chưa bảo đảm yêu cầu', reason: 'Văn phong hành chính: Tránh "qua loa, đại khái"', category: 'van_phong' },
  { wrong: 'qua loa đại khái', right: 'chưa bảo đảm yêu cầu', reason: 'Văn phong hành chính: Tránh "qua loa đại khái"', category: 'van_phong' },
  { wrong: 'rất mong cấp trên giúp đỡ', right: 'kính trình cấp có thẩm quyền xem xét, phê duyệt', reason: 'Văn phong hành chính: Dùng thể thức kính trình chuẩn', category: 'van_phong' },
  { wrong: 'tiền bạc', right: 'kinh phí', reason: 'Văn phong hành chính: Thay "tiền bạc" bằng "kinh phí"', category: 'van_phong' },
  { wrong: 'giấy tờ', right: 'hồ sơ, tài liệu', reason: 'Văn phong hành chính: Dùng "hồ sơ, tài liệu"', category: 'van_phong' },

  // 8. Chuẩn hóa thể thức thời gian & thứ trong tuần (Nghị định 30)
  { wrong: '8h sáng', right: '08 giờ 00 phút', reason: 'Thể thức NĐ 30: Thời gian ghi rõ "08 giờ 00 phút"', category: 'the_thuc' },
  { wrong: '14h chiều', right: '14 giờ 00 phút', reason: 'Thể thức NĐ 30: Thời gian ghi rõ "14 giờ 00 phút"', category: 'the_thuc' },
  { wrong: 'thứ 2 tuần sau', right: 'thứ Hai', reason: 'Thể thức NĐ 30: Thứ viết hoa chữ cái đầu (thứ Hai)', category: 'the_thuc' },
  { wrong: 'thứ 2', right: 'thứ Hai', reason: 'Thể thức NĐ 30: "thứ 2" viết là "thứ Hai"', category: 'the_thuc' },
  { wrong: 'thứ 3', right: 'thứ Ba', reason: 'Thể thức NĐ 30: "thứ 3" viết là "thứ Ba"', category: 'the_thuc' },
  { wrong: 'thứ 4', right: 'thứ Tư', reason: 'Thể thức NĐ 30: "thứ 4" viết là "thứ Tư"', category: 'the_thuc' },
  { wrong: 'thứ 5', right: 'thứ Năm', reason: 'Thể thức NĐ 30: "thứ 5" viết là "thứ Năm"', category: 'the_thuc' },
  { wrong: 'thứ 6', right: 'thứ Sáu', reason: 'Thể thức NĐ 30: "thứ 6" viết là "thứ Sáu"', category: 'the_thuc' },
  { wrong: 'thứ 7', right: 'thứ Bảy', reason: 'Thể thức NĐ 30: "thứ 7" viết là "thứ Bảy"', category: 'the_thuc' },

  // 9. Chuẩn hóa Tiêu ngữ & Căn cứ
  { wrong: 'Độc lập-Tự do-Hạnh phúc', right: 'Độc lập - Tự do - Hạnh phúc', reason: 'Thể thức NĐ 30: Tiêu ngữ có dấu cách trước và sau dấu gạch nối (-)', category: 'the_thuc' },
  { wrong: 'Độc Lập - Tự Do - Hạnh Phúc', right: 'Độc lập - Tự do - Hạnh phúc', reason: 'Thể thức NĐ 30: Tiêu ngữ viết hoa chữ cái đầu mỗi cụm từ (Độc lập - Tự do - Hạnh phúc)', category: 'the_thuc', caseSensitive: true },
  { wrong: 'ĐỘC LẬP - TỰ DO - HẠNH PHÚC', right: 'Độc lập - Tự do - Hạnh phúc', reason: 'Thể thức NĐ 30: Tiêu ngữ không viết hoa toàn bộ (Độc lập - Tự do - Hạnh phúc)', category: 'the_thuc', caseSensitive: true },
  { wrong: 'Căn cứ vào', right: 'Căn cứ', reason: 'Thể thức NĐ 30: Viết "Căn cứ", không viết "Căn cứ vào"', category: 'the_thuc' },

  // 10. Lỗi viết sai / nhầm từ thông dụng trong văn bản hành chính (Theo yêu cầu nâng cấp Tiểu Bảo Bối)
  { wrong: 'cơ quann', right: 'cơ quan', reason: 'Viết nhầm từ: "cơ quann" ➔ "cơ quan"', category: 'nham_tu' },
  { wrong: 'quyêt định', right: 'quyết định', reason: 'Sai dấu chính tả: "quyêt định" ➔ "quyết định"', category: 'chinh_ta' },
  { wrong: 'quyết đinh', right: 'quyết định', reason: 'Sai dấu chính tả: "quyết đinh" ➔ "quyết định"', category: 'chinh_ta' },
  { wrong: 'quyêt đinh', right: 'quyết định', reason: 'Sai dấu chính tả: "quyêt đinh" ➔ "quyết định"', category: 'chinh_ta' },
  { wrong: 'báo cáoo', right: 'báo cáo', reason: 'Viết nhầm từ: "báo cáoo" ➔ "báo cáo"', category: 'nham_tu' },
  { wrong: 'báo cáio', right: 'báo cáo', reason: 'Viết nhầm từ: "báo cáio" ➔ "báo cáo"', category: 'nham_tu' },
  { wrong: 'bao cáo', right: 'báo cáo', reason: 'Thiếu dấu sắc: "bao cáo" ➔ "báo cáo"', category: 'chinh_ta' },
  { wrong: 'kế hoạc', right: 'kế hoạch', reason: 'Sai phụ âm cuối: "kế hoạc" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'kế hoặch', right: 'kế hoạch', reason: 'Sai chính tả: "kế hoặch" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'kế hoach', right: 'kế hoạch', reason: 'Thiếu dấu thanh: "kế hoach" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'chuẩn bi', right: 'chuẩn bị', reason: 'Thiếu dấu thanh: "chuẩn bi" ➔ "chuẩn bị"', category: 'chinh_ta' },
  { wrong: 'thực hiên', right: 'thực hiện', reason: 'Thiếu dấu thanh: "thực hiên" ➔ "thực hiện"', category: 'chinh_ta' },
  { wrong: 'thưc hiện', right: 'thực hiện', reason: 'Sai dấu: "thưc hiện" ➔ "thực hiện"', category: 'chinh_ta' },
  { wrong: 'chủ tich', right: 'chủ tịch', reason: 'Thiếu dấu thanh: "chủ tich" ➔ "chủ tịch"', category: 'chinh_ta' },
  { wrong: 'phó chủ tich', right: 'phó chủ tịch', reason: 'Thiếu dấu thanh: "phó chủ tich" ➔ "phó chủ tịch"', category: 'chinh_ta' },
  { wrong: 'thủ tương', right: 'thủ tướng', reason: 'Thiếu dấu thanh: "thủ tương" ➔ "thủ tướng"', category: 'chinh_ta' },
  { wrong: 'chính phu', right: 'chính phủ', reason: 'Sai dấu thanh: "chính phu" ➔ "chính phủ"', category: 'chinh_ta' },
  { wrong: 'chính phũ', right: 'chính phủ', reason: 'Sai dấu thanh: "chính phũ" ➔ "chính phủ"', category: 'chinh_ta' },
  { wrong: 'nghị đinh', right: 'nghị định', reason: 'Thiếu dấu thanh: "nghị đinh" ➔ "nghị định"', category: 'chinh_ta' },
  { wrong: 'quyết nghi', right: 'quyết nghị', reason: 'Thiếu dấu thanh: "quyết nghi" ➔ "quyết nghị"', category: 'chinh_ta' },
  { wrong: 'quyêt nghị', right: 'quyết nghị', reason: 'Sai dấu thanh: "quyêt nghị" ➔ "quyết nghị"', category: 'chinh_ta' },
  { wrong: 'nghi quyết', right: 'nghị quyết', reason: 'Sai dấu thanh: "nghi quyết" ➔ "nghị quyết"', category: 'chinh_ta' },
  { wrong: 'nghị quyêt', right: 'nghị quyết', reason: 'Sai dấu sắc: "nghị quyêt" ➔ "nghị quyết"', category: 'chinh_ta' },
  { wrong: 'chỉ đao', right: 'chỉ đạo', reason: 'Thiếu dấu thanh: "chỉ đao" ➔ "chỉ đạo"', category: 'chinh_ta' },
  { wrong: 'chỉ đạoo', right: 'chỉ đạo', reason: 'Viết nhầm từ: "chỉ đạoo" ➔ "chỉ đạo"', category: 'nham_tu' },
  { wrong: 'nhiệm vu', right: 'nhiệm vụ', reason: 'Thiếu dấu thanh: "nhiệm vu" ➔ "nhiệm vụ"', category: 'chinh_ta' },
  { wrong: 'nhiệm vũ', right: 'nhiệm vụ', reason: 'Sai dấu thanh: "nhiệm vũ" ➔ "nhiệm vụ"', category: 'chinh_ta' },
  { wrong: 'nghiệm thuu', right: 'nghiệm thu', reason: 'Viết nhầm từ: "nghiệm thuu" ➔ "nghiệm thu"', category: 'nham_tu' },
  { wrong: 'công vann', right: 'công văn', reason: 'Viết nhầm từ: "công vann" ➔ "công văn"', category: 'nham_tu' },
  { wrong: 'thông báoo', right: 'thông báo', reason: 'Viết nhầm từ: "thông báoo" ➔ "thông báo"', category: 'nham_tu' },
  { wrong: 'tờ chình', right: 'tờ trình', reason: 'Sai phụ âm: "tờ chình" ➔ "tờ trình"', category: 'chinh_ta' },
  { wrong: 'tờ trinh', right: 'tờ trình', reason: 'Thiếu dấu huyền: "tờ trinh" ➔ "tờ trình"', category: 'chinh_ta' },
  { wrong: 'biên bãn', right: 'biên bản', reason: 'Sai dấu thanh: "biên bãn" ➔ "biên bản"', category: 'chinh_ta' },
  { wrong: 'biên ban', right: 'biên bản', reason: 'Thiếu dấu hỏi: "biên ban" ➔ "biên bản"', category: 'chinh_ta' },
  { wrong: 'đề nghi', right: 'đề nghị', reason: 'Thiếu dấu thanh: "đề nghi" ➔ "đề nghị"', category: 'chinh_ta' },
  { wrong: 'phối hơp', right: 'phối hợp', reason: 'Thiếu dấu thanh: "phối hơp" ➔ "phối hợp"', category: 'chinh_ta' },
  { wrong: 'phôi hợp', right: 'phối hợp', reason: 'Sai dấu: "phôi hợp" ➔ "phối hợp"', category: 'chinh_ta' },
  { wrong: 'tham mưuu', right: 'tham mưu', reason: 'Viết nhầm từ: "tham mưuu" ➔ "tham mưu"', category: 'nham_tu' },
  { wrong: 'đính kềm', right: 'đính kèm', reason: 'Sai chính tả: "đính kềm" ➔ "đính kèm"', category: 'chinh_ta' },
  { wrong: 'kính gữi', right: 'kính gửi', reason: 'Sai dấu thanh: "kính gữi" ➔ "kính gửi" (chỉ đề xuất, người dùng duyệt)', category: 'chinh_ta' },
  { wrong: 'kính gởi', right: 'kính gửi', reason: 'Phương ngữ: "kính gởi" ➔ "kính gửi" (chuẩn hành chính)', category: 'van_phong' },
  { wrong: 'kinh gửi', right: 'kính gửi', reason: 'Thiếu dấu sắc: "kinh gửi" ➔ "kính gửi"', category: 'chinh_ta' },
  { wrong: 'nơi nhân', right: 'nơi nhận', reason: 'Thiếu dấu nặng: "nơi nhân" ➔ "nơi nhận"', category: 'chinh_ta' },
  { wrong: 'liên quann', right: 'liên quan', reason: 'Viết nhầm từ: "liên quann" ➔ "liên quan"', category: 'nham_tu' },
  { wrong: 'tiến đô', right: 'tiến độ', reason: 'Thiếu dấu nặng: "tiến đô" ➔ "tiến độ"', category: 'chinh_ta' },
  { wrong: 'tiến đọ', right: 'tiến độ', reason: 'Sai dấu thanh: "tiến đọ" ➔ "tiến độ"', category: 'chinh_ta' },
  { wrong: 'kinh phi', right: 'kinh phí', reason: 'Thiếu dấu sắc: "kinh phi" ➔ "kinh phí"', category: 'chinh_ta' },
  { wrong: 'kinh phĩ', right: 'kinh phí', reason: 'Sai dấu: "kinh phĩ" ➔ "kinh phí"', category: 'chinh_ta' },
  { wrong: 'nội dungg', right: 'nội dung', reason: 'Viết nhầm từ: "nội dungg" ➔ "nội dung"', category: 'nham_tu' },
  { wrong: 'mục tiêuu', right: 'mục tiêu', reason: 'Viết nhầm từ: "mục tiêuu" ➔ "mục tiêu"', category: 'nham_tu' },
  { wrong: 'kết quã', right: 'kết quả', reason: 'Sai dấu thanh: "kết quã" ➔ "kết quả"', category: 'chinh_ta' },
  { wrong: 'kêt quả', right: 'kết quả', reason: 'Sai dấu: "kêt quả" ➔ "kết quả"', category: 'chinh_ta' },
  { wrong: 'thực tê', right: 'thực tế', reason: 'Thiếu dấu sắc: "thực tê" ➔ "thực tế"', category: 'chinh_ta' },
  { wrong: 'đánh dá', right: 'đánh giá', reason: 'Sai phụ âm: "đánh dá" ➔ "đánh giá"', category: 'chinh_ta' },
  { wrong: 'uy ban', right: 'ủy ban', reason: 'Chuẩn dấu thanh: "uy ban" ➔ "ủy ban"', category: 'chinh_ta' },
  { wrong: 'uỷ ban', right: 'ủy ban', reason: 'Chuẩn hóa dấu thanh: "uỷ ban" ➔ "ủy ban"', category: 'chinh_ta' },
  { wrong: 'đồng chíi', right: 'đồng chí', reason: 'Viết nhầm từ: "đồng chíi" ➔ "đồng chí"', category: 'nham_tu' },
  { wrong: 'đồng chi', right: 'đồng chí', reason: 'Thiếu dấu sắc: "đồng chi" ➔ "đồng chí"', category: 'chinh_ta' },
  { wrong: 'phê duyêt', right: 'phê duyệt', reason: 'Thiếu dấu nặng: "phê duyêt" ➔ "phê duyệt"', category: 'chinh_ta' },
  { wrong: 'phê duyết', right: 'phê duyệt', reason: 'Sai dấu thanh: "phê duyết" ➔ "phê duyệt"', category: 'chinh_ta' },
  { wrong: 'kết luân', right: 'kết luận', reason: 'Thiếu dấu nặng: "kết luân" ➔ "kết luận"', category: 'chinh_ta' },
  { wrong: 'nghiêm tút', right: 'nghiêm túc', reason: 'Sai phụ âm cuối: "nghiêm tút" ➔ "nghiêm túc"', category: 'chinh_ta' },
  { wrong: 'đáp ứn', right: 'đáp ứng', reason: 'Sai phụ âm cuối: "đáp ứn" ➔ "đáp ứng"', category: 'chinh_ta' },
  { wrong: 'thời han', right: 'thời hạn', reason: 'Thiếu dấu nặng: "thời han" ➔ "thời hạn"', category: 'chinh_ta' },
  { wrong: 'chấp hanh', right: 'chấp hành', reason: 'Thiếu dấu huyền: "chấp hanh" ➔ "chấp hành"', category: 'chinh_ta' },
  { wrong: 'ban hanh', right: 'ban hành', reason: 'Thiếu dấu huyền: "ban hanh" ➔ "ban hành"', category: 'chinh_ta' },
  { wrong: 'thủ tuc', right: 'thủ tục', reason: 'Thiếu dấu nặng: "thủ tuc" ➔ "thủ tục"', category: 'chinh_ta' },
  { wrong: 'hồ sơr', right: 'hồ sơ', reason: 'Viết nhầm từ: "hồ sơr" ➔ "hồ sơ"', category: 'nham_tu' },
  { wrong: 'giải quyêt', right: 'giải quyết', reason: 'Sai dấu sắc: "giải quyêt" ➔ "giải quyết"', category: 'chinh_ta' },
  { wrong: 'giai quyết', right: 'giải quyết', reason: 'Thiếu dấu hỏi: "giai quyết" ➔ "giải quyết"', category: 'chinh_ta' },
  { wrong: 'bảo đàm', right: 'bảo đảm', reason: 'Sai dấu thanh: "bảo đàm" ➔ "bảo đảm"', category: 'chinh_ta' },
  { wrong: 'bão đảm', right: 'bảo đảm', reason: 'Sai dấu thanh: "bão đảm" ➔ "bảo đảm"', category: 'chinh_ta' },
  { wrong: 'thẫm quyền', right: 'thẩm quyền', reason: 'Sai dấu thanh: "thẫm quyền" ➔ "thẩm quyền"', category: 'chinh_ta' },
  { wrong: 'thẩm quyên', right: 'thẩm quyền', reason: 'Sai dấu thanh: "thẩm quyên" ➔ "thẩm quyền"', category: 'chinh_ta' },
  { wrong: 'thảm quyền', right: 'thẩm quyền', reason: 'Sai dấu: "thảm quyền" ➔ "thẩm quyền"', category: 'chinh_ta' },
  { wrong: 'thảm định', right: 'thẩm định', reason: 'Sai dấu thanh: "thảm định" ➔ "thẩm định"', category: 'chinh_ta' },
  { wrong: 'thẫm định', right: 'thẩm định', reason: 'Sai dấu thanh: "thẫm định" ➔ "thẩm định"', category: 'chinh_ta' },
  { wrong: 'chưng thu', right: 'trưng thu', reason: 'Sai phụ âm: "chưng thu" ➔ "trưng thu"', category: 'chinh_ta' },
  { wrong: 'chưng dụng', right: 'trưng dụng', reason: 'Sai phụ âm: "chưng dụng" ➔ "trưng dụng"', category: 'chinh_ta' },
  { wrong: 'vản lai', right: 'vãng lai', reason: 'Sai dấu thanh: "vản lai" ➔ "vãng lai"', category: 'chinh_ta' },
  { wrong: 'xác xuất', right: 'xác suất', reason: 'Sai chính tả: "xác xuất" ➔ "xác suất"', category: 'chinh_ta' },
  { wrong: 'sác xuất', right: 'xác suất', reason: 'Sai chính tả: "sác xuất" ➔ "xác suất"', category: 'chinh_ta' },
  { wrong: 'căn cư', right: 'căn cứ', reason: 'Thiếu dấu sắc: "căn cư" ➔ "căn cứ"', category: 'chinh_ta' },
  { wrong: 'cắn cứ', right: 'căn cứ', reason: 'Sai dấu: "cắn cứ" ➔ "căn cứ"', category: 'chinh_ta' },
  { wrong: 'hương dẫn', right: 'hướng dẫn', reason: 'Thiếu dấu sắc: "hương dẫn" ➔ "hướng dẫn"', category: 'chinh_ta' },
  { wrong: 'phương hương', right: 'phương hướng', reason: 'Thiếu dấu sắc: "phương hương" ➔ "phương hướng"', category: 'chinh_ta' },
  { wrong: 'đơn vi', right: 'đơn vị', reason: 'Thiếu dấu nặng: "đơn vi" ➔ "đơn vị"', category: 'chinh_ta' },
  { wrong: 'cán bô', right: 'cán bộ', reason: 'Thiếu dấu nặng: "cán bô" ➔ "cán bộ"', category: 'chinh_ta' },
  { wrong: 'công chực', right: 'công chức', reason: 'Sai phụ âm cuối: "công chực" ➔ "công chức"', category: 'chinh_ta' },
  { wrong: 'công chúc', right: 'công chức', reason: 'Sai nguyên âm: "công chúc" ➔ "công chức"', category: 'chinh_ta' },
  { wrong: 'viên chực', right: 'viên chức', reason: 'Sai phụ âm cuối: "viên chực" ➔ "viên chức"', category: 'chinh_ta' },
  { wrong: 'viên chúc', right: 'viên chức', reason: 'Sai nguyên âm: "viên chúc" ➔ "viên chức"', category: 'chinh_ta' },
  { wrong: 'lảnh đạo', right: 'lãnh đạo', reason: 'Sai dấu thanh: "lảnh đạo" ➔ "lãnh đạo"', category: 'chinh_ta' },
  { wrong: 'khen thương', right: 'khen thưởng', reason: 'Sai dấu thanh: "khen thương" ➔ "khen thưởng"', category: 'chinh_ta' },
  { wrong: 'bồi thương', right: 'bồi thường', reason: 'Sai dấu: "bồi thương" ➔ "bồi thường"', category: 'chinh_ta' },
  { wrong: 'quy chể', right: 'quy chế', reason: 'Sai dấu: "quy chể" ➔ "quy chế"', category: 'chinh_ta' },
  { wrong: 'kiễm tra', right: 'kiểm tra', reason: 'Sai dấu ngã/hỏi: "kiễm tra" ➔ "kiểm tra"', category: 'chinh_ta' },
  { wrong: 'triễn khai', right: 'triển khai', reason: 'Sai dấu ngã/hỏi: "triễn khai" ➔ "triển khai"', category: 'chinh_ta' },
  { wrong: 'thiếu xót', right: 'thiếu sót', reason: 'Sai phụ âm s/x: "thiếu xót" ➔ "thiếu sót"', category: 'chinh_ta' },
  { wrong: 'xơ sót', right: 'sơ sót', reason: 'Sai phụ âm s/x: "xơ sót" ➔ "sơ sót"', category: 'chinh_ta' },
  { wrong: 'sai xót', right: 'sai sót', reason: 'Sai phụ âm s/x: "sai xót" ➔ "sai sót"', category: 'chinh_ta' },
  { wrong: 'quy hoạc', right: 'quy hoạch', reason: 'Sai phụ âm cuối: "quy hoạc" ➔ "quy hoạch"', category: 'chinh_ta' },
  { wrong: 'qui hoạch', right: 'quy hoạch', reason: 'Chuẩn chính tả: Dùng "y" dài trong "quy hoạch"', category: 'chinh_ta' },
  { wrong: 'văn bãn', right: 'văn bản', reason: 'Sai dấu ngã/hỏi: "văn bãn" ➔ "văn bản"', category: 'chinh_ta' },
  { wrong: 'ngân xách', right: 'ngân sách', reason: 'Sai phụ âm s/x: "ngân xách" ➔ "ngân sách"', category: 'chinh_ta' },
  { wrong: 'chi tiếc', right: 'chi tiết', reason: 'Sai phụ âm cuối c/t: "chi tiếc" ➔ "chi tiết"', category: 'chinh_ta' },
  { wrong: 'phòng bann', right: 'phòng ban', reason: 'Lỗi đánh máy: "phòng bann" ➔ "phòng ban"', category: 'nham_tu' },
  { wrong: 'tài chíng', right: 'tài chính', reason: 'Sai phụ âm cuối: "tài chíng" ➔ "tài chính"', category: 'chinh_ta' },
  { wrong: 'kế toan', right: 'kế toán', reason: 'Thiếu dấu sắc: "kế toan" ➔ "kế toán"', category: 'chinh_ta' },
  { wrong: 'áp dung', right: 'áp dụng', reason: 'Thiếu dấu nặng: "áp dung" ➔ "áp dụng"', category: 'chinh_ta' },
  { wrong: 'nghiêm chỉng', right: 'nghiêm chỉnh', reason: 'Sai phụ âm cuối: "nghiêm chỉng" ➔ "nghiêm chỉnh"', category: 'chinh_ta' },
  { wrong: 'giãi quyết', right: 'giải quyết', reason: 'Sai dấu ngã/hỏi: "giãi quyết" ➔ "giải quyết"', category: 'chinh_ta' },
  { wrong: 'thông tưr', right: 'thông tư', reason: 'Lỗi đánh máy: "thông tưr" ➔ "thông tư"', category: 'nham_tu' },
  { wrong: 'thong tư', right: 'thông tư', reason: 'Thiếu dấu: "thong tư" ➔ "thông tư"', category: 'chinh_ta' },
  { wrong: 'quyet dinh', right: 'quyết định', reason: 'Không dấu: "quyet dinh" ➔ "quyết định"', category: 'chinh_ta' },
  { wrong: 'hội đông', right: 'hội đồng', reason: 'Thiếu dấu huyền: "hội đông" ➔ "hội đồng"', category: 'chinh_ta' },
  { wrong: 'hoàng thành', right: 'hoàn thành', reason: 'Sai chính tả: "hoàng thành" ➔ "hoàn thành"', category: 'chinh_ta' },
  { wrong: 'tiếng hành', right: 'tiến hành', reason: 'Sai chính tả: "tiếng hành" ➔ "tiến hành"', category: 'chinh_ta' },
  { wrong: 'thànhh lập', right: 'thành lập', reason: 'Lỗi đánh máy: "thànhh lập" ➔ "thành lập"', category: 'nham_tu' },
  { wrong: 'chứcc năng', right: 'chức năng', reason: 'Lỗi đánh máy: "chứcc năng" ➔ "chức năng"', category: 'nham_tu' },
  { wrong: 'phối kết hợp', right: 'phối hợp', reason: 'Văn phong hành chính: Dùng "phối hợp", không dùng "phối kết hợp"', category: 'van_phong' },
  
  // 11. Lỗi đánh máy dính chữ trong các cụm từ hành chính
  { wrong: 'ubndxã', right: 'UBND xã', reason: 'Lỗi đánh máy dính chữ: "ubndxã" ➔ "UBND xã"', category: 'nham_tu' },
  { wrong: 'ubndphường', right: 'UBND phường', reason: 'Lỗi đánh máy dính chữ: "ubndphường" ➔ "UBND phường"', category: 'nham_tu' },
  { wrong: 'côngvăn', right: 'công văn', reason: 'Lỗi đánh máy dính chữ: "côngvăn" ➔ "công văn"', category: 'nham_tu' },
  { wrong: 'báocáo', right: 'báo cáo', reason: 'Lỗi đánh máy dính chữ: "báocáo" ➔ "báo cáo"', category: 'nham_tu' },
  { wrong: 'kếhoạch', right: 'kế hoạch', reason: 'Lỗi đánh máy dính chữ: "kếhoạch" ➔ "kế hoạch"', category: 'nham_tu' },
  { wrong: 'quyếtđịnh', right: 'quyết định', reason: 'Lỗi đánh máy dính chữ: "quyếtđịnh" ➔ "quyết định"', category: 'nham_tu' },
  { wrong: 'tờtrình', right: 'tờ trình', reason: 'Lỗi đánh máy dính chữ: "tờtrình" ➔ "tờ trình"', category: 'nham_tu' },
  { wrong: 'thôngbáo', right: 'thông báo', reason: 'Lỗi đánh máy dính chữ: "thôngbáo" ➔ "thông báo"', category: 'nham_tu' },
  { wrong: 'nghịđịnh', right: 'nghị định', reason: 'Lỗi đánh máy dính chữ: "nghịđịnh" ➔ "nghị định"', category: 'nham_tu' },
  { wrong: 'cánbộ', right: 'cán bộ', reason: 'Lỗi đánh máy dính chữ: "cánbộ" ➔ "cán bộ"', category: 'nham_tu' },
  { wrong: 'côngchức', right: 'công chức', reason: 'Lỗi đánh máy dính chữ: "côngchức" ➔ "công chức"', category: 'nham_tu' },
  { wrong: 'đồngchí', right: 'đồng chí', reason: 'Lỗi đánh máy dính chữ: "đồngchí" ➔ "đồng chí"', category: 'nham_tu' },
  { wrong: 'kínhgửi', right: 'kính gửi', reason: 'Lỗi đánh máy dính chữ: "kínhgửi" ➔ "kính gửi"', category: 'nham_tu' },
  { wrong: 'nơinhận', right: 'nơi nhận', reason: 'Lỗi đánh máy dính chữ: "nơinhận" ➔ "nơi nhận"', category: 'nham_tu' },
  { wrong: 'thựchiện', right: 'thực hiện', reason: 'Lỗi đánh máy dính chữ: "thựchiện" ➔ "thực hiện"', category: 'nham_tu' },
  { wrong: 'chủtịch', right: 'chủ tịch', reason: 'Lỗi đánh máy dính chữ: "chủtịch" ➔ "chủ tịch"', category: 'nham_tu' },
  { wrong: 'phóchủtịch', right: 'phó chủ tịch', reason: 'Lỗi đánh máy dính chữ: "phóchủtịch" ➔ "phó chủ tịch"', category: 'nham_tu' },
  { wrong: 'hồsơ', right: 'hồ sơ', reason: 'Lỗi đánh máy dính chữ: "hồsơ" ➔ "hồ sơ"', category: 'nham_tu' },
  { wrong: 'nộidung', right: 'nội dung', reason: 'Lỗi đánh máy dính chữ: "nộidung" ➔ "nội dung"', category: 'nham_tu' },

  // 12. Lỗi đánh máy, thiếu dấu, đảo ký tự, thiếu ký tự và viết không dấu trong cụm hành chính
  // A. Lỗi đảo ký tự & gõ nhầm cơ quan
  { wrong: 'UNBD thành phố', right: 'UBND thành phố', reason: 'Đảo ký tự cơ quan: "UNBD thành phố" ➔ "UBND thành phố"', category: 'nham_tu' },
  { wrong: 'UNBD phường', right: 'UBND phường', reason: 'Đảo ký tự cơ quan: "UNBD phường" ➔ "UBND phường"', category: 'nham_tu' },
  { wrong: 'UNBD huyện', right: 'UBND huyện', reason: 'Đảo ký tự cơ quan: "UNBD huyện" ➔ "UBND huyện"', category: 'nham_tu' },
  { wrong: 'UNBD tinh', right: 'UBND tỉnh', reason: 'Đảo ký tự & thiếu dấu: "UNBD tinh" ➔ "UBND tỉnh"', category: 'nham_tu' },
  { wrong: 'UNBD tỉnh', right: 'UBND tỉnh', reason: 'Đảo ký tự cơ quan: "UNBD tỉnh" ➔ "UBND tỉnh"', category: 'nham_tu' },
  { wrong: 'UNBD quận', right: 'UBND quận', reason: 'Đảo ký tự cơ quan: "UNBD quận" ➔ "UBND quận"', category: 'nham_tu' },
  { wrong: 'UNBD xã', right: 'UBND xã', reason: 'Đảo ký tự cơ quan: "UNBD xã" ➔ "UBND xã"', category: 'nham_tu' },
  { wrong: 'UNBD', right: 'UBND', reason: 'Đảo ký tự cơ quan: "UNBD" ➔ "UBND"', category: 'nham_tu' },
  { wrong: 'UBNĐ', right: 'UBND', reason: 'Gõ nhầm ký tự: "UBNĐ" ➔ "UBND"', category: 'nham_tu' },
  { wrong: 'UNBĐ', right: 'UBND', reason: 'Đảo ký tự & nhầm Đ: "UNBĐ" ➔ "UBND"', category: 'nham_tu' },
  { wrong: 'UBDN', right: 'UBND', reason: 'Đảo ký tự cơ quan: "UBDN" ➔ "UBND"', category: 'nham_tu' },
  { wrong: 'UBND tinh', right: 'UBND tỉnh', reason: 'Thiếu dấu tiếng Việt: "UBND tinh" ➔ "UBND tỉnh"', category: 'chinh_ta' },
  { wrong: 'HĐND tinh', right: 'HĐND tỉnh', reason: 'Thiếu dấu tiếng Việt: "HĐND tinh" ➔ "HĐND tỉnh"', category: 'chinh_ta' },
  { wrong: 'HDND tinh', right: 'HĐND tỉnh', reason: 'Thiếu dấu: "HDND tinh" ➔ "HĐND tỉnh"', category: 'chinh_ta' },
  { wrong: 'HDND', right: 'HĐND', reason: 'Thiếu dấu chữ Đ: "HDND" ➔ "HĐND"', category: 'nham_tu' },
  { wrong: 'HDNĐ', right: 'HĐND', reason: 'Gõ nhầm chữ Đ cuối: "HDNĐ" ➔ "HĐND"', category: 'nham_tu' },

  // B. Bảng lỗi cụ thể theo yêu cầu: tuyên truyền, thực hiện, kết quả, căn cứ, đề nghị, triển khai, quản lý, nhân dân, chủ tịch, phó chủ tịch, thông báo, báo cáo, kế hoạch
  { wrong: 'tyên truyen', right: 'tuyên truyền', reason: 'Lỗi gõ nhầm & thiếu dấu: "tyên truyen" ➔ "tuyên truyền"', category: 'chinh_ta' },
  { wrong: 'tuyen truyen', right: 'tuyên truyền', reason: 'Viết không dấu: "tuyen truyen" ➔ "tuyên truyền"', category: 'chinh_ta' },
  { wrong: 'tyên truyền', right: 'tuyên truyền', reason: 'Lỗi gõ nhầm: "tyên truyền" ➔ "tuyên truyền"', category: 'chinh_ta' },
  { wrong: 'tuyên truyen', right: 'tuyên truyền', reason: 'Thiếu dấu: "tuyên truyen" ➔ "tuyên truyền"', category: 'chinh_ta' },
  { wrong: 'tuyêntruyền', right: 'tuyên truyền', reason: 'Lỗi dính chữ: "tuyêntruyền" ➔ "tuyên truyền"', category: 'nham_tu' },
  { wrong: 'tuyentruyen', right: 'tuyên truyền', reason: 'Lỗi dính chữ không dấu: "tuyentruyen" ➔ "tuyên truyền"', category: 'nham_tu' },

  { wrong: 'thc hien', right: 'thực hiện', reason: 'Lỗi thiếu ký tự đánh máy: "thc hien" ➔ "thực hiện"', category: 'chinh_ta' },
  { wrong: 'thc hiện', right: 'thực hiện', reason: 'Lỗi thiếu ký tự: "thc hiện" ➔ "thực hiện"', category: 'chinh_ta' },
  { wrong: 'thuc hien', right: 'thực hiện', reason: 'Viết không dấu: "thuc hien" ➔ "thực hiện"', category: 'chinh_ta' },
  { wrong: 'thực hiên', right: 'thực hiện', reason: 'Thiếu dấu nặng: "thực hiên" ➔ "thực hiện"', category: 'chinh_ta' },
  { wrong: 'thưc hiện', right: 'thực hiện', reason: 'Thiếu dấu nặng: "thưc hiện" ➔ "thực hiện"', category: 'chinh_ta' },
  { wrong: 'thựcc hiện', right: 'thực hiện', reason: 'Lỗi lặp ký tự: "thựcc hiện" ➔ "thực hiện"', category: 'nham_tu' },
  { wrong: 'thuchien', right: 'thực hiện', reason: 'Lỗi dính chữ: "thuchien" ➔ "thực hiện"', category: 'nham_tu' },

  { wrong: 'ket qua', right: 'kết quả', reason: 'Viết không dấu: "ket qua" ➔ "kết quả"', category: 'chinh_ta' },
  { wrong: 'kêt quả', right: 'kết quả', reason: 'Thiếu dấu sắc: "kêt quả" ➔ "kết quả"', category: 'chinh_ta' },
  { wrong: 'kết qua', right: 'kết quả', reason: 'Thiếu dấu hỏi: "kết qua" ➔ "kết quả"', category: 'chinh_ta' },
  { wrong: 'ketqua', right: 'kết quả', reason: 'Lỗi dính chữ: "ketqua" ➔ "kết quả"', category: 'nham_tu' },
  { wrong: 'kếtquả', right: 'kết quả', reason: 'Lỗi dính chữ: "kếtquả" ➔ "kết quả"', category: 'nham_tu' },

  { wrong: 'can cu', right: 'căn cứ', reason: 'Viết không dấu: "can cu" ➔ "căn cứ"', category: 'chinh_ta' },
  { wrong: 'căn cu', right: 'căn cứ', reason: 'Thiếu dấu sắc: "căn cu" ➔ "căn cứ"', category: 'chinh_ta' },
  { wrong: 'can cứ', right: 'căn cứ', reason: 'Thiếu dấu á: "can cứ" ➔ "căn cứ"', category: 'chinh_ta' },
  { wrong: 'cancu', right: 'căn cứ', reason: 'Lỗi dính chữ: "cancu" ➔ "căn cứ"', category: 'nham_tu' },
  { wrong: 'căncứ', right: 'căn cứ', reason: 'Lỗi dính chữ: "căncứ" ➔ "căn cứ"', category: 'nham_tu' },

  { wrong: 'de nghi', right: 'đề nghị', reason: 'Viết không dấu: "de nghi" ➔ "đề nghị"', category: 'chinh_ta' },
  { wrong: 'đề nghi', right: 'đề nghị', reason: 'Thiếu dấu nặng: "đề nghi" ➔ "đề nghị"', category: 'chinh_ta' },
  { wrong: 'de nghị', right: 'đề nghị', reason: 'Thiếu dấu chữ đ/ê: "de nghị" ➔ "đề nghị"', category: 'chinh_ta' },
  { wrong: 'đê nghị', right: 'đề nghị', reason: 'Thiếu dấu huyền: "đê nghị" ➔ "đề nghị"', category: 'chinh_ta' },
  { wrong: 'denghi', right: 'đề nghị', reason: 'Lỗi dính chữ: "denghi" ➔ "đề nghị"', category: 'nham_tu' },
  { wrong: 'đềnghị', right: 'đề nghị', reason: 'Lỗi dính chữ: "đềnghị" ➔ "đề nghị"', category: 'nham_tu' },

  { wrong: 'trien khai', right: 'triển khai', reason: 'Viết không dấu: "trien khai" ➔ "triển khai"', category: 'chinh_ta' },
  { wrong: 'triên khai', right: 'triển khai', reason: 'Sai dấu ngã/hỏi: "triên khai" ➔ "triển khai"', category: 'chinh_ta' },
  { wrong: 'trienkhai', right: 'triển khai', reason: 'Lỗi dính chữ: "trienkhai" ➔ "triển khai"', category: 'nham_tu' },
  { wrong: 'triểnkhai', right: 'triển khai', reason: 'Lỗi dính chữ: "triểnkhai" ➔ "triển khai"', category: 'nham_tu' },

  { wrong: 'quan ly', right: 'quản lý', reason: 'Viết không dấu: "quan ly" ➔ "quản lý"', category: 'chinh_ta' },
  { wrong: 'quan lý', right: 'quản lý', reason: 'Thiếu dấu hỏi: "quan lý" ➔ "quản lý"', category: 'chinh_ta' },
  { wrong: 'quản lí', right: 'quản lý', reason: 'Chuẩn văn bản hành chính NĐ 30: "quản lí" ➔ "quản lý"', category: 'chinh_ta' },
  { wrong: 'quanly', right: 'quản lý', reason: 'Lỗi dính chữ: "quanly" ➔ "quản lý"', category: 'nham_tu' },
  { wrong: 'quảnlý', right: 'quản lý', reason: 'Lỗi dính chữ: "quảnlý" ➔ "quản lý"', category: 'nham_tu' },

  { wrong: 'nhan dan', right: 'nhân dân', reason: 'Viết không dấu: "nhan dan" ➔ "nhân dân"', category: 'chinh_ta' },
  { wrong: 'nhân dan', right: 'nhân dân', reason: 'Thiếu dấu: "nhân dan" ➔ "nhân dân"', category: 'chinh_ta' },
  { wrong: 'nhan dân', right: 'nhân dân', reason: 'Thiếu dấu: "nhan dân" ➔ "nhân dân"', category: 'chinh_ta' },
  { wrong: 'nhandan', right: 'nhân dân', reason: 'Lỗi dính chữ: "nhandan" ➔ "nhân dân"', category: 'nham_tu' },
  { wrong: 'nhândân', right: 'nhân dân', reason: 'Lỗi dính chữ: "nhândân" ➔ "nhân dân"', category: 'nham_tu' },

  { wrong: 'pho chu tich', right: 'phó chủ tịch', reason: 'Viết không dấu: "pho chu tich" ➔ "phó chủ tịch"', category: 'chinh_ta' },
  { wrong: 'phó chu tich', right: 'phó chủ tịch', reason: 'Thiếu dấu: "phó chu tich" ➔ "phó chủ tịch"', category: 'chinh_ta' },
  { wrong: 'pho chủ tịch', right: 'phó chủ tịch', reason: 'Thiếu dấu sắc: "pho chủ tịch" ➔ "phó chủ tịch"', category: 'chinh_ta' },
  { wrong: 'phochutich', right: 'phó chủ tịch', reason: 'Lỗi dính chữ: "phochutich" ➔ "phó chủ tịch"', category: 'nham_tu' },
  { wrong: 'phóchủtịch', right: 'phó chủ tịch', reason: 'Lỗi dính chữ: "phóchủtịch" ➔ "phó chủ tịch"', category: 'nham_tu' },

  { wrong: 'chu tich', right: 'chủ tịch', reason: 'Viết không dấu: "chu tich" ➔ "chủ tịch"', category: 'chinh_ta' },
  { wrong: 'chủ tich', right: 'chủ tịch', reason: 'Thiếu dấu nặng: "chủ tich" ➔ "chủ tịch"', category: 'chinh_ta' },
  { wrong: 'chu tịch', right: 'chủ tịch', reason: 'Thiếu dấu hỏi: "chu tịch" ➔ "chủ tịch"', category: 'chinh_ta' },
  { wrong: 'chutich', right: 'chủ tịch', reason: 'Lỗi dính chữ: "chutich" ➔ "chủ tịch"', category: 'nham_tu' },
  { wrong: 'chủtịch', right: 'chủ tịch', reason: 'Lỗi dính chữ: "chủtịch" ➔ "chủ tịch"', category: 'nham_tu' },

  { wrong: 'thong bao', right: 'thông báo', reason: 'Viết không dấu: "thong bao" ➔ "thông báo"', category: 'chinh_ta' },
  { wrong: 'thông bao', right: 'thông báo', reason: 'Thiếu dấu sắc: "thông bao" ➔ "thông báo"', category: 'chinh_ta' },
  { wrong: 'thong báo', right: 'thông báo', reason: 'Thiếu dấu ô: "thong báo" ➔ "thông báo"', category: 'chinh_ta' },
  { wrong: 'thongbao', right: 'thông báo', reason: 'Lỗi dính chữ: "thongbao" ➔ "thông báo"', category: 'nham_tu' },
  { wrong: 'thôngbáo', right: 'thông báo', reason: 'Lỗi dính chữ: "thôngbáo" ➔ "thông báo"', category: 'nham_tu' },

  { wrong: 'bao cao', right: 'báo cáo', reason: 'Viết không dấu: "bao cao" ➔ "báo cáo"', category: 'chinh_ta' },
  { wrong: 'báo cao', right: 'báo cáo', reason: 'Thiếu dấu sắc: "báo cao" ➔ "báo cáo"', category: 'chinh_ta' },
  { wrong: 'bao cáo', right: 'báo cáo', reason: 'Thiếu dấu sắc: "bao cáo" ➔ "báo cáo"', category: 'chinh_ta' },
  { wrong: 'baocao', right: 'báo cáo', reason: 'Lỗi dính chữ: "baocao" ➔ "báo cáo"', category: 'nham_tu' },
  { wrong: 'báocáo', right: 'báo cáo', reason: 'Lỗi dính chữ: "báocáo" ➔ "báo cáo"', category: 'nham_tu' },

  { wrong: 'ke hoach', right: 'kế hoạch', reason: 'Viết không dấu: "ke hoach" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'kế hoach', right: 'kế hoạch', reason: 'Thiếu dấu nặng: "kế hoach" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'ke hoạch', right: 'kế hoạch', reason: 'Thiếu dấu sắc: "ke hoạch" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'kế hoạc', right: 'kế hoạch', reason: 'Thiếu ký tự h: "kế hoạc" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'kế hoạh', right: 'kế hoạch', reason: 'Thiếu ký tự c: "kế hoạh" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'kehoach', right: 'kế hoạch', reason: 'Lỗi dính chữ: "kehoach" ➔ "kế hoạch"', category: 'nham_tu' },
  { wrong: 'kếhoạch', right: 'kế hoạch', reason: 'Lỗi dính chữ: "kếhoạch" ➔ "kế hoạch"', category: 'nham_tu' },

  // C. Các cụm từ hành chính thiếu dấu / sai dấu thông dụng khác
  { wrong: 'trên địa bàn tinh', right: 'trên địa bàn tỉnh', reason: 'Thiếu dấu: "trên địa bàn tinh" ➔ "trên địa bàn tỉnh"', category: 'chinh_ta' },
  { wrong: 'trên địa bàn phuong', right: 'trên địa bàn phường', reason: 'Thiếu dấu: "trên địa bàn phuong" ➔ "trên địa bàn phường"', category: 'chinh_ta' },
  { wrong: 'trên địa bàn xa', right: 'trên địa bàn xã', reason: 'Thiếu dấu: "trên địa bàn xa" ➔ "trên địa bàn xã"', category: 'chinh_ta' },
  { wrong: 'địa bàn tinh', right: 'địa bàn tỉnh', reason: 'Thiếu dấu: "địa bàn tinh" ➔ "địa bàn tỉnh"', category: 'chinh_ta' },
  { wrong: 'dia ban tinh', right: 'địa bàn tỉnh', reason: 'Viết không dấu: "dia ban tinh" ➔ "địa bàn tỉnh"', category: 'chinh_ta' },
  { wrong: 'địa bàn phuong', right: 'địa bàn phường', reason: 'Thiếu dấu: "địa bàn phuong" ➔ "địa bàn phường"', category: 'chinh_ta' },
  { wrong: 'dia ban phuong', right: 'địa bàn phường', reason: 'Viết không dấu: "dia ban phuong" ➔ "địa bàn phường"', category: 'chinh_ta' },
  { wrong: 'địa bàn xa', right: 'địa bàn xã', reason: 'Thiếu dấu: "địa bàn xa" ➔ "địa bàn xã"', category: 'chinh_ta' },
  { wrong: 'dia ban xa', right: 'địa bàn xã', reason: 'Viết không dấu: "dia ban xa" ➔ "địa bàn xã"', category: 'chinh_ta' },
  { wrong: 'địa bàn huyen', right: 'địa bàn huyện', reason: 'Thiếu dấu: "địa bàn huyen" ➔ "địa bàn huyện"', category: 'chinh_ta' },
  { wrong: 'dia ban huyen', right: 'địa bàn huyện', reason: 'Viết không dấu: "dia ban huyen" ➔ "địa bàn huyện"', category: 'chinh_ta' },

  { wrong: 'toàn tinh', right: 'toàn tỉnh', reason: 'Thiếu dấu: "toàn tinh" ➔ "toàn tỉnh"', category: 'chinh_ta' },
  { wrong: 'toan tinh', right: 'toàn tỉnh', reason: 'Viết không dấu: "toan tinh" ➔ "toàn tỉnh"', category: 'chinh_ta' },
  { wrong: 'toàn phuong', right: 'toàn phường', reason: 'Thiếu dấu: "toàn phuong" ➔ "toàn phường"', category: 'chinh_ta' },
  { wrong: 'toan phuong', right: 'toàn phường', reason: 'Viết không dấu: "toan phuong" ➔ "toàn phường"', category: 'chinh_ta' },
  { wrong: 'toàn xa', right: 'toàn xã', reason: 'Thiếu dấu: "toàn xa" ➔ "toàn xã"', category: 'chinh_ta' },
  { wrong: 'toan xa', right: 'toàn xã', reason: 'Viết không dấu: "toan xa" ➔ "toàn xã"', category: 'chinh_ta' },
  { wrong: 'toàn huyen', right: 'toàn huyện', reason: 'Thiếu dấu: "toàn huyen" ➔ "toàn huyện"', category: 'chinh_ta' },
  { wrong: 'toan huyen', right: 'toàn huyện', reason: 'Viết không dấu: "toan huyen" ➔ "toàn huyện"', category: 'chinh_ta' },

  { wrong: 'cấp tinh', right: 'cấp tỉnh', reason: 'Thiếu dấu: "cấp tinh" ➔ "cấp tỉnh"', category: 'chinh_ta' },
  { wrong: 'cap tinh', right: 'cấp tỉnh', reason: 'Viết không dấu: "cap tinh" ➔ "cấp tỉnh"', category: 'chinh_ta' },
  { wrong: 'cấp phuong', right: 'cấp phường', reason: 'Thiếu dấu: "cấp phuong" ➔ "cấp phường"', category: 'chinh_ta' },
  { wrong: 'cap phuong', right: 'cấp phường', reason: 'Viết không dấu: "cap phuong" ➔ "cấp phường"', category: 'chinh_ta' },
  { wrong: 'cấp xa', right: 'cấp xã', reason: 'Thiếu dấu: "cấp xa" ➔ "cấp xã"', category: 'chinh_ta' },
  { wrong: 'cap xa', right: 'cấp xã', reason: 'Viết không dấu: "cap xa" ➔ "cấp xã"', category: 'chinh_ta' },
  { wrong: 'cấp huyen', right: 'cấp huyện', reason: 'Thiếu dấu: "cấp huyen" ➔ "cấp huyện"', category: 'chinh_ta' },
  { wrong: 'cap huyen', right: 'cấp huyện', reason: 'Viết không dấu: "cap huyen" ➔ "cấp huyện"', category: 'chinh_ta' },
  { wrong: 'cấp quan', right: 'cấp quận', reason: 'Thiếu dấu: "cấp quan" ➔ "cấp quận"', category: 'chinh_ta' },
  { wrong: 'cap quan', right: 'cấp quận', reason: 'Viết không dấu: "cap quan" ➔ "cấp quận"', category: 'chinh_ta' },

  { wrong: 'tinh ủy', right: 'tỉnh ủy', reason: 'Thiếu dấu hỏi: "tinh ủy" ➔ "tỉnh ủy"', category: 'chinh_ta' },
  { wrong: 'tinh uỷ', right: 'tỉnh ủy', reason: 'Thiếu dấu hỏi: "tinh uỷ" ➔ "tỉnh ủy"', category: 'chinh_ta' },
  { wrong: 'UBND phuong', right: 'UBND phường', reason: 'Thiếu dấu: "UBND phuong" ➔ "UBND phường"', category: 'chinh_ta' },
  { wrong: 'ubnd phuong', right: 'UBND phường', reason: 'Thiếu dấu: "ubnd phuong" ➔ "UBND phường"', category: 'chinh_ta' },
  { wrong: 'UBND huyen', right: 'UBND huyện', reason: 'Thiếu dấu: "UBND huyen" ➔ "UBND huyện"', category: 'chinh_ta' },
  { wrong: 'ubnd huyen', right: 'UBND huyện', reason: 'Thiếu dấu: "ubnd huyen" ➔ "UBND huyện"', category: 'chinh_ta' },
  { wrong: 'UBND quan', right: 'UBND quận', reason: 'Thiếu dấu: "UBND quan" ➔ "UBND quận"', category: 'chinh_ta' },
  { wrong: 'ubnd quan', right: 'UBND quận', reason: 'Thiếu dấu: "ubnd quan" ➔ "UBND quận"', category: 'chinh_ta' },
  { wrong: 'UBND xa', right: 'UBND xã', reason: 'Thiếu dấu: "UBND xa" ➔ "UBND xã"', category: 'chinh_ta' },
  { wrong: 'ubnd xa', right: 'UBND xã', reason: 'Thiếu dấu: "ubnd xa" ➔ "UBND xã"', category: 'chinh_ta' },
  { wrong: 'HĐND phuong', right: 'HĐND phường', reason: 'Thiếu dấu: "HĐND phuong" ➔ "HĐND phường"', category: 'chinh_ta' },
  { wrong: 'HĐND huyen', right: 'HĐND huyện', reason: 'Thiếu dấu: "HĐND huyen" ➔ "HĐND huyện"', category: 'chinh_ta' },
  { wrong: 'HĐND quan', right: 'HĐND quận', reason: 'Thiếu dấu: "HĐND quan" ➔ "HĐND quận"', category: 'chinh_ta' },
  { wrong: 'HĐND xa', right: 'HĐND xã', reason: 'Thiếu dấu: "HĐND xa" ➔ "HĐND xã"', category: 'chinh_ta' },

  { wrong: 'quyết đinh', right: 'quyết định', reason: 'Thiếu dấu nặng: "quyết đinh" ➔ "quyết định"', category: 'chinh_ta' },
  { wrong: 'quyet dinh', right: 'quyết định', reason: 'Viết không dấu: "quyet dinh" ➔ "quyết định"', category: 'chinh_ta' },
  { wrong: 'quyêt định', right: 'quyết định', reason: 'Thiếu dấu sắc: "quyêt định" ➔ "quyết định"', category: 'chinh_ta' },
  { wrong: 'quyetdinh', right: 'quyết định', reason: 'Lỗi dính chữ: "quyetdinh" ➔ "quyết định"', category: 'nham_tu' },

  { wrong: 'tờ trinh', right: 'tờ trình', reason: 'Thiếu dấu huyền: "tờ trinh" ➔ "tờ trình"', category: 'chinh_ta' },
  { wrong: 'to trinh', right: 'tờ trình', reason: 'Viết không dấu: "to trinh" ➔ "tờ trình"', category: 'chinh_ta' },
  { wrong: 'totrinh', right: 'tờ trình', reason: 'Lỗi dính chữ: "totrinh" ➔ "tờ trình"', category: 'nham_tu' },

  { wrong: 'công van', right: 'công văn', reason: 'Thiếu dấu: "công van" ➔ "công văn"', category: 'chinh_ta' },
  { wrong: 'cong van', right: 'công văn', reason: 'Viết không dấu: "cong van" ➔ "công văn"', category: 'chinh_ta' },
  { wrong: 'congvan', right: 'công văn', reason: 'Lỗi dính chữ: "congvan" ➔ "công văn"', category: 'nham_tu' },

  { wrong: 'nghị đinh', right: 'nghị định', reason: 'Thiếu dấu nặng: "nghị đinh" ➔ "nghị định"', category: 'chinh_ta' },
  { wrong: 'nghi dinh', right: 'nghị định', reason: 'Viết không dấu: "nghi dinh" ➔ "nghị định"', category: 'chinh_ta' },
  { wrong: 'nghidinh', right: 'nghị định', reason: 'Lỗi dính chữ: "nghidinh" ➔ "nghị định"', category: 'nham_tu' },

  { wrong: 'thông tu', right: 'thông tư', reason: 'Thiếu dấu: "thông tu" ➔ "thông tư"', category: 'chinh_ta' },
  { wrong: 'thongtu', right: 'thông tư', reason: 'Lỗi dính chữ: "thongtu" ➔ "thông tư"', category: 'nham_tu' },

  { wrong: 'hướng dan', right: 'hướng dẫn', reason: 'Thiếu dấu: "hướng dan" ➔ "hướng dẫn"', category: 'chinh_ta' },
  { wrong: 'huong dan', right: 'hướng dẫn', reason: 'Viết không dấu: "huong dan" ➔ "hướng dẫn"', category: 'chinh_ta' },
  { wrong: 'huongdan', right: 'hướng dẫn', reason: 'Lỗi dính chữ: "huongdan" ➔ "hướng dẫn"', category: 'nham_tu' },

  { wrong: 'quy che', right: 'quy chế', reason: 'Viết không dấu: "quy che" ➔ "quy chế"', category: 'chinh_ta' },
  { wrong: 'quyche', right: 'quy chế', reason: 'Lỗi dính chữ: "quyche" ➔ "quy chế"', category: 'nham_tu' },

  { wrong: 'quy dinh', right: 'quy định', reason: 'Viết không dấu: "quy dinh" ➔ "quy định"', category: 'chinh_ta' },
  { wrong: 'quydinh', right: 'quy định', reason: 'Lỗi dính chữ: "quydinh" ➔ "quy định"', category: 'nham_tu' },

  { wrong: 'kính gui', right: 'kính gửi', reason: 'Thiếu dấu hỏi: "kính gui" ➔ "kính gửi"', category: 'chinh_ta' },
  { wrong: 'kinh gui', right: 'kính gửi', reason: 'Viết không dấu: "kinh gui" ➔ "kính gửi"', category: 'chinh_ta' },
  { wrong: 'kinhgui', right: 'kính gửi', reason: 'Lỗi dính chữ: "kinhgui" ➔ "kính gửi"', category: 'nham_tu' },

  { wrong: 'nơi nhan', right: 'nơi nhận', reason: 'Thiếu dấu nặng: "nơi nhan" ➔ "nơi nhận"', category: 'chinh_ta' },
  { wrong: 'noi nhan', right: 'nơi nhận', reason: 'Viết không dấu: "noi nhan" ➔ "nơi nhận"', category: 'chinh_ta' },
  { wrong: 'noinhan', right: 'nơi nhận', reason: 'Lỗi dính chữ: "noinhan" ➔ "nơi nhận"', category: 'nham_tu' },

  { wrong: 'đồng chi', right: 'đồng chí', reason: 'Thiếu dấu sắc: "đồng chi" ➔ "đồng chí"', category: 'chinh_ta' },
  { wrong: 'dong chi', right: 'đồng chí', reason: 'Viết không dấu: "dong chi" ➔ "đồng chí"', category: 'chinh_ta' },
  { wrong: 'dongchi', right: 'đồng chí', reason: 'Lỗi dính chữ: "dongchi" ➔ "đồng chí"', category: 'nham_tu' },

  { wrong: 'cán bo', right: 'cán bộ', reason: 'Thiếu dấu: "cán bo" ➔ "cán bộ"', category: 'chinh_ta' },
  { wrong: 'can bo', right: 'cán bộ', reason: 'Viết không dấu: "can bo" ➔ "cán bộ"', category: 'chinh_ta' },
  { wrong: 'canbo', right: 'cán bộ', reason: 'Lỗi dính chữ: "canbo" ➔ "cán bộ"', category: 'nham_tu' },

  { wrong: 'công chuc', right: 'công chức', reason: 'Thiếu dấu sắc: "công chuc" ➔ "công chức"', category: 'chinh_ta' },
  { wrong: 'cong chuc', right: 'công chức', reason: 'Viết không dấu: "cong chuc" ➔ "công chức"', category: 'chinh_ta' },
  { wrong: 'congchuc', right: 'công chức', reason: 'Lỗi dính chữ: "congchuc" ➔ "công chức"', category: 'nham_tu' },

  { wrong: 'địa ban', right: 'địa bàn', reason: 'Thiếu dấu huyền: "địa ban" ➔ "địa bàn"', category: 'chinh_ta' },
  { wrong: 'dia ban', right: 'địa bàn', reason: 'Viết không dấu: "dia ban" ➔ "địa bàn"', category: 'chinh_ta' },
  { wrong: 'diaban', right: 'địa bàn', reason: 'Lỗi dính chữ: "diaban" ➔ "địa bàn"', category: 'nham_tu' },

  { wrong: 'địa phuong', right: 'địa phương', reason: 'Thiếu dấu: "địa phuong" ➔ "địa phương"', category: 'chinh_ta' },
  { wrong: 'dia phuong', right: 'địa phương', reason: 'Viết không dấu: "dia phuong" ➔ "địa phương"', category: 'chinh_ta' },
  { wrong: 'diaphuong', right: 'địa phương', reason: 'Lỗi dính chữ: "diaphuong" ➔ "địa phương"', category: 'nham_tu' },

  { wrong: 'chính quyen', right: 'chính quyền', reason: 'Thiếu dấu huyền: "chính quyen" ➔ "chính quyền"', category: 'chinh_ta' },
  { wrong: 'chinh quyen', right: 'chính quyền', reason: 'Viết không dấu: "chinh quyen" ➔ "chính quyền"', category: 'chinh_ta' },
  { wrong: 'chinhquyen', right: 'chính quyền', reason: 'Lỗi dính chữ: "chinhquyen" ➔ "chính quyền"', category: 'nham_tu' },

  { wrong: 'thành pho', right: 'thành phố', reason: 'Thiếu dấu sắc: "thành pho" ➔ "thành phố"', category: 'chinh_ta' },
  { wrong: 'thanh pho', right: 'thành phố', reason: 'Viết không dấu: "thanh pho" ➔ "thành phố"', category: 'chinh_ta' },
  { wrong: 'thanhpho', right: 'thành phố', reason: 'Lỗi dính chữ: "thanhpho" ➔ "thành phố"', category: 'nham_tu' },

  { wrong: 'thị xa', right: 'thị xã', reason: 'Thiếu dấu ngã: "thị xa" ➔ "thị xã"', category: 'chinh_ta' },
  { wrong: 'thi xa', right: 'thị xã', reason: 'Viết không dấu: "thi xa" ➔ "thị xã"', category: 'chinh_ta' },
  { wrong: 'thixa', right: 'thị xã', reason: 'Lỗi dính chữ: "thixa" ➔ "thị xã"', category: 'nham_tu' },

  { wrong: 'tổ dân pho', right: 'tổ dân phố', reason: 'Thiếu dấu sắc: "tổ dân pho" ➔ "tổ dân phố"', category: 'chinh_ta' },
  { wrong: 'to dan pho', right: 'tổ dân phố', reason: 'Viết không dấu: "to dan pho" ➔ "tổ dân phố"', category: 'chinh_ta' },
  { wrong: 'todanpho', right: 'tổ dân phố', reason: 'Lỗi dính chữ: "todanpho" ➔ "tổ dân phố"', category: 'nham_tu' },

  { wrong: 'trưởng thon', right: 'trưởng thôn', reason: 'Thiếu dấu: "trưởng thon" ➔ "trưởng thôn"', category: 'chinh_ta' },
  { wrong: 'truong thon', right: 'trưởng thôn', reason: 'Viết không dấu: "truong thon" ➔ "trưởng thôn"', category: 'chinh_ta' },
  { wrong: 'truongthon', right: 'trưởng thôn', reason: 'Lỗi dính chữ: "truongthon" ➔ "trưởng thôn"', category: 'nham_tu' },

  { wrong: 'chỉ dao', right: 'chỉ đạo', reason: 'Thiếu dấu nặng: "chỉ dao" ➔ "chỉ đạo"', category: 'chinh_ta' },
  { wrong: 'chi dao', right: 'chỉ đạo', reason: 'Viết không dấu: "chi dao" ➔ "chỉ đạo"', category: 'chinh_ta' },
  { wrong: 'chidao', right: 'chỉ đạo', reason: 'Lỗi dính chữ: "chidao" ➔ "chỉ đạo"', category: 'nham_tu' },

  { wrong: 'phối hop', right: 'phối hợp', reason: 'Thiếu dấu nặng: "phối hop" ➔ "phối hợp"', category: 'chinh_ta' },
  { wrong: 'phoi hop', right: 'phối hợp', reason: 'Viết không dấu: "phoi hop" ➔ "phối hợp"', category: 'chinh_ta' },
  { wrong: 'phoihop', right: 'phối hợp', reason: 'Lỗi dính chữ: "phoihop" ➔ "phối hợp"', category: 'nham_tu' },

  { wrong: 'văn phong', right: 'văn phòng', reason: 'Thiếu dấu huyền: "văn phong" ➔ "văn phòng"', category: 'chinh_ta' },
  { wrong: 'van phong', right: 'văn phòng', reason: 'Viết không dấu: "van phong" ➔ "văn phòng"', category: 'chinh_ta' },
  { wrong: 'vanphong', right: 'văn phòng', reason: 'Lỗi dính chữ: "vanphong" ➔ "văn phòng"', category: 'nham_tu' },

  { wrong: 'hội đông', right: 'hội đồng', reason: 'Thiếu dấu huyền: "hội đông" ➔ "hội đồng"', category: 'chinh_ta' },
  { wrong: 'hoi dong', right: 'hội đồng', reason: 'Viết không dấu: "hoi dong" ➔ "hội đồng"', category: 'chinh_ta' },
  { wrong: 'hoidong', right: 'hội đồng', reason: 'Lỗi dính chữ: "hoidong" ➔ "hội đồng"', category: 'nham_tu' }
];

// Sắp xếp các quy tắc chính tả theo độ dài giảm dần để ưu tiên khớp cụm từ dài nhất trước
export const VIETNAMESE_SPELLING_RULES: SpellingRule[] = [...RAW_SPELLING_ENTRIES]
  .sort((a, b) => b.wrong.length - a.wrong.length)
  .map(entry => ({
    pattern: createVnWordRegex(entry.wrong, entry.caseSensitive ? 'g' : 'gi'),
    wrong: entry.wrong,
    right: entry.right,
    reason: entry.reason,
    category: (entry.category as any) || 'chinh_ta'
  }));

/**
 * Quét và phát hiện các lỗi chính tả, văn phong trong văn bản
 */
export function checkVietnameseSpelling(text: string): SpellingErrorMatch[] {
  if (!text) return [];

  const matches: SpellingErrorMatch[] = [];
  const seen = new Set<string>();
  const matchedRanges: Array<{ start: number; end: number }> = [];

  for (const rule of VIETNAMESE_SPELLING_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;

    while ((m = regex.exec(text)) !== null) {
      const matchText = m[0];
      const matchStart = m.index;
      const matchEnd = m.index + matchText.length;

      // Nếu chuỗi khớp đã trùng 100% với từ chuẩn (right) thì không phải là lỗi!
      if (matchText === rule.right) continue;
      // Bảo vệ các tiêu chuẩn quốc gia & Đảng: Tiêu ngữ chuẩn "Độc lập - Tự do - Hạnh phúc" không bao giờ coi là lỗi
      if (matchText === 'Độc lập - Tự do - Hạnh phúc') continue;
      if (matchText === 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') continue;
      if (matchText === 'ĐẢNG CỘNG SẢN VIỆT NAM') continue;

      // Tránh trùng lặp / đè lên khoảng đã được một cụm từ dài hơn bắt trước đó
      const isOverlap = matchedRanges.some(r => Math.max(matchStart, r.start) < Math.min(matchEnd, r.end));
      if (isOverlap) continue;

      const key = `${matchText.toLowerCase()}_${m.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matchedRanges.push({ start: matchStart, end: matchEnd });

      // Điều chỉnh chữ hoa/chữ thường của right tương ứng với matchText
      const adjustedRight = adaptCapitalization(matchText, rule.right);

      // Trích xuất ngữ cảnh xung quanh lỗi (~20 ký tự trước và sau)
      const start = Math.max(0, m.index - 20);
      const end = Math.min(text.length, m.index + matchText.length + 20);
      const snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');

      matches.push({
        wrong: matchText,
        right: adjustedRight,
        reason: rule.reason,
        category: rule.category,
        snippet: snippet.replace(/\r?\n/g, ' '),
        index: m.index
      });
    }
  }

  // Sắp xếp theo vị trí xuất hiện trong bài
  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Chuẩn hóa định dạng chính tả toàn bộ văn bản tuân theo Nghị định 30 hoặc HD 05
 */
export function formatAdministrativeTypography(text: string): string {
  if (!text) return '';
  let current = text;

  // 1. Khoảng trắng trước dấu câu: " ," -> "," hoặc " ." -> "."
  current = current.replace(/[ \t]+([,.:;!?])/g, '$1');

  // 2. Khoảng trắng sau dấu câu: bổ sung khoảng trắng nếu dính liền chữ cái tiếng Việt
  current = current.replace(/([,;:!?])(?=[a-zA-ZàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])/g, '$1 ');

  // 3. Dấu chấm câu kết thúc: thêm cách nếu dính với chữ hoa
  current = current.replace(/(\.)(?=[A-ZÀ-Ỹ])/g, '$1 ');

  // 4. Bỏ khoảng trắng thừa bên trong dấu ngoặc: ( abc ) -> (abc)
  current = current.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  current = current.replace(/“\s+/g, '“').replace(/\s+”/g, '”');

  // 5. Chuẩn hóa dấu gạch ngang Tiêu ngữ chuẩn NĐ 30: "Độc lập - Tự do - Hạnh phúc"
  current = current.replace(/Độc\s*lập\s*[-–—]\s*Tự\s*do\s*[-–—]\s*Hạnh\s*phúc/gi, 'Độc lập - Tự do - Hạnh phúc');

  // 6. Chuẩn hóa "Căn cứ vào" -> "Căn cứ" theo NĐ 30
  current = current.replace(/(?:^|\n)\s*Căn\s+cứ\s+vào\b/gi, (match) => {
    return match.replace(/Căn\s+cứ\s+vào/i, 'Căn cứ');
  });

  return current;
}

/**
 * Tự động sửa chữa toàn bộ lỗi chính tả và văn phong tiếng Việt trong văn bản
 */
export function fixAllVietnameseSpelling(text: string): { 
  fixedText: string; 
  fixedCount: number; 
  appliedFixes: SpellingErrorMatch[] 
} {
  if (!text) return { fixedText: '', fixedCount: 0, appliedFixes: [] };

  let current = text;
  const appliedFixes: SpellingErrorMatch[] = [];

  for (const rule of VIETNAMESE_SPELLING_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    let foundInCurrent = false;

    while ((m = regex.exec(current)) !== null) {
      if (m[0] === rule.right || m[0] === 'Độc lập - Tự do - Hạnh phúc' || m[0] === 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' || m[0] === 'ĐẢNG CỘNG SẢN VIỆT NAM') continue;
      foundInCurrent = true;
      const adjustedRight = adaptCapitalization(m[0], rule.right);
      appliedFixes.push({
        wrong: m[0],
        right: adjustedRight,
        reason: rule.reason,
        category: rule.category,
        snippet: m[0],
        index: m.index
      });
    }

    if (foundInCurrent) {
      current = current.replace(regex, (match) => adaptCapitalization(match, rule.right));
    }
  }

  // Định dạng chính tả toàn bộ văn bản tuân theo Nghị định 30 hoặc HD 05
  current = formatAdministrativeTypography(current);

  return {
    fixedText: current,
    fixedCount: appliedFixes.length,
    appliedFixes
  };
}

export const autoFixVietnameseSpelling = fixAllVietnameseSpelling;

/**
 * Sửa một lỗi chính tả cụ thể trong văn bản
 */
export function fixSingleSpellingMatch(text: string, wrongWord: string, rightWord: string): string {
  if (!text) return '';
  // Nếu rightWord là một câu chỉ dẫn xóa bỏ (vd: "Xóa bỏ tiêu đề quốc ngữ thừa này", "Xóa bỏ đoạn thừa", v.v.) thì thay thế bằng ''
  let actualRight = rightWord;
  if (/^(?:Xóa bỏ|Gỡ bỏ|Loại bỏ)\b/i.test(actualRight.trim()) || actualRight === 'Xóa bỏ đoạn thừa' || actualRight.startsWith('Xóa ')) {
    actualRight = '';
  }
  const matchQuotes = actualRight.match(/["“](.*?)["”]/);
  if (matchQuotes) {
    actualRight = matchQuotes[1];
  } else if (/^Sửa\s+thành:\s*/i.test(actualRight)) {
    actualRight = actualRight.replace(/^Sửa\s+thành:\s*/i, '');
  }

  // 1. Thử thay thế bằng regex ranh giới từ an toàn
  const regex = createVnWordRegex(wrongWord, 'gi');
  let result = text.replace(regex, actualRight);

  // 2. Nếu regex ranh giới từ chưa thay thế được (do wrongWord chứa ký tự đặc biệt hoặc là cụm câu dài)
  if (result === text && text.toLowerCase().includes(wrongWord.toLowerCase())) {
    const words = wrongWord.trim().split(/\s+/).filter(Boolean);
    const escaped = words.map(escapeRegex).join('[\\s\\u00A0]+');
    result = text.replace(new RegExp(escaped, 'gi'), actualRight);
  }

  if (!actualRight) {
    result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');
  }
  return result;
}

/**
 * Danh sách từ khóa phục vụ cho chức năng Tô vàng sửa ngay trong InteractiveDocumentEditor
 */
export function getSpellingHighlightPatterns(): Array<{ pattern: RegExp; wrong: string; right: string; reason: string }> {
  return VIETNAMESE_SPELLING_RULES.map(r => ({
    pattern: r.pattern,
    wrong: r.wrong,
    right: r.right,
    reason: r.reason
  }));
}

/**
 * Phát hiện từ lặp liền kề bất thường (e.g. "các các", "trong trong", "đã đã", "và và", "được được", v.v.)
 */
export function detectRepeatedWords(text: string): SpellingProposal[] {
  if (!text) return [];
  const proposals: SpellingProposal[] = [];
  
  // Các từ tiếng Việt thường bị lặp nhầm khi gõ văn bản
  const REPEATED_WORDS_REGEX = /(?<![a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])(các|trong|và|được|đã|những|cho|tại|với|đến|của|để|là|thì|mà|rằng)\s+\1(?![a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])/gi;

  let m: RegExpExecArray | null;
  let counter = 1;
  while ((m = REPEATED_WORDS_REGEX.exec(text)) !== null) {
    const fullMatch = m[0];
    const singleWord = m[1];
    const start = Math.max(0, m.index - 20);
    const end = Math.min(text.length, m.index + fullMatch.length + 20);
    const snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');

    proposals.push({
      id: `rep_${counter++}_${m.index}`,
      wrong: fullMatch,
      right: singleWord,
      reason: `Lặp từ bất thường: Bỏ từ lặp "${fullMatch}" ➔ "${singleWord}"`,
      category: 'lap_tu',
      snippet: snippet.replace(/\r?\n/g, ' '),
      index: m.index
    });
  }

  return proposals;
}

// =========================================================================
// BẢNG QUY TẮC CHUYỂN ĐỔI XÃ ➔ PHƯỜNG & ĐIỀU CHỈNH PHÒNG BAN CHUYÊN MÔN
// Chuẩn hóa theo mô hình chính quyền đô thị cấp phường (UBND Phường Đông Tiến)
// =========================================================================
interface AgencyRuleEntry {
  wrong: string;
  right: string;
  reason: string;
  group: 'I_xa_phuong' | 'II_phong_ban';
}

const RAW_COMMUNE_TO_WARD_RULES: AgencyRuleEntry[] = [
  // I. Quy tắc chuyển nội dung xã ➔ phường (39 mục)
  { wrong: 'Chủ tịch UBND xã', right: 'Chủ tịch UBND phường', reason: 'Quy tắc 3 (xã ➔ phường): "Chủ tịch UBND xã" ➔ "Chủ tịch UBND phường"', group: 'I_xa_phuong' },
  { wrong: 'Chủ tịch Ủy ban nhân dân xã', right: 'Chủ tịch Ủy ban nhân dân phường', reason: 'Quy tắc 3 (xã ➔ phường): "Chủ tịch Ủy ban nhân dân xã" ➔ "Chủ tịch Ủy ban nhân dân phường"', group: 'I_xa_phuong' },
  { wrong: 'Phó Chủ tịch UBND xã', right: 'Phó Chủ tịch UBND phường', reason: 'Quy tắc 4 (xã ➔ phường): "Phó Chủ tịch UBND xã" ➔ "Phó Chủ tịch UBND phường"', group: 'I_xa_phuong' },
  { wrong: 'Phó Chủ tịch Ủy ban nhân dân xã', right: 'Phó Chủ tịch Ủy ban nhân dân phường', reason: 'Quy tắc 4 (xã ➔ phường): "Phó Chủ tịch Ủy ban nhân dân xã" ➔ "Phó Chủ tịch Ủy ban nhân dân phường"', group: 'I_xa_phuong' },
  { wrong: 'Thường trực HĐND xã', right: 'Thường trực HĐND phường', reason: 'Quy tắc 5 (xã ➔ phường): "Thường trực HĐND xã" ➔ "Thường trực HĐND phường"', group: 'I_xa_phuong' },
  { wrong: 'Thường trực Hội đồng nhân dân xã', right: 'Thường trực Hội đồng nhân dân phường', reason: 'Quy tắc 5 (xã ➔ phường): "Thường trực Hội đồng nhân dân xã" ➔ "Thường trực Hội đồng nhân dân phường"', group: 'I_xa_phuong' },
  { wrong: 'Các ban của HĐND xã', right: 'Các ban của HĐND phường', reason: 'Quy tắc 6 (xã ➔ phường): "Các ban của HĐND xã" ➔ "Các ban của HĐND phường"', group: 'I_xa_phuong' },
  { wrong: 'Các ban HĐND xã', right: 'Các ban của HĐND phường', reason: 'Quy tắc 6 (xã ➔ phường): "Các ban HĐND xã" ➔ "Các ban của HĐND phường"', group: 'I_xa_phuong' },
  { wrong: 'Ban của HĐND xã', right: 'Các ban của HĐND phường', reason: 'Quy tắc 6 (xã ➔ phường): "Ban của HĐND xã" ➔ "Các ban của HĐND phường"', group: 'I_xa_phuong' },
  { wrong: 'Bí thư Đảng ủy xã', right: 'Bí thư Đảng ủy phường', reason: 'Quy tắc 7 (xã ➔ phường): "Bí thư Đảng ủy xã" ➔ "Bí thư Đảng ủy phường"', group: 'I_xa_phuong' },
  { wrong: 'Ban Thường vụ Đảng ủy xã', right: 'Ban Thường vụ Đảng ủy phường', reason: 'Quy tắc 8 (xã ➔ phường): "Ban Thường vụ Đảng ủy xã" ➔ "Ban Thường vụ Đảng ủy phường"', group: 'I_xa_phuong' },
  { wrong: 'BTV Đảng ủy xã', right: 'Ban Thường vụ Đảng ủy phường', reason: 'Quy tắc 8 (xã ➔ phường): "BTV Đảng ủy xã" ➔ "Ban Thường vụ Đảng ủy phường"', group: 'I_xa_phuong' },
  { wrong: 'Đảng ủy xã', right: 'Đảng ủy phường', reason: 'Quy tắc 9 (xã ➔ phường): "Đảng ủy xã" ➔ "Đảng ủy phường"', group: 'I_xa_phuong' },
  { wrong: 'Ủy ban MTTQ Việt Nam xã', right: 'Ủy ban MTTQ Việt Nam phường', reason: 'Quy tắc 10 (xã ➔ phường): "Ủy ban MTTQ Việt Nam xã" ➔ "Ủy ban MTTQ Việt Nam phường"', group: 'I_xa_phuong' },
  { wrong: 'Ủy ban Mặt trận Tổ quốc Việt Nam xã', right: 'Ủy ban MTTQ Việt Nam phường', reason: 'Quy tắc 10 (xã ➔ phường): "Ủy ban Mặt trận Tổ quốc Việt Nam xã" ➔ "Ủy ban MTTQ Việt Nam phường"', group: 'I_xa_phuong' },
  { wrong: 'Ủy ban MTTQ xã', right: 'Ủy ban MTTQ Việt Nam phường', reason: 'Quy tắc 10 (xã ➔ phường): "Ủy ban MTTQ xã" ➔ "Ủy ban MTTQ Việt Nam phường"', group: 'I_xa_phuong' },
  { wrong: 'MTTQ xã', right: 'Ủy ban MTTQ Việt Nam phường', reason: 'Quy tắc 10 (xã ➔ phường): "MTTQ xã" ➔ "Ủy ban MTTQ Việt Nam phường"', group: 'I_xa_phuong' },
  { wrong: 'Đoàn Thanh niên xã', right: 'Đoàn Thanh niên phường', reason: 'Quy tắc 11 (xã ➔ phường): "Đoàn Thanh niên xã" ➔ "Đoàn Thanh niên phường"', group: 'I_xa_phuong' },
  { wrong: 'Đoàn TNCS Hồ Chí Minh xã', right: 'Đoàn Thanh niên phường', reason: 'Quy tắc 11 (xã ➔ phường): "Đoàn TNCS Hồ Chí Minh xã" ➔ "Đoàn Thanh niên phường"', group: 'I_xa_phuong' },
  { wrong: 'Hội LHPN xã', right: 'Hội LHPN phường', reason: 'Quy tắc 12 (xã ➔ phường): "Hội LHPN xã" ➔ "Hội LHPN phường"', group: 'I_xa_phuong' },
  { wrong: 'Hội Liên hiệp Phụ nữ xã', right: 'Hội LHPN phường', reason: 'Quy tắc 12 (xã ➔ phường): "Hội Liên hiệp Phụ nữ xã" ➔ "Hội LHPN phường"', group: 'I_xa_phuong' },
  { wrong: 'Hội Nông dân xã', right: 'Hội Nông dân phường', reason: 'Quy tắc 13 (xã ➔ phường): "Hội Nông dân xã" ➔ "Hội Nông dân phường"', group: 'I_xa_phuong' },
  { wrong: 'Hội Cựu chiến binh xã', right: 'Hội Cựu chiến binh phường', reason: 'Quy tắc 14 (xã ➔ phường): "Hội Cựu chiến binh xã" ➔ "Hội Cựu chiến binh phường"', group: 'I_xa_phuong' },
  { wrong: 'Hội CCB xã', right: 'Hội Cựu chiến binh phường', reason: 'Quy tắc 14 (xã ➔ phường): "Hội CCB xã" ➔ "Hội Cựu chiến binh phường"', group: 'I_xa_phuong' },
  { wrong: 'Trưởng Công an xã', right: 'Trưởng Công an phường', reason: 'Quy tắc 17 (xã ➔ phường): "Trưởng Công an xã" ➔ "Trưởng Công an phường"', group: 'I_xa_phuong' },
  { wrong: 'Công an xã', right: 'Công an phường', reason: 'Quy tắc 15 (xã ➔ phường): "Công an xã" ➔ "Công an phường"', group: 'I_xa_phuong' },
  { wrong: 'Chỉ huy trưởng Ban CHQS xã', right: 'Chỉ huy trưởng Ban CHQS phường', reason: 'Quy tắc 18 (xã ➔ phường): "Chỉ huy trưởng Ban CHQS xã" ➔ "Chỉ huy trưởng Ban CHQS phường"', group: 'I_xa_phuong' },
  { wrong: 'Chỉ huy trưởng Ban Chỉ huy quân sự xã', right: 'Chỉ huy trưởng Ban CHQS phường', reason: 'Quy tắc 18 (xã ➔ phường): "Chỉ huy trưởng Ban Chỉ huy quân sự xã" ➔ "Chỉ huy trưởng Ban CHQS phường"', group: 'I_xa_phuong' },
  { wrong: 'Ban Chỉ huy quân sự xã', right: 'Ban Chỉ huy quân sự phường', reason: 'Quy tắc 16 (xã ➔ phường): "Ban Chỉ huy quân sự xã" ➔ "Ban Chỉ huy quân sự phường"', group: 'I_xa_phuong' },
  { wrong: 'Ban CHQS xã', right: 'Ban CHQS phường', reason: 'Quy tắc 16 (xã ➔ phường): "Ban CHQS xã" ➔ "Ban CHQS phường"', group: 'I_xa_phuong' },
  { wrong: 'Cán bộ phụ trách lĩnh vực tại xã', right: 'Công chức hoặc người được giao phụ trách lĩnh vực tại phường', reason: 'Quy tắc 22 (xã ➔ phường): "Cán bộ phụ trách lĩnh vực tại xã" ➔ "Công chức hoặc người được giao phụ trách lĩnh vực tại phường"', group: 'I_xa_phuong' },
  { wrong: 'Cán bộ, công chức xã', right: 'Cán bộ, công chức phường', reason: 'Quy tắc 20 (xã ➔ phường): "Cán bộ, công chức xã" ➔ "Cán bộ, công chức phường"', group: 'I_xa_phuong' },
  { wrong: 'Cán bộ công chức xã', right: 'Cán bộ, công chức phường', reason: 'Quy tắc 20 (xã ➔ phường): "Cán bộ công chức xã" ➔ "Cán bộ, công chức phường"', group: 'I_xa_phuong' },
  { wrong: 'Công chức xã', right: 'Công chức phường', reason: 'Quy tắc 19 (xã ➔ phường): "Công chức xã" ➔ "Công chức phường hoặc công chức cấp xã"', group: 'I_xa_phuong' },
  { wrong: 'Các ban, ngành, đoàn thể xã', right: 'Các phòng, cơ quan, đơn vị, tổ chức có liên quan của phường', reason: 'Quy tắc 21 (xã ➔ phường): "Các ban, ngành, đoàn thể xã" ➔ "Các phòng, cơ quan, đơn vị, tổ chức có liên quan của phường"', group: 'I_xa_phuong' },
  { wrong: 'Ban, ngành, đoàn thể xã', right: 'Các phòng, cơ quan, đơn vị, tổ chức có liên quan của phường', reason: 'Quy tắc 21 (xã ➔ phường): "Ban, ngành, đoàn thể xã" ➔ "Các phòng, cơ quan, đơn vị, tổ chức có liên quan của phường"', group: 'I_xa_phuong' },
  { wrong: 'Ban công tác Mặt trận thôn', right: 'Ban công tác Mặt trận ở tổ dân phố', reason: 'Quy tắc 25 (xã ➔ phường): "Ban công tác Mặt trận thôn" ➔ "Ban công tác Mặt trận ở tổ dân phố"', group: 'I_xa_phuong' },
  { wrong: 'Trưởng thôn', right: 'Tổ trưởng tổ dân phố', reason: 'Quy tắc 24 (xã ➔ phường): "Trưởng thôn" ➔ "Tổ trưởng tổ dân phố"', group: 'I_xa_phuong' },
  { wrong: 'Nhà văn hóa thôn', right: 'Nhà văn hóa tổ dân phố', reason: 'Quy tắc 26 (xã ➔ phường): "Nhà văn hóa thôn" ➔ "Nhà văn hóa hoặc nhà văn hóa tổ dân phố"', group: 'I_xa_phuong' },
  { wrong: 'Thôn', right: 'Tổ dân phố (TDP)', reason: 'Quy tắc 23 (xã ➔ phường): "Thôn" ➔ "Tổ dân phố (TDP)"', group: 'I_xa_phuong' },
  { wrong: 'thôn', right: 'tổ dân phố', reason: 'Quy tắc 23 (xã ➔ phường): "thôn" ➔ "tổ dân phố"', group: 'I_xa_phuong' },
  { wrong: 'Nhân dân trong xã', right: 'Nhân dân trên địa bàn phường', reason: 'Quy tắc 27 (xã ➔ phường): "Nhân dân trong xã" ➔ "Nhân dân trên địa bàn phường"', group: 'I_xa_phuong' },
  { wrong: 'Địa bàn xã', right: 'Địa bàn phường', reason: 'Quy tắc 28 (xã ➔ phường): "Địa bàn xã" ➔ "Địa bàn phường"', group: 'I_xa_phuong' },
  { wrong: 'Các xã lân cận', right: 'Các phường, xã lân cận', reason: 'Quy tắc 29 (xã ➔ phường): "Các xã lân cận" ➔ "Các phường, xã lân cận"', group: 'I_xa_phuong' },
  { wrong: 'Phòng chuyên môn thuộc UBND huyện', right: 'Sở, cơ quan chuyên môn cấp tỉnh hoặc đơn vị được giao nhiệm vụ', reason: 'Quy tắc 31: "Phòng chuyên môn thuộc UBND huyện" ➔ "Sở, cơ quan chuyên môn cấp tỉnh hoặc đơn vị được giao nhiệm vụ"', group: 'I_xa_phuong' },
  { wrong: 'Phòng chuyên môn thuộc Ủy ban nhân dân huyện', right: 'Sở, cơ quan chuyên môn cấp tỉnh hoặc đơn vị được giao nhiệm vụ', reason: 'Quy tắc 31: "Phòng chuyên môn thuộc Ủy ban nhân dân huyện" ➔ "Sở, cơ quan chuyên môn cấp tỉnh hoặc đơn vị được giao nhiệm vụ"', group: 'I_xa_phuong' },
  { wrong: 'UBND huyện', right: 'UBND cấp tỉnh hoặc cơ quan có thẩm quyền hiện hành', reason: 'Quy tắc 30: "UBND huyện" ➔ "UBND cấp tỉnh hoặc cơ quan có thẩm quyền hiện hành"', group: 'I_xa_phuong' },
  { wrong: 'Ủy ban nhân dân huyện', right: 'UBND cấp tỉnh hoặc cơ quan có thẩm quyền hiện hành', reason: 'Quy tắc 30: "Ủy ban nhân dân huyện" ➔ "UBND cấp tỉnh hoặc cơ quan có thẩm quyền hiện hành"', group: 'I_xa_phuong' },
  { wrong: 'Cấp huyện, cấp xã', right: 'Cấp tỉnh, cấp xã hoặc các cấp có liên quan theo mô hình hiện hành', reason: 'Quy tắc 32: "Cấp huyện, cấp xã" ➔ "Cấp tỉnh, cấp xã hoặc các cấp có liên quan theo mô hình hiện hành"', group: 'I_xa_phuong' },
  { wrong: 'Cấp huyện và cấp xã', right: 'Cấp tỉnh, cấp xã hoặc các cấp có liên quan theo mô hình hiện hành', reason: 'Quy tắc 32: "Cấp huyện và cấp xã" ➔ "Cấp tỉnh, cấp xã hoặc các cấp có liên quan theo mô hình hiện hành"', group: 'I_xa_phuong' },
  { wrong: 'cấp huyện, cấp xã', right: 'cấp tỉnh, cấp xã hoặc các cấp có liên quan theo mô hình hiện hành', reason: 'Quy tắc 32: "cấp huyện, cấp xã" ➔ "cấp tỉnh, cấp xã hoặc các cấp có liên quan theo mô hình hiện hành"', group: 'I_xa_phuong' },
  { wrong: 'Tỉnh, huyện, xã', right: 'Tỉnh, phường hoặc các cấp, địa bàn tương ứng', reason: 'Quy tắc 33: "Tỉnh, huyện, xã" ➔ "Tỉnh, phường hoặc các cấp, địa bàn tương ứng"', group: 'I_xa_phuong' },
  { wrong: 'tỉnh, huyện, xã', right: 'tỉnh, phường hoặc các cấp, địa bàn tương ứng', reason: 'Quy tắc 33: "tỉnh, huyện, xã" ➔ "tỉnh, phường hoặc các cấp, địa bàn tương ứng"', group: 'I_xa_phuong' },
  { wrong: 'Trụ sở UBND xã', right: 'Trụ sở UBND phường', reason: 'Quy tắc 35 (xã ➔ phường): "Trụ sở UBND xã" ➔ "Trụ sở UBND phường"', group: 'I_xa_phuong' },
  { wrong: 'Trụ sở Ủy ban nhân dân xã', right: 'Trụ sở UBND phường', reason: 'Quy tắc 35 (xã ➔ phường): "Trụ sở Ủy ban nhân dân xã" ➔ "Trụ sở UBND phường"', group: 'I_xa_phuong' },
  { wrong: 'Cổng TTĐT xã', right: 'Cổng thông tin điện tử phường', reason: 'Quy tắc 36 (xã ➔ phường): "Cổng TTĐT xã" ➔ "Cổng thông tin điện tử phường"', group: 'I_xa_phuong' },
  { wrong: 'Cổng thông tin điện tử xã', right: 'Cổng thông tin điện tử phường', reason: 'Quy tắc 36 (xã ➔ phường): "Cổng thông tin điện tử xã" ➔ "Cổng thông tin điện tử phường"', group: 'I_xa_phuong' },
  { wrong: 'Trang thông tin xã', right: 'Cổng thông tin điện tử của phường', reason: 'Quy tắc 37 (xã ➔ phường): "Trang thông tin xã" ➔ "Trang thông tin điện tử hoặc Cổng thông tin điện tử của phường"', group: 'I_xa_phuong' },
  { wrong: 'Số điện thoại UBND xã', right: 'Số điện thoại của UBND phường', reason: 'Quy tắc 38 (xã ➔ phường): "Số điện thoại UBND xã" ➔ "Số điện thoại của UBND phường"', group: 'I_xa_phuong' },
  { wrong: 'Số điện thoại của UBND xã', right: 'Số điện thoại của UBND phường', reason: 'Quy tắc 38 (xã ➔ phường): "Số điện thoại của UBND xã" ➔ "Số điện thoại của UBND phường"', group: 'I_xa_phuong' },
  { wrong: 'Email công vụ của xã', right: 'Email công vụ của phường', reason: 'Quy tắc 39 (xã ➔ phường): "Email công vụ của xã" ➔ "Email công vụ của phường"', group: 'I_xa_phuong' },
  { wrong: 'UBND xã', right: 'UBND phường', reason: 'Quy tắc 1 (xã ➔ phường): "UBND xã" ➔ "UBND phường"', group: 'I_xa_phuong' },
  { wrong: 'Ủy ban nhân dân xã', right: 'Ủy ban nhân dân phường', reason: 'Quy tắc 1 (xã ➔ phường): "Ủy ban nhân dân xã" ➔ "Ủy ban nhân dân phường"', group: 'I_xa_phuong' },
  { wrong: 'HĐND xã', right: 'HĐND phường', reason: 'Quy tắc 2 (xã ➔ phường): "HĐND xã" ➔ "HĐND phường"', group: 'I_xa_phuong' },
  { wrong: 'Hội đồng nhân dân xã', right: 'Hội đồng nhân dân phường', reason: 'Quy tắc 2 (xã ➔ phường): "Hội đồng nhân dân xã" ➔ "Hội đồng nhân dân phường"', group: 'I_xa_phuong' },

  // II. Điều chỉnh tên phòng chuyên môn / cơ quan phối hợp (11 mục)
  { wrong: 'Văn phòng HĐND và UBND xã', right: 'Văn phòng HĐND và UBND phường', reason: 'Quy tắc phòng ban 3: "Văn phòng HĐND và UBND xã" ➔ "Văn phòng HĐND và UBND phường"', group: 'II_phong_ban' },
  { wrong: 'Văn phòng HĐND & UBND xã', right: 'Văn phòng HĐND & UBND phường', reason: 'Quy tắc phòng ban 3: "Văn phòng HĐND & UBND xã" ➔ "Văn phòng HĐND & UBND phường"', group: 'II_phong_ban' },
  { wrong: 'Bộ phận Địa chính - Xây dựng', right: 'Phòng Kinh tế, Hạ tầng và Đô thị', reason: 'Quy tắc phòng ban 4: "Bộ phận Địa chính - Xây dựng" ➔ "Phòng Kinh tế, Hạ tầng và Đô thị hoặc đầu mối được giao"', group: 'II_phong_ban' },
  { wrong: 'Bộ phận địa chính - xây dựng', right: 'Phòng Kinh tế, Hạ tầng và Đô thị', reason: 'Quy tắc phòng ban 4: "Bộ phận địa chính - xây dựng" ➔ "Phòng Kinh tế, Hạ tầng và Đô thị hoặc đầu mối được giao"', group: 'II_phong_ban' },
  { wrong: 'Bộ phận Địa chính xây dựng', right: 'Phòng Kinh tế, Hạ tầng và Đô thị', reason: 'Quy tắc phòng ban 4: "Bộ phận Địa chính xây dựng" ➔ "Phòng Kinh tế, Hạ tầng và Đô thị hoặc đầu mối được giao"', group: 'II_phong_ban' },
  { wrong: 'Bộ phận Một cửa xã', right: 'Trung tâm Phục vụ hành chính công phường', reason: 'Quy tắc phòng ban 5: "Bộ phận Một cửa xã" ➔ "Trung tâm Phục vụ hành chính công phường"', group: 'II_phong_ban' },
  { wrong: 'Bộ phận một cửa xã', right: 'Trung tâm Phục vụ hành chính công phường', reason: 'Quy tắc phòng ban 5: "Bộ phận một cửa xã" ➔ "Trung tâm Phục vụ hành chính công phường"', group: 'II_phong_ban' },
  { wrong: 'Bộ phận Một cửa của xã', right: 'Trung tâm Phục vụ hành chính công phường', reason: 'Quy tắc phòng ban 5: "Bộ phận Một cửa của xã" ➔ "Trung tâm Phục vụ hành chính công phường"', group: 'II_phong_ban' },
  { wrong: 'Trung tâm Văn hóa - Thể thao xã', right: 'Trung tâm Cung ứng dịch vụ công', reason: 'Quy tắc phòng ban 6: "Trung tâm Văn hóa - Thể thao xã" ➔ "Trung tâm Cung ứng dịch vụ công hoặc đơn vị được giao nhiệm vụ"', group: 'II_phong_ban' },
  { wrong: 'Trung tâm VH-TT xã', right: 'Trung tâm Cung ứng dịch vụ công', reason: 'Quy tắc phòng ban 6: "Trung tâm VH-TT xã" ➔ "Trung tâm Cung ứng dịch vụ công hoặc đơn vị được giao nhiệm vụ"', group: 'II_phong_ban' },
  { wrong: 'Đài truyền thanh xã', right: 'Hệ thống thông tin cơ sở', reason: 'Quy tắc phòng ban 7: "Đài truyền thanh xã" ➔ "Hệ thống thông tin cơ sở hoặc đơn vị được giao quản lý"', group: 'II_phong_ban' },
  { wrong: 'Ban quản lý chợ xã', right: 'Ban quản lý chợ', reason: 'Quy tắc phòng ban 8: "Ban quản lý chợ xã" ➔ "Ban quản lý chợ hoặc đơn vị được giao quản lý chợ"', group: 'II_phong_ban' },
  { wrong: 'Ban Quản lý chợ xã', right: 'Ban quản lý chợ', reason: 'Quy tắc phòng ban 8: "Ban Quản lý chợ xã" ➔ "Ban quản lý chợ hoặc đơn vị được giao quản lý chợ"', group: 'II_phong_ban' },
  { wrong: 'Ban Chỉ đạo cấp xã', right: 'Ban Chỉ đạo của phường', reason: 'Quy tắc phòng ban 9: "Ban Chỉ đạo cấp xã" ➔ "Ban Chỉ đạo của phường hoặc tên gọi theo quyết định thành lập"', group: 'II_phong_ban' },
  { wrong: 'Tổ công tác của xã', right: 'Tổ công tác của phường', reason: 'Quy tắc phòng ban 10: "Tổ công tác của xã" ➔ "Tổ công tác của phường"', group: 'II_phong_ban' },
  { wrong: 'Đơn vị sự nghiệp thuộc xã', right: 'Đơn vị sự nghiệp thuộc phường', reason: 'Quy tắc phòng ban 11: "Đơn vị sự nghiệp thuộc xã" ➔ "Đơn vị sự nghiệp thuộc phường hoặc cơ quan quản lý hiện hành"', group: 'II_phong_ban' },
  { wrong: 'Phòng Kinh tế', right: 'Phòng Kinh tế, Hạ tầng và Đô thị', reason: 'Quy tắc phòng ban 1: "Phòng Kinh tế" ➔ "Phòng Kinh tế, Hạ tầng và Đô thị"', group: 'II_phong_ban' },
  { wrong: 'Phòng Văn hóa và Xã hội', right: 'Phòng Văn hóa - Xã hội', reason: 'Quy tắc phòng ban 2: Chuẩn hóa tên "Phòng Văn hóa - Xã hội"', group: 'II_phong_ban' }
];

// Sắp xếp các cụm từ theo chiều dài giảm dần để ưu tiên khớp cụm dài và cụ thể nhất trước
const SORTED_COMMUNE_TO_WARD_RULES = [...RAW_COMMUNE_TO_WARD_RULES].sort(
  (a, b) => b.wrong.length - a.wrong.length
);

/**
 * Tự động phát hiện các từ/địa danh/cơ quan khác với đơn vị đang cài đặt mặc định
 * và áp dụng đầy đủ bộ quy tắc chuyển đổi xã ➔ phường (Nhóm I: 39 mục, Nhóm II: 11 mục, Nhóm C: Địa danh lệch)
 * TUYỆT ĐỐI KHÔNG TỰ SỬA VĂN BẢN GỐC KHI CHƯA ĐƯỢC BẤM [ĐỒNG Ý SỬA].
 */
export function detectAgencyAndLocationDiscrepancies(
  text: string,
  agencySettings?: AgencySettings
): SpellingProposal[] {
  if (!text) return [];

  const proposals: SpellingProposal[] = [];
  const seenMatches = new Set<string>();

  const defaultLoc = (agencySettings?.shortLocation || 'Đông Tiến').trim();
  const defaultAgency = (agencySettings?.agencyName || 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN').trim();
  const defaultParent = (agencySettings?.parentAgency || '').trim();

  // Tên cốt lõi của địa danh (bỏ tiền tố phường/xã/thị xã/huyện)
  const defaultLocCore = defaultLoc.replace(/^(?:phường|xã|thị\s+trấn|thị\s+xã|thành\s+phố|quận|huyện)\s+/i, '').trim();

  // Xác định xem đơn vị mặc định có phải là cấp phường hay không (mặc định Tiểu Bảo Bối là cấp phường)
  const isWardLevel = Boolean(
    !agencySettings ||
    (defaultAgency && /phường/i.test(defaultAgency)) ||
    (defaultLoc && /phường/i.test(defaultLoc)) ||
    agencySettings.roleBlock === 'ubnd' ||
    defaultLocCore.toLowerCase() === 'đông tiến'
  );

  // 1. ÁP DỤNG BẢNG QUY TẮC XÃ ➔ PHƯỜNG (39 MỤC PHẦN I VÀ 11 MỤC PHẦN II)
  if (isWardLevel) {
    // 1.1 Quy tắc đặc thù dạng 34: "Xã ..., huyện ..., tỉnh ..." ➔ "Phường..., tỉnh....."
    const TRIPLE_LOC_REGEX = /(?:xã|Xã)\s+([A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+)*),\s*(?:huyện|Huyện)\s+([A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+)*),\s*(?:tỉnh|Tỉnh)\s+([A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+)*)/g;
    let tm: RegExpExecArray | null;
    while ((tm = TRIPLE_LOC_REGEX.exec(text)) !== null) {
      const fullMatch = tm[0].trim();
      const wardName = tm[1].trim();
      const provName = tm[3].trim();
      const key = `${fullMatch.toLowerCase()}_${tm.index}`;
      if (!seenMatches.has(key)) {
        seenMatches.add(key);
        const start = Math.max(0, tm.index - 20);
        const end = Math.min(text.length, tm.index + fullMatch.length + 20);
        const snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');

        proposals.push({
          id: `rule34_disc_${tm.index}`,
          wrong: fullMatch,
          right: `Phường ${wardName}, tỉnh ${provName}`,
          reason: 'Quy tắc 34 (xã ➔ phường): "Xã ..., huyện ..., tỉnh ..." ➔ "Phường..., tỉnh....."',
          category: 'lech_don_vi',
          snippet: snippet.replace(/\r?\n/g, ' '),
          index: tm.index
        });
      }
    }

    // 1.2 Quét các quy tắc danh mục I và II
    for (const rule of SORTED_COMMUNE_TO_WARD_RULES) {
      const reg = createVnWordRegex(rule.wrong, 'gi');
      let m: RegExpExecArray | null;

      while ((m = reg.exec(text)) !== null) {
        const matchText = m[0];
        const matchIdx = m.index;

        // Tránh trùng vị trí đã khớp bởi quy tắc dài hơn
        const isCovered = proposals.some(p => matchIdx >= p.index && matchIdx < p.index + p.wrong.length);
        if (isCovered) continue;

        const key = `${matchText.toLowerCase()}_${matchIdx}`;
        if (!seenMatches.has(key)) {
          seenMatches.add(key);

          // Điều chỉnh chữ hoa/chữ thường tương ứng
          const adjustedRight = adaptCapitalization(matchText, rule.right);

          const start = Math.max(0, matchIdx - 20);
          const end = Math.min(text.length, matchIdx + matchText.length + 20);
          const snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');

          proposals.push({
            id: `rule_xa_phuong_${matchIdx}`,
            wrong: matchText,
            right: adjustedRight,
            reason: rule.reason,
            category: 'lech_don_vi',
            snippet: snippet.replace(/\r?\n/g, ' '),
            index: matchIdx
          });
        }
      }
    }
  }

  // 2. PHẦN C: XỬ LÝ CƠ QUAN HÀNH CHÍNH KHÁC VỚI CƠ QUAN CÀI ĐẶT MẶC ĐỊNH
  // Ví dụ: UBND huyện Đông Sơn, UBND thị xã Bỉm Sơn, UBND tỉnh Thanh Hóa...
  const AGENCY_REGEX = /(?:UBND|Ủy\s+ban\s+nhân\s+dân|HĐND|Hội\s+đồng\s+nhân\s+dân|Đảng\s+ủy)\s+(?:tỉnh|thành\s+phố|thị\s+xã|huyện|quận|phường|xã|thị\s+trấn)\s+([A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+)*)/g;

  let am: RegExpExecArray | null;
  while ((am = AGENCY_REGEX.exec(text)) !== null) {
    const fullMatch = am[0].trim();

    // Bỏ qua nếu trùng hoàn toàn với agencyName hoặc parentAgency chuẩn
    if (defaultAgency && fullMatch.toLowerCase() === defaultAgency.toLowerCase()) continue;
    if (defaultParent && fullMatch.toLowerCase() === defaultParent.toLowerCase()) continue;
    // Bỏ qua nếu cơ quan đó mang chính địa danh của đơn vị mặc định (ví dụ "UBND phường Đông Tiến")
    if (defaultLocCore && fullMatch.toLowerCase().includes(defaultLocCore.toLowerCase()) && fullMatch.toLowerCase().includes('phường')) continue;

    const matchIdx = am.index;
    const isCovered = proposals.some(p => matchIdx >= p.index && matchIdx < p.index + p.wrong.length);
    if (isCovered) continue;

    const key = `${fullMatch.toLowerCase()}_${matchIdx}`;
    if (!seenMatches.has(key)) {
      seenMatches.add(key);

      const start = Math.max(0, matchIdx - 20);
      const end = Math.min(text.length, matchIdx + fullMatch.length + 20);
      const snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');

      proposals.push({
        id: `agency_disc_${matchIdx}`,
        wrong: fullMatch,
        right: defaultAgency || `UBND phường ${defaultLocCore}`,
        reason: `Lệch cơ quan: "${fullMatch}" khác với cơ quan cài đặt mặc định ("${defaultAgency || defaultLoc}")`,
        category: 'lech_don_vi',
        snippet: snippet.replace(/\r?\n/g, ' '),
        index: matchIdx
      });
    }
  }

  // 3. PHẦN C: XỬ LÝ ĐỊA DANH KHÁC ĐƠN VỊ MẶC ĐỊNH
  // Ví dụ: Đông Sơn, Bỉm Sơn, Sầm Sơn, Triệu Sơn, Hoằng Hóa... khi văn bản đang cài đặt là Đông Tiến
  const CANDIDATE_LOCATIONS = [
    'Đông Sơn', 'Bỉm Sơn', 'Sầm Sơn', 'Nghi Sơn', 'Hoằng Hóa', 'Quảng Xương', 'Triệu Sơn',
    'Hà Trung', 'Hậu Lộc', 'Nga Sơn', 'Thạch Thành', 'Cẩm Thủy', 'Ngọc Lặc', 'Lang Chánh',
    'Bá Thước', 'Quan Hóa', 'Quan Sơn', 'Mường Lát', 'Như Xuân', 'Như Thanh', 'Nông Cống',
    'Yên Định', 'Vĩnh Lộc', 'Thiệu Hóa', 'Thanh Hóa', 'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng',
    'Hải Phòng', 'Cần Thơ', 'Nghệ An', 'Nam Định', 'Ninh Bình', 'Ba Đình', 'Điện Biên',
    'Lam Sơn', 'Ngọc Trạo', 'Đông Vệ', 'Đông Cương', 'Đông Hương', 'Đông Hải', 'Đông Thọ',
    'Tân Sơn', 'Phú Sơn', 'An Hưng', 'Quảng Hưng', 'Quảng Thành', 'Quảng Thắng', 'Quảng Tâm',
    'Quảng Cát', 'Quảng Đông', 'Quảng Phú', 'Đông Lĩnh', 'Thiệu Vân', 'Đông Vinh', 'Đông Yên',
    'Đông Tân'
  ];

  for (const loc of CANDIDATE_LOCATIONS) {
    if (defaultLocCore && loc.toLowerCase() === defaultLocCore.toLowerCase()) continue;
    if (defaultLoc && loc.toLowerCase() === defaultLoc.toLowerCase()) continue;

    const locRegex = createVnWordRegex(loc, 'gi');
    let lm: RegExpExecArray | null;

    while ((lm = locRegex.exec(text)) !== null) {
      const matchText = lm[0];
      const matchIdx = lm.index;

      const isAlreadyCovered = proposals.some(p => matchIdx >= p.index && matchIdx < p.index + p.wrong.length);
      if (isAlreadyCovered) continue;

      const key = `${matchText.toLowerCase()}_${matchIdx}`;
      if (!seenMatches.has(key)) {
        seenMatches.add(key);

        const start = Math.max(0, matchIdx - 20);
        const end = Math.min(text.length, matchIdx + matchText.length + 20);
        const snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');

        proposals.push({
          id: `loc_disc_${matchIdx}`,
          wrong: matchText,
          right: defaultLocCore || defaultLoc,
          reason: `Lệch địa danh: "${matchText}" khác với địa danh cài đặt mặc định ("${defaultLocCore || defaultLoc}")`,
          category: 'lech_don_vi',
          snippet: snippet.replace(/\r?\n/g, ' '),
          index: matchIdx
        });
      }
    }
  }

  // 4. Quét các cụm có tiền tố "huyện/thị xã/phường/xã <Tên khác>"
  const PREFIX_LOC_REGEX = /(?:huyện|thị\s+xã|quận|phường|xã|thị\s+trấn)\s+([A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ0-9]+)*)/g;
  let pm: RegExpExecArray | null;
  while ((pm = PREFIX_LOC_REGEX.exec(text)) !== null) {
    const fullMatch = pm[0].trim();
    const locName = pm[1].trim();

    if (defaultLocCore && locName.toLowerCase() === defaultLocCore.toLowerCase()) continue;
    if (defaultLoc && fullMatch.toLowerCase().includes(defaultLoc.toLowerCase())) continue;

    const matchIdx = pm.index;
    const isAlreadyCovered = proposals.some(p => matchIdx >= p.index && matchIdx < p.index + p.wrong.length);
    if (isAlreadyCovered) continue;

    const key = `${fullMatch.toLowerCase()}_${matchIdx}`;
    if (!seenMatches.has(key)) {
      seenMatches.add(key);

      const start = Math.max(0, matchIdx - 20);
      const end = Math.min(text.length, matchIdx + fullMatch.length + 20);
      const snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');

      proposals.push({
        id: `pref_loc_disc_${matchIdx}`,
        wrong: fullMatch,
        right: defaultLoc.toLowerCase().startsWith('phường') || defaultLoc.toLowerCase().startsWith('xã') 
          ? defaultLoc 
          : `phường ${defaultLocCore}`,
        reason: `Lệch đơn vị/địa danh: "${fullMatch}" khác với địa bàn mặc định ("${defaultLoc}")`,
        category: 'lech_don_vi',
        snippet: snippet.replace(/\r?\n/g, ' '),
        index: matchIdx
      });
    }
  }

  return proposals;
}

/**
 * Rà soát và tổng hợp toàn bộ các đề xuất sửa lỗi (Chính tả, Nhầm từ, Lặp từ, Lệch đơn vị/địa danh, Đoạn thiếu logic)
 * TUYỆT ĐỐI KHÔNG TỰ SỬA VĂN BẢN GỐC, KHÔNG ĐỤNG VÀO TÊN RIÊNG, SỐ HIỆU, NGÀY THÁNG (TRỪ KHI LỆCH ĐƠN VỊ HOẶC RÕ RÀNG SAI CHÍNH TẢ).
 */
export function detectAllDocumentProposals(
  text: string, 
  externalIllogicals?: IllogicalSegment[],
  agencySettings?: AgencySettings
): SpellingProposal[] {
  if (!text) return [];

  const proposals: SpellingProposal[] = [];
  const seenKeys = new Set<string>();

  // 1. Quét lỗi từ bộ từ điển chuyên sâu
  const spellMatches = checkVietnameseSpelling(text);
  for (const m of spellMatches) {
    const key = `${m.wrong.toLowerCase()}_${m.index}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      proposals.push({
        id: `spell_${proposals.length + 1}_${m.index}`,
        wrong: m.wrong,
        right: m.right,
        reason: m.reason,
        category: (m.category as any) || 'chinh_ta',
        snippet: m.snippet,
        index: m.index
      });
    }
  }

  // 2. Quét từ lặp liền kề
  const repeated = detectRepeatedWords(text);
  for (const r of repeated) {
    const key = `${r.wrong.toLowerCase()}_${r.index}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      proposals.push(r);
    }
  }

  // 2.5. Tự động phát hiện các từ/địa danh/cơ quan khác với đơn vị đang cài đặt mặc định
  const discrepancies = detectAgencyAndLocationDiscrepancies(text, agencySettings);
  for (const d of discrepancies) {
    const key = `${d.wrong.toLowerCase()}_${d.index}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      proposals.push(d);
    }
  }

  // 3. Tích hợp các đoạn thiếu tính logic (từ externalIllogicals hoặc tự động quét)
  const allIllogicals: IllogicalSegment[] = [];
  if (externalIllogicals && externalIllogicals.length > 0) {
    allIllogicals.push(...externalIllogicals);
  }
  // Tự động quét bổ sung từ bộ quy tắc logic văn bản hành chính
  const autoIllogicals = detectIllogicalAdministrativeText(text);
  for (const autoIll of autoIllogicals) {
    if (!allIllogicals.some(existing => existing.target.toLowerCase() === autoIll.target.toLowerCase())) {
      allIllogicals.push(autoIll);
    }
  }

  for (const ill of allIllogicals) {
    if (!ill.target) continue;
    let idx = text.indexOf(ill.target);
    let matchedWrong = ill.target;
    if (idx === -1) {
      idx = text.toLowerCase().indexOf(ill.target.toLowerCase());
      if (idx !== -1) {
        matchedWrong = text.substring(idx, idx + ill.target.length);
      }
    }
    if (idx === -1) continue;

    const key = `${matchedWrong.toLowerCase()}_${idx}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      let right = ill.suggestion || '';
      const matchQuotes = right.match(/["“](.*?)["”]/);
      if (matchQuotes) {
        right = matchQuotes[1];
      } else if (right.startsWith('Sửa thành: ')) {
        right = right.replace(/^Sửa thành:\s*/i, '');
      } else if (/^(?:Xóa bỏ|Gỡ bỏ|Loại bỏ)\b/i.test(right.trim()) || right.startsWith('Xóa ')) {
        right = '';
      }

      proposals.push({
        id: ill.id || `ill_${proposals.length + 1}_${idx}`,
        wrong: matchedWrong,
        right: right,
        reason: ill.reason || 'Đoạn văn thiếu tính logic hoặc không phù hợp thể thức',
        category: 'logic',
        snippet: matchedWrong,
        index: idx >= 0 ? idx : 0
      });
    }
  }

  return proposals.filter(p => {
    const w = (p.wrong || '').trim();
    // Chỉ loại trừ tiêu đề chuẩn hợp lệ ở đầu văn bản (index < 120), KHÔNG loại trừ các tiêu đề bị lặp lại trong thân bài
    if (p.index < 120 && (
      w === 'Độc lập - Tự do - Hạnh phúc' ||
      w === 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' ||
      w === 'ĐẢNG CỘNG SẢN VIỆT NAM'
    )) {
      return false;
    }
    return true;
  }).sort((a, b) => a.index - b.index);
}
