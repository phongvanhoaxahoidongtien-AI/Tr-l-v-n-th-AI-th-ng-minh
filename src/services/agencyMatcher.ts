export interface UnitProfile {
  id: string;
  name: string; // Tên cấu hình
  system: 'hanh_chinh' | 'dang';
  parentAgency: string; // Cơ quan chủ quản
  agencyName: string; // Cơ quan ban hành
  shortLocation: string; // Địa danh
  signerAuthority: string; // Quyền hạn: TM., KT., TL., T/M
  signerTitle: string; // Chức vụ: CHỦ TỊCH, PHÓ CHỦ TỊCH, BÍ THƯ...
  signerName: string; // Họ và tên
  docCodeAbbr: string; // Chữ viết tắt: UBND-VP, ĐU, HĐND...
}

export interface AgencyDiscrepancyReport {
  hasDiscrepancy: boolean;
  isConfidential: boolean; // Độ mật: MẬT, TỐI MẬT, TUYỆT MẬT -> Chặn AI
  confidentialKeyword?: string;
  items: {
    field: 'agencyName' | 'parentAgency' | 'signerName' | 'signerTitle' | 'location' | 'systemMismatch' | 'authorityMismatch';
    label: string;
    docValue: string;
    defaultValue: string;
    message: string;
    severity: 'warning' | 'error' | 'info';
  }[];
  jurisdictionWarning?: string;
}

const STORAGE_PROFILES_KEY = 'trolyvanthu_unit_profiles_v1';
const STORAGE_ACTIVE_PROFILE_KEY = 'trolyvanthu_active_profile_v1';

export class AgencyMatcher {
  /**
   * Hồ sơ đơn vị mặc định theo quy định
   */
  public static getDefaultProfiles(): UnitProfile[] {
    return [
      {
        id: 'default_dongtien_state',
        name: 'UBND Phường Đông Tiến (Mặc định Nhà nước)',
        system: 'hanh_chinh',
        parentAgency: '',
        agencyName: 'ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN',
        shortLocation: 'Đông Tiến',
        signerAuthority: 'KT. CHỦ TỊCH',
        signerTitle: 'PHÓ CHỦ TỊCH',
        signerName: 'Mai Xuân Thế',
        docCodeAbbr: 'UBND-VP'
      },
      {
        id: 'default_party_blank',
        name: 'Chi bộ / Đảng ủy (Mặc định Đảng)',
        system: 'dang',
        parentAgency: '',
        agencyName: '',
        shortLocation: '',
        signerAuthority: 'T/M',
        signerTitle: 'BÍ THƯ',
        signerName: '',
        docCodeAbbr: 'ĐU'
      }
    ];
  }

