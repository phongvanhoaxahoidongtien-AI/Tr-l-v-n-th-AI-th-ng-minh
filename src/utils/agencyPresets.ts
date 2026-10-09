import { AgencyRoleBlock } from '../types';

export interface AgencyPresetItem {
  id: string;
  name: string; // Tên hiển thị trong danh sách lựa chọn
  agencyName: string; // Tên cơ quan ban hành (Dòng 2)
  department: string; // Tên phòng ban / bộ phận
  roleBlock: AgencyRoleBlock; // 'ubnd' | 'dang' | 'mttq_doanthe'
  countryHeader: string; // 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' hoặc ''
  motto: string; // 'Độc lập - Tự do - Hạnh phúc' hoặc 'ĐẢNG CỘNG SẢN VIỆT NAM'
  defaultSignerTitle: string; // 'CHỦ TỊCH' | 'BÍ THƯ' | ...
  docCodeSuffix: string; // e.g. '/UBND-VHXH'
  group: 'ubnd' | 'dang' | 'mttq_doanthe';
  icon: string;
}

export const AGENCY_PRESETS: AgencyPresetItem[] = [
  // --- KHỐI UBND & CÁC BỘ PHẬN CHUYÊN MÔN ---
  {
    id: 'ubnd-vhxh',
    name: 'UBND Phường - Bộ phận Văn hóa - Xã hội',
    agencyName: 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN',
    department: 'Bộ phận Văn hóa - Xã hội',
    roleBlock: 'ubnd',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/UBND-VHXH',
    group: 'ubnd',
    icon: '🎭'
  },
  {
    id: 'ubnd-chung',
    name: 'UBND Phường Đông Tiến (Chính quyền chung)',
    agencyName: 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN',
    department: 'Văn phòng HĐND & UBND',
    roleBlock: 'ubnd',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/UBND-VP',
    group: 'ubnd',
    icon: '🏛️'
  },
  {
    id: 'ubnd-tpht',
    name: 'UBND Phường - Bộ phận Tư pháp - Hộ tịch',
    agencyName: 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN',
    department: 'Bộ phận Tư pháp - Hộ tịch',
    roleBlock: 'ubnd',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/UBND-TPHT',
    group: 'ubnd',
    icon: '⚖️'
  },
  {
    id: 'ubnd-dcxd',
    name: 'UBND Phường - Địa chính - Nông nghiệp - Xây dựng & MT',
    agencyName: 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN',
    department: 'Bộ phận Địa chính - Xây dựng - Đô thị & MT',
    roleBlock: 'ubnd',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/UBND-ĐC',
    group: 'ubnd',
    icon: '🗺️'
  },
  {
    id: 'ubnd-tckt',
    name: 'UBND Phường - Bộ phận Tài chính - Kế toán',
    agencyName: 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN',
    department: 'Bộ phận Tài chính - Kế toán',
    roleBlock: 'ubnd',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/UBND-TCKT',
    group: 'ubnd',
    icon: '💰'
  },
  {
    id: 'ubnd-qs',
    name: 'Ban Chỉ huy Quân sự Phường Đông Tiến',
    agencyName: 'BAN CHỈ HUY QUÂN SỰ PHƯỜNG ĐÔNG TIẾN',
    department: 'Ban Chỉ huy Quân sự',
    roleBlock: 'ubnd',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỈ HUY TRƯỞNG',
    docCodeSuffix: '/BCH-QS',
    group: 'ubnd',
    icon: '⭐'
  },
  {
    id: 'ubnd-ca',
    name: 'Công an Phường Đông Tiến',
    agencyName: 'CÔNG AN PHƯỜNG ĐÔNG TIẾN',
    department: 'Công an Phường',
    roleBlock: 'ubnd',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'TRƯỞNG CÔNG AN PHƯỜNG',
    docCodeSuffix: '/CAP-ĐT',
    group: 'ubnd',
    icon: '🛡️'
  },
  {
    id: 'ubnd-yt',
    name: 'Trạm Y tế Phường Đông Tiến',
    agencyName: 'TRẠM Y TẾ PHƯỜNG ĐÔNG TIẾN',
    department: 'Trạm Y tế',
    roleBlock: 'ubnd',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'TRƯỞNG TRẠM',
    docCodeSuffix: '/TYT',
    group: 'ubnd',
    icon: '🏥'
  },

  // --- KHỐI ĐẢNG ỦY ---
  {
    id: 'dang-danguy',
    name: 'Đảng ủy Phường Đông Tiến (Chung khối Đảng)',
    agencyName: 'ĐẢNG BỘ PHƯỜNG ĐÔNG TIẾN\nĐẢNG ỦY PHƯỜNG',
    department: 'Văn phòng Đảng ủy',
    roleBlock: 'dang',
    countryHeader: '',
    motto: 'ĐẢNG CỘNG SẢN VIỆT NAM',
    defaultSignerTitle: 'BÍ THƯ',
    docCodeSuffix: '/ĐU',
    group: 'dang',
    icon: '☭'
  },
  {
    id: 'dang-tuyengiao',
    name: 'Đảng ủy - Ban Tuyên giáo Đảng ủy',
    agencyName: 'BAN TUYÊN GIÁO ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN',
    department: 'Ban Tuyên giáo',
    roleBlock: 'dang',
    countryHeader: '',
    motto: 'ĐẢNG CỘNG SẢN VIỆT NAM',
    defaultSignerTitle: 'TRƯỞNG BAN',
    docCodeSuffix: '/BTG',
    group: 'dang',
    icon: '📢'
  },
  {
    id: 'dang-kiemtra',
    name: 'Đảng ủy - Ủy ban Kiểm tra Đảng ủy',
    agencyName: 'ỦY BAN KIỂM TRA ĐẢNG ỦY PHƯỜNG ĐÔNG TIẾN',
    department: 'Ủy ban Kiểm tra',
    roleBlock: 'dang',
    countryHeader: '',
    motto: 'ĐẢNG CỘNG SẢN VIỆT NAM',
    defaultSignerTitle: 'CHỦ NHIỆM UBKT',
    docCodeSuffix: '/UBKT',
    group: 'dang',
    icon: '🔍'
  },
  {
    id: 'dang-chibo',
    name: 'Chi bộ Cơ quan UBND Phường',
    agencyName: 'ĐẢNG BỘ PHƯỜNG ĐÔNG TIẾN\nCHI BỘ CƠ QUAN UBND',
    department: 'Chi bộ Cơ quan',
    roleBlock: 'dang',
    countryHeader: '',
    motto: 'ĐẢNG CỘNG SẢN VIỆT NAM',
    defaultSignerTitle: 'BÍ THƯ CHI BỘ',
    docCodeSuffix: '/CB',
    group: 'dang',
    icon: '📕'
  },

  // --- KHỐI MẶT TRẬN TỔ QUỐC VÀ ĐOÀN THỂ ---
  {
    id: 'mttq-mttq',
    name: 'Ủy ban Mặt trận Tổ quốc Việt Nam Phường',
    agencyName: 'ỦY BAN MẶT TRẬN TỔ QUỐC VIỆT NAM PHƯỜNG ĐÔNG TIẾN',
    department: 'Ủy ban MTTQ',
    roleBlock: 'mttq_doanthe',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/MTTQ',
    group: 'mttq_doanthe',
    icon: '🤝'
  },
  {
    id: 'mttq-doantn',
    name: 'Đoàn TNCS Hồ Chí Minh Phường Đông Tiến',
    agencyName: 'ĐOÀN TNCS HỒ CHÍ MINH PHƯỜNG ĐÔNG TIẾN\nBAN CHẤP HÀNH',
    department: 'Đoàn Thanh niên',
    roleBlock: 'mttq_doanthe',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'BÍ THƯ',
    docCodeSuffix: '/ĐTN',
    group: 'mttq_doanthe',
    icon: '🔥'
  },
  {
    id: 'mttq-phunu',
    name: 'Hội Liên hiệp Phụ nữ Phường Đông Tiến',
    agencyName: 'HỘI LIÊN HIỆP PHỤ NỮ PHƯỜNG ĐÔNG TIẾN\nBAN CHẤP HÀNH',
    department: 'Hội Phụ nữ',
    roleBlock: 'mttq_doanthe',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/HPN',
    group: 'mttq_doanthe',
    icon: '🌸'
  },
  {
    id: 'mttq-cuuchienbinh',
    name: 'Hội Cựu chiến binh Phường Đông Tiến',
    agencyName: 'HỘI CỰU CHIẾN BINH PHƯỜNG ĐÔNG TIẾN\nBAN CHẤP HÀNH',
    department: 'Hội Cựu chiến binh',
    roleBlock: 'mttq_doanthe',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/HCCB',
    group: 'mttq_doanthe',
    icon: '🎖️'
  },
  {
    id: 'mttq-nongdan',
    name: 'Hội Nông dân Phường Đông Tiến',
    agencyName: 'HỘI NÔNG DÂN PHƯỜNG ĐÔNG TIẾN\nBAN CHẤP HÀNH',
    department: 'Hội Nông dân',
    roleBlock: 'mttq_doanthe',
    countryHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    motto: 'Độc lập - Tự do - Hạnh phúc',
    defaultSignerTitle: 'CHỦ TỊCH',
    docCodeSuffix: '/HND',
    group: 'mttq_doanthe',
    icon: '🌾'
  }
];

export function getPresetById(id: string): AgencyPresetItem | undefined {
  return AGENCY_PRESETS.find(p => p.id === id);
}
