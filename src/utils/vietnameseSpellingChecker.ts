/**
 * Bộ từ điển và thuật toán soát lỗi chính tả tiếng Việt & văn phong hành chính chuyên sâu
 * Chuẩn hóa theo Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW
 * Khắc phục triệt để các cặp phụ âm s/x, ch/tr, d/gi/r, nguyên âm i/y, dấu thanh hỏi/ngã, phụ âm cuối c/t, n/ng
 * Sử dụng regex ranh giới từ tiếng Việt an toàn (tránh lỗi của \\b trên ký tự có dấu)
 */

import { SpellingProposal, IllogicalSegment } from '../types';
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
 * Tạo RegExp ranh giới từ tiếng Việt chuẩn xác (hoạt động 100% với ký tự có dấu)
 */
export function createVnWordRegex(phrase: string, flags: string = 'gi'): RegExp {
  const escaped = escapeRegex(phrase.trim());
  return new RegExp(`(?<![${VN_CHARS}])${escaped}(?![${VN_CHARS}])`, flags);
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
  { wrong: 'kế hoạc', right: 'kế hoạch', reason: 'Sai phụ âm cuối: "kế hoạc" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'kế hoặch', right: 'kế hoạch', reason: 'Sai chính tả: "kế hoặch" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'kế hoach', right: 'kế hoạch', reason: 'Thiếu dấu thanh: "kế hoach" ➔ "kế hoạch"', category: 'chinh_ta' },
  { wrong: 'chuẩn bi', right: 'chuẩn bị', reason: 'Thiếu dấu thanh: "chuẩn bi" ➔ "chuẩn bị"', category: 'chinh_ta' },
  { wrong: 'thực hiên', right: 'thực hiện', reason: 'Thiếu dấu thanh: "thực hiên" ➔ "thực hiện"', category: 'chinh_ta' },
  { wrong: 'chủ tich', right: 'chủ tịch', reason: 'Thiếu dấu thanh: "chủ tich" ➔ "chủ tịch"', category: 'chinh_ta' },
  { wrong: 'phó chủ tich', right: 'phó chủ tịch', reason: 'Thiếu dấu thanh: "phó chủ tich" ➔ "phó chủ tịch"', category: 'chinh_ta' },
  { wrong: 'thủ tương', right: 'thủ tướng', reason: 'Thiếu dấu thanh: "thủ tương" ➔ "thủ tướng"', category: 'chinh_ta' },
  { wrong: 'chính phu', right: 'chính phủ', reason: 'Sai dấu thanh: "chính phu" ➔ "chính phủ"', category: 'chinh_ta' },
  { wrong: 'chính phũ', right: 'chính phủ', reason: 'Sai dấu thanh: "chính phũ" ➔ "chính phủ"', category: 'chinh_ta' },
  { wrong: 'nghị đinh', right: 'nghị định', reason: 'Thiếu dấu thanh: "nghị đinh" ➔ "nghị định"', category: 'chinh_ta' },
  { wrong: 'quyết nghi', right: 'quyết nghị', reason: 'Thiếu dấu thanh: "quyết nghi" ➔ "quyết nghị"', category: 'chinh_ta' },
  { wrong: 'quyêt nghị', right: 'quyết nghị', reason: 'Sai dấu thanh: "quyêt nghị" ➔ "quyết nghị"', category: 'chinh_ta' },
  { wrong: 'chỉ đao', right: 'chỉ đạo', reason: 'Thiếu dấu thanh: "chỉ đao" ➔ "chỉ đạo"', category: 'chinh_ta' },
  { wrong: 'nhiệm vu', right: 'nhiệm vụ', reason: 'Thiếu dấu thanh: "nhiệm vu" ➔ "nhiệm vụ"', category: 'chinh_ta' },
  { wrong: 'nhiệm vũ', right: 'nhiệm vụ', reason: 'Sai dấu thanh: "nhiệm vũ" ➔ "nhiệm vụ"', category: 'chinh_ta' },
  { wrong: 'nghiệm thuu', right: 'nghiệm thu', reason: 'Viết nhầm từ: "nghiệm thuu" ➔ "nghiệm thu"', category: 'nham_tu' },
  { wrong: 'công vann', right: 'công văn', reason: 'Viết nhầm từ: "công vann" ➔ "công văn"', category: 'nham_tu' },
  { wrong: 'thông báoo', right: 'thông báo', reason: 'Viết nhầm từ: "thông báoo" ➔ "thông báo"', category: 'nham_tu' },
  { wrong: 'tờ chình', right: 'tờ trình', reason: 'Sai phụ âm: "tờ chình" ➔ "tờ trình"', category: 'chinh_ta' },
  { wrong: 'biên bãn', right: 'biên bản', reason: 'Sai dấu thanh: "biên bãn" ➔ "biên bản"', category: 'chinh_ta' },
  { wrong: 'đề nghi', right: 'đề nghị', reason: 'Thiếu dấu thanh: "đề nghi" ➔ "đề nghị"', category: 'chinh_ta' },
  { wrong: 'phối hơp', right: 'phối hợp', reason: 'Thiếu dấu thanh: "phối hơp" ➔ "phối hợp"', category: 'chinh_ta' },
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
  { wrong: 'bảo đàm', right: 'bảo đảm', reason: 'Sai dấu thanh: "bảo đàm" ➔ "bảo đảm"', category: 'chinh_ta' }
];