  /**
   * Lấy danh sách hồ sơ đơn vị người dùng đã lưu
   */
  public static getAllProfiles(): UnitProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Lỗi khi đọc profiles:', e);
    }
    const defaults = this.getDefaultProfiles();
    this.saveAllProfiles(defaults);
    return defaults;
  }

  public static saveAllProfiles(profiles: UnitProfile[]): void {
    try {
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.error('Lỗi khi lưu profiles:', e);
    }
  }

  public static getActiveProfile(): UnitProfile {
    const profiles = this.getAllProfiles();
    try {
      const activeId = localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY);
      const found = profiles.find(p => p.id === activeId);
      if (found) return found;
    } catch {
      //
    }
    return profiles[0] || this.getDefaultProfiles()[0];
  }

  public static setActiveProfile(profileId: string): void {
    try {
      localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, profileId);
    } catch (e) {
      console.error('Lỗi khi lưu active profile:', e);
    }
  }

  /**
   * Kiểm tra độ mật trong văn bản (Mật, Tối mật, Tuyệt mật)
   * NGUYÊN TẮC: Nếu phát hiện dấu độ mật -> CHẶN AI, chỉ chạy lớp quy tắc cục bộ
   */
  public static checkConfidentiality(text: string): { isConfidential: boolean; keyword?: string } {
    const confidentialRegex = /\b(TUYỆT MẬT|TỐI MẬT|TÀI LIỆU MẬT|MẬT)\b/i;
    const match = text.match(confidentialRegex);
    if (match) {
      return {
        isConfidential: true,
        keyword: match[0].toUpperCase()
      };
    }
    return { isConfidential: false };
  }

  /**
   * So sánh và rà soát sai lệch đơn vị ban hành với hồ sơ đơn vị mặc định
   */
  public static compare(
    doc: {
      agencyName?: string;
      parentAgency?: string;
      signerName?: string;
      signerTitle?: string;
      quyenHanKy?: string;
      locationDate?: string;
      docTypeName?: string;
      isPartyDoc?: boolean;
    },
    profile: UnitProfile
  ): AgencyDiscrepancyReport {
    const items: AgencyDiscrepancyReport['items'] = [];

    const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

    // 1. Kiểm tra Tên cơ quan ban hành
    if (doc.agencyName && profile.agencyName) {
      if (norm(doc.agencyName) !== norm(profile.agencyName)) {
        items.push({
          field: 'agencyName',
          label: 'Cơ quan ban hành',
          docValue: doc.agencyName,
          defaultValue: profile.agencyName,
          message: `Cơ quan trong văn bản ("${doc.agencyName}") khác với Hồ sơ đang chọn ("${profile.agencyName}")`,
          severity: 'warning'
        });
      }
    }

    // 2. Kiểm tra Người ký
    if (doc.signerName && profile.signerName) {
      if (norm(doc.signerName) !== norm(profile.signerName)) {
        items.push({
          field: 'signerName',
          label: 'Người ký',
          docValue: doc.signerName,
          defaultValue: profile.signerName,
          message: `Người ký trong văn bản ("${doc.signerName}") khác với Hồ sơ đang chọn ("${profile.signerName}")`,
          severity: 'warning'
        });
      }
    }

    // 3. Kiểm tra hệ văn bản Nhà nước vs Đảng
    if (doc.isPartyDoc && profile.system === 'hanh_chinh') {
      items.push({
        field: 'systemMismatch',
        label: 'Hệ thống văn bản',
        docValue: 'Văn bản của Đảng (Hướng dẫn 05)',
        defaultValue: 'Hồ sơ đơn vị Nhà nước (Nghị định 30)',
        message: 'Văn bản là văn bản Đảng nhưng hồ sơ đơn vị đang chọn là cơ quan Nhà nước',
        severity: 'error'
      });
    } else if (!doc.isPartyDoc && profile.system === 'dang') {
      items.push({
        field: 'systemMismatch',
        label: 'Hệ thống văn bản',
        docValue: 'Văn bản Hành chính (NĐ 30)',
        defaultValue: 'Hồ sơ đơn vị Đảng (HD 05)',
        message: 'Văn bản là văn bản Nhà nước nhưng hồ sơ đơn vị đang chọn là tổ chức Đảng',
        severity: 'error'
      });
    }

    // 4. Kiểm tra thẩm quyền ký (KT. CHỦ TỊCH phải đi kèm PHÓ CHỦ TỊCH)
    if (doc.quyenHanKy === 'KT. CHỦ TỊCH' && doc.signerTitle && !/PHÓ\s+CHỦ\s+TỊCH/i.test(doc.signerTitle)) {
      items.push({
        field: 'authorityMismatch',
        label: 'Quyền hạn và Chức vụ ký',
        docValue: `${doc.quyenHanKy} / ${doc.signerTitle}`,
        defaultValue: 'KT. CHỦ TỊCH / PHÓ CHỦ TỊCH',
        message: 'Quyền hạn "KT. CHỦ TỊCH" theo NĐ 30 bắt buộc chức vụ người ký phải là "PHÓ CHỦ TỊCH"',
        severity: 'error'
      });
    }

    // 5. Kiểm tra thẩm quyền ban hành theo loại văn bản (cấp xã không được ban hành Nghị định, Thông tư...)
    let jurisdictionWarning: string | undefined;
    if (doc.docTypeName && /ỦY BAN NHÂN DÂN PHƯỜNG|UBND XÃ|UBND THỊ TRẤN/i.test(doc.agencyName || profile.agencyName)) {
      if (/NGHỊ ĐỊNH|THÔNG TƯ|QUYẾT ĐỊNH QUY PHẠM/i.test(doc.docTypeName)) {
        jurisdictionWarning = `Lưu ý thẩm quyền: UBND cấp xã/phường không có thẩm quyền ban hành loại văn bản "${doc.docTypeName}". Vui lòng kiểm tra lại thể loại văn bản.`;
      }
    }

    return {
      hasDiscrepancy: items.length > 0,
      isConfidential: false,
      items,
      jurisdictionWarning
    };
  }
}
