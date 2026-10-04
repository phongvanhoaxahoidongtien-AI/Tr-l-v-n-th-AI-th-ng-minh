export type DocCategory = 'hanh_chinh' | 'dang' | 'hoc_thuat';

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
  agencyName: string; // Tên cơ quan ban hành, e.g. "ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN"
  shortLocation: string; // Địa danh viết tắt, e.g. "Đông Tiến"
  parentAgency?: string; // Cơ quan cấp trên, e.g. "ỦY BAN NHÂN DÂN THỊ XÃ BỈM SƠN"
  signerTitle?: string; // e.g. "CHỦ TỊCH"
  signerName?: string; // e.g. "Nguyễn Văn Hùng"
  department?: string; // e.g. "Văn phòng HĐND & UBND"
  geminiApiKey?: string; // Optional custom Gemini key
}

export interface NormalizeResult {
  diemTruoc: number;
  diemSau: number;
  soLoi: number;
  danhSachLoi: string[];
  canhBaoCoQuan: string | null;
  noiDungChuanHoa: string;
  goiY: string[];
  detectedAgencyInDoc?: string;
  detectedLocationInDoc?: string;
  spellingErrors?: Array<{ wrong: string; right: string; context?: string }>;
  formatErrors?: string[];
  styleErrors?: string[];
}

export type AppTab = 'home' | 'normalize' | 'templates' | 'academic' | 'guidelines' | 'settings';
export type StepNumber = 1 | 2 | 3 | 4;