export const VIETNAMESE_SPELLING_RULES: SpellingRule[] = RAW_SPELLING_ENTRIES.map(entry => ({
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

  for (const rule of VIETNAMESE_SPELLING_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;

    while ((m = regex.exec(text)) !== null) {
      const matchText = m[0];
      // Nếu chuỗi khớp đã trùng 100% với từ chuẩn (right) thì không phải là lỗi!
      if (matchText === rule.right) continue;
      // Bảo vệ các tiêu chuẩn quốc gia & Đảng: Tiêu ngữ chuẩn "Độc lập - Tự do - Hạnh phúc" không bao giờ coi là lỗi
      if (matchText === 'Độc lập - Tự do - Hạnh phúc') continue;
      if (matchText === 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') continue;
      if (matchText === 'ĐẢNG CỘNG SẢN VIỆT NAM') continue;

      const key = `${matchText.toLowerCase()}_${m.index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Trích xuất ngữ cảnh xung quanh lỗi (~20 ký tự trước và sau)
      const start = Math.max(0, m.index - 20);
      const end = Math.min(text.length, m.index + matchText.length + 20);
      const snippet = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');

      matches.push({
        wrong: matchText,
        right: rule.right,
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
      appliedFixes.push({
        wrong: m[0],
        right: rule.right,
        reason: rule.reason,
        category: rule.category,
        snippet: m[0],
        index: m.index
      });
    }

    if (foundInCurrent) {
      current = current.replace(regex, rule.right);
    }
  }

  // Chuẩn hóa khoảng trắng trước dấu câu: " ," -> "," hoặc " ." -> "."
  const punctuationRegex = /[ \t]+([,.:;!?])/g;
  if (punctuationRegex.test(current)) {
    current = current.replace(punctuationRegex, '$1');
  }

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
  if (/^(?:Xóa bỏ|Gỡ bỏ|Loại bỏ)\b/i.test(actualRight.trim()) || actualRight === 'Xóa bỏ đoạn thừa') {
    actualRight = '';
  }
  const regex = createVnWordRegex(wrongWord, 'gi');
  let result = text.replace(regex, actualRight);
  if (!actualRight) {
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
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

/**
 * Rà soát và tổng hợp toàn bộ các đề xuất sửa lỗi (Chính tả, Nhầm từ, Lặp từ, Đoạn thiếu logic)
 * TUYỆT ĐỐI KHÔNG TỰ SỬA VĂN BẢN GỐC, KHÔNG ĐỤNG VÀO TÊN RIÊNG, ĐỊA DANH, SỐ HIỆU, NGÀY THÁNG.
 */
export function detectAllDocumentProposals(
  text: string, 
  externalIllogicals?: IllogicalSegment[]
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
    if (!ill.target || !text.includes(ill.target)) continue;
    const idx = text.indexOf(ill.target);
    const key = `${ill.target.toLowerCase()}_${idx}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      let right = ill.suggestion || '';
      const matchQuotes = right.match(/["“](.*?)["”]/);
      if (matchQuotes) {
        right = matchQuotes[1];
      } else if (right.startsWith('Sửa thành: ')) {
        right = right.replace(/^Sửa thành:\s*/i, '');
      } else if (/^(?:Xóa bỏ|Gỡ bỏ|Loại bỏ)\b/i.test(right.trim())) {
        right = '';
      }

      proposals.push({
        id: ill.id || `ill_${proposals.length + 1}_${idx}`,
        wrong: ill.target,
        right: right,
        reason: ill.reason || 'Đoạn văn thiếu tính logic hoặc không phù hợp thể thức',
        category: 'logic',
        snippet: ill.target,
        index: idx >= 0 ? idx : 0
      });
    }
  }

  return proposals.filter(p => {
    const w = (p.wrong || '').trim();
    if (w === 'Độc lập - Tự do - Hạnh phúc') return false;
    if (w === 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') return false;
    if (w === 'ĐẢNG CỘNG SẢN VIỆT NAM') return false;
    return true;
  }).sort((a, b) => a.index - b.index);
}
