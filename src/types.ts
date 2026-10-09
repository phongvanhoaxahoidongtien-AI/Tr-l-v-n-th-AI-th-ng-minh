export type DocCategory = 'hanh_chinh' | 'dang' | 'hoc_thuat';

export type AgencyRoleBlock = 'ubnd' | 'dang' | 'mttq_doanthe';

export interface DocumentTypeItem {
  id: string;
  name: string;
  category: DocCategory;
  shortDesc: string;
  isPopular?: boolean;
  codePrefix: string;
  standardStructure: string;
  defaultTemplate: string;
  decreeRef: string;
}

export interface AgencySettings {
  agencyName: string; // Tên cơ quan ban hành (Dòng 2), e.g. "ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN"
  shortLocation: string; // Địa danh viết tắt, e.g. "Đông Tiến"
  parentAgency?: string; // Cơ quan chủ quản cấp trên (Dòng 1), để trống nếu không có
  roleBlock?: AgencyRoleBlock; // 'ubnd' (Chính quyền NĐ 30) | 'dang' (Đảng ủy HD 05) | 'mttq_doanthe' (MTTQ & Đoàn thể)
  signerTitle?: string; // e.g. "CHỦ TỊCH"
  signerName?: string; // e.g. "Nguyễn Văn Hùng"
  department?: string; // e.g. "Văn phòng HĐND & UBND"
  geminiApiKey?: string; // Optional custom Gemini key
  issuingYear?: string; // Năm ban hành văn bản (e.g. "2026", để trống sẽ lấy năm hiện tại)
  officerName?: string; // Họ và tên công chức sử dụng, e.g. "Lê Thế Điệp" hoặc "Nguyễn Thị Mai"
  officerTitle?: string; // Chức vụ / Chức danh công tác, e.g. "Chuyên viên Văn phòng", "Công chức Tư pháp - Hộ tịch"
  officerGreetingPrefix?: string; // Cách xưng hô yêu thích: "đồng chí", "anh", "chị", "em", "gọi theo chức vụ"
}

export interface DocumentAppendix {
  id: string;
  header: string; // e.g. "PHỤ LỤC 1", "Phụ lục 2", "PHỤ LỤC I"
  title: string;  // e.g. "SỐ LƯỢNG CÁC ĐƠN VỊ THAM GIA LỄ PHÁT ĐỘNG"
  referenceNote: string; // e.g. "(Ban hành kèm theo Công văn số .../UBND-VHXH...)"
  paragraphs: string[]; // Các dòng văn bản hoặc bảng biểu Markdown/HTML
}

export interface IllogicalSegment {
  id: string;
  target: string;
  reason: string;
  suggestion: string;
  category: 'duplicate_header' | 'authority_mismatch' | 'invalid_basis' | 'informal_phrasing' | 'incomplete_placeholder' | 'numbering_jump' | 'contradiction';
}

export interface DetectedElements {
  agencyName: string | null;
  parentAgency: string | null;
  docTypeName: string | null;
  docCode: string | null;
  location: string | null;
  dateStr: string | null;
  countryHeader: string | null;
  motto: string | null;
  subject: string | null;
  recipients: string[];
  signerAuthority: string | null;
  quyenHanKy?: string | null;
  signerTitle: string | null;
  signerName: string | null;
}

export interface ReviewIssue {
  id: string;
  type: 'can_xem_lai' | 'can_sua';
  title: string;
  count: number;
  description: string;
  examples: Array<{ snippet: string; countWords?: number; suggestion?: string }>;
  basis: string; // "Căn cứ: Văn phong hành chính...", "Căn cứ: Rà soát trước khi ký"...
}

export interface AutoFixItem {
  id: string;
  title: string;
  count?: number;
  description: string;
}

export interface PassedItem {
  id: string;
  title: string;
  detail?: string;
}

export interface DocumentAnalysisReport {
  detected: DetectedElements;
  missingInDoc: string[]; // e.g. ['Địa danh', 'Ngày', 'Tháng', 'Năm', 'Số văn bản', 'Kính gửi', 'Nơi nhận']
  reviewIssues: ReviewIssue[];
  autoFixItems: AutoFixItem[];
  passedItems: PassedItem[];
  summaryText: string;
}

export interface NormalizeResult {
  diemTruoc: number;
  diemSau: number;
  soLoi: number;
  danhSachLoi: string[];
  canhBaoCoQuan: string | null;
  canhBao?: string[];
  noiDungChuanHoa: string;
  goiY: string[];
  cacMucDaChinh?: string[];
  quocHieu?: string;
  tieuNgu?: string;
  tenCoQuanChuQuan?: string;
  tenCoQuanBanHanh?: string;
  soHieu?: string;
  diaDanhNgayThang?: string;
  tenLoaiVanBan?: string;
  trichYeu?: string;
  kinhGui?: string;
  noiDung?: string;
  quyenHanKy?: string;
  chucVuNguoiKy?: string;
  hoTenNguoiKy?: string;
  noiNhan?: string;
  detectedAgencyInDoc?: string;
  detectedLocationInDoc?: string;
  spellingErrors?: Array<{ wrong: string; right: string; context?: string }>;
  formatErrors?: string[];
  styleErrors?: string[];
  analysisReport?: DocumentAnalysisReport;
}

export type AppTab = 'home' | 'normalize' | 'templates' | 'academic' | 'guidelines' | 'settings';
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;
