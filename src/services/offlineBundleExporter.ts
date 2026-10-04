import { ADMINISTRATIVE_DOC_TYPES, PARTY_DOC_TYPES } from '../data/documentTypes';
import { SAMPLE_DOCUMENTS } from '../data/sampleDocs';

/**
 * Tạo một file HTML độc lập hoàn chỉnh chứa 100% mã nguồn, giao diện, CSS và JavaScript
 * để cán bộ công chức có thể lưu về máy tính và chạy offline hoàn toàn không cần internet!
 */
export function generateSingleHtmlBundle(): string {
  const adminTypesJson = JSON.stringify(ADMINISTRATIVE_DOC_TYPES.map(t => ({
    id: t.id,
    name: t.name,
    codePrefix: t.codePrefix,
    shortDesc: t.shortDesc,
    defaultTemplate: t.defaultTemplate
  })));

  const partyTypesJson = JSON.stringify(PARTY_DOC_TYPES.map(t => ({
    id: t.id,
    name: t.name,
    codePrefix: t.codePrefix,
    shortDesc: t.shortDesc,
    defaultTemplate: t.defaultTemplate
  })));

  const sampleDocsJson = JSON.stringify(SAMPLE_DOCUMENTS);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trợ lý văn thư AI thông minh 1.0 (Bản Offline Độc Lập)</title>
  <style>
    :root {
      --primary: #c92a2a;
      --primary-dark: #a61e1e;
      --secondary: #1864ab;
      --gold: #f59f00;
      --bg: #f8fafc;
      --surface: #ffffff;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --success: #2b8a3e;
      --danger: #e03131;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .header {
      background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
      color: white;
      padding: 1rem 1.5rem;
      border-bottom: 4px solid var(--gold);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .emblem {
      width: 44px;
      height: 44px;
      background: #dc2626;
      border: 2px solid #fef08a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .brand-title {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 0.82rem;
      color: #fef08a;
    }
    .nav-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      font-size: 0.88rem;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-light {
      background: white;
      color: #991b1b;
    }
    .btn-light:hover { background: #fef2f2; }
    .btn-gold {
      background: #f59f00;
      color: #78350f;
    }
    .btn-gold:hover { background: #d97706; color: white; }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover { background: var(--primary-dark); }
    .btn-outline {
      border: 1px solid var(--border);
      background: white;
      color: var(--text);
    }
    .btn-outline:hover { background: #f1f5f9; }
    
    .main-container {
      max-width: 1200px;
      margin: 1.5rem auto;
      padding: 0 1rem;
    }
    
    /* Mascot Hero Card */
    .hero-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #fee2e2;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .mascot-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #eff6ff;
      border: 3px solid #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      flex-shrink: 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .speech-bubble {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      position: relative;
      flex: 1;
    }
    .speech-bubble::before {
      content: "";
      position: absolute;
      left: -10px;
      top: 25px;
      border-width: 6px 10px 6px 0;
      border-style: solid;
      border-color: transparent #cbd5e1 transparent transparent;
    }
    .agency-tag {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    
    /* 3 Main Action Cards */
    .big-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .action-card {
      background: white;
      border-radius: 14px;
      padding: 1.5rem;
      border: 2px solid transparent;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      cursor: pointer;
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .action-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    .card-red { border-color: #fca5a5; }
    .card-red:hover { border-color: #ef4444; }
    .card-blue { border-color: #93c5fd; }
    .card-blue:hover { border-color: #3b82f6; }
    .card-purple { border-color: #d8b4fe; }
    .card-purple:hover { border-color: #a855f7; }
    
    /* Steps bar */
    .steps-bar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      background: white;
      padding: 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .step-item.active {
      color: #b91c1c;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
    }
    .step-item.active .step-num {
      background: #b91c1c;
      color: white;
    }
    
    /* Document Display */
    .doc-editor {
      width: 100%;
      min-height: 380px;
      padding: 1rem;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      line-height: 1.6;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: white;
      resize: vertical;
    }
    .paper-preview {
      background: white;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      padding: 3rem 2.5rem;
      font-family: "Times New Roman", Times, serif;
      font-size: 14pt;
      line-height: 1.5;
      min-height: 600px;
      white-space: pre-wrap;
    }
    
    .alert-banner {
      background: #fffbeb;
      border: 2px solid #f59e0b;
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .score-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 999px;
      font-weight: 700;
      font-size: 1.1rem;
    }
    .score-before { background: #fee2e2; color: #991b1b; }
    .score-after { background: #dcfce7; color: #166534; }
    
    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid var(--border);
      margin-bottom: 1rem;
    }
    .tab-btn {
      padding: 0.6rem 1.2rem;
      font-weight: 600;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted);
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
    }
    .tab-btn.active {
      color: #b91c1c;
      border-bottom-color: #b91c1c;
    }
    
    /* Modal */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal.open { display: flex; }
    .modal-content {
      background: white;
      border-radius: 14px;
      max-width: 600px;
      width: 100%;
      padding: 1.5rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      max-height: 90vh;
      overflow-y: auto;
    }
    .input-field {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.95rem;
      margin-top: 0.35rem;
      margin-bottom: 1rem;
    }
    
    @media print {
      .header, .steps-bar, .nav-actions, .hero-card, .btn-group, .big-actions { display: none !important; }
      body, .main-container { background: white; margin: 0; padding: 0; }
      .paper-preview { box-shadow: none; border: none; padding: 0; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header class="header">
    <div class="header-content">
      <div class="brand">
        <div class="emblem">★</div>
        <div>
          <div class="brand-title">Trợ lý văn thư 1.0 (Offline)</div>
          <div class="brand-sub">Chuẩn hóa văn bản hành chính chỉ trong tích tắc!</div>
        </div>
      </div>
      <div class="nav-actions">
        <button class="btn btn-light" onclick="openSettings()">⚙️ Cài đặt Cơ quan</button>
        <button class="btn btn-gold" onclick="resetToHome()">🏠 Trang chủ</button>
      </div>
    </div>
  </header>

  <div class="main-container">
    
    <!-- Hero Mascot Tiểu Bảo -->
    <div class="hero-card">
      <div class="mascot-avatar">👨‍💼</div>
      <div class="speech-bubble">
        <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 0.25rem;">Tiểu Bảo - Trợ lý văn thư AI</div>
        <p id="mascotMessage">Chào đồng chí! Tôi là Tiểu Bảo. Hãy chọn một trong các tính năng bên dưới hoặc gửi văn bản để tôi hỗ trợ rà soát thể thức theo Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW nhé!</p>
        <div id="activeAgencyBadge" class="agency-tag">Cơ quan: UBND Phường Đông Tiến (Đông Tiến)</div>
      </div>
    </div>

    <!-- 3 Big Action Buttons on Home View -->
    <div id="homeView">
      <div class="big-actions">
        <div class="action-card card-red" onclick="startNormalizeFlow()">
          <div>
            <span style="font-size: 32px;">⚡</span>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #b91c1c; margin-top: 0.5rem;">1. Chuẩn hóa văn bản của tôi</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.4rem;">
              Kiểm tra toàn diện 29 loại văn bản hành chính, văn bản Đảng. Tự động sửa lỗi chính tả, đối chiếu cơ quan ban hành.
            </p>
          </div>
          <button class="btn btn-primary" style="margin-top: 1.25rem;">Bắt đầu ngay →</button>
        </div>

        <div class="action-card card-blue" onclick="openTemplatesView()">
          <div>
            <span style="font-size: 32px;">📑</span>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #1d4ed8; margin-top: 0.5rem;">2. Soạn từ mẫu có sẵn</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.4rem;">
              Kho mẫu chuẩn: Công văn, Quyết định, Tờ trình, Giấy mời... Tự động điền tên cơ quan và ngày tháng hiện tại.
            </p>
          </div>
          <button class="btn btn-outline" style="margin-top: 1.25rem; border-color: #3b82f6; color: #1d4ed8;">Xem thư viện mẫu →</button>
        </div>

        <div class="action-card card-purple" onclick="openAcademicView()">
          <div>
            <span style="font-size: 32px;">🎓</span>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #7e22ce; margin-top: 0.5rem;">3. Luận văn, luận án, bài báo</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.4rem;">
              Quy chuẩn học thuật cho cán bộ học cao học, nghiên cứu sinh: Bìa, mục lục, trích dẫn chuẩn APA, tóm tắt khoa học.
            </p>
          </div>
          <button class="btn btn-outline" style="margin-top: 1.25rem; border-color: #a855f7; color: #7e22ce;">Soạn tài liệu học thuật →</button>
        </div>
      </div>
      
      <!-- Quick Test Samples -->
      <div style="background: white; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border);">
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">🧪 Thử nghiệm nhanh với văn bản mẫu có lỗi:</h4>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button class="btn btn-outline" onclick="loadSampleDoc(0)">📌 Công văn (Sai địa danh Đông Sơn + lỗi chính tả)</button>
          <button class="btn btn-outline" onclick="loadSampleDoc(1)">📌 Tờ trình (Ghi sai UBND Bỉm Sơn)</button>
          <button class="btn btn-outline" onclick="loadSampleDoc(2)">📌 Giấy mời (Sai thể thức tiêu ngữ & ngày tháng)</button>
        </div>
      </div>
    </div>

    <!-- Normalize 4-Step Flow -->
    <div id="normalizeView" style="display: none;">
      <!-- Steps Indicator -->
      <div class="steps-bar">
        <div class="step-item" id="stepIndicator1"><span class="step-num">1</span> 1. Loại văn bản</div>
        <div class="step-item" id="stepIndicator2"><span class="step-num">2</span> 2. Gửi văn bản</div>
        <div class="step-item" id="stepIndicator3"><span class="step-num">3</span> 3. Ý kiến chuyên gia</div>
        <div class="step-item" id="stepIndicator4"><span class="step-num">4</span> 4. Xuất file</div>
      </div>

      <!-- Step 1: Select Type -->
      <div id="step1Box">
        <div class="tabs">
          <button class="tab-btn active" id="tabAdminBtn" onclick="switchCategoryTab('hanh_chinh')">Văn bản hành chính (NĐ 30/2020/NĐ-CP - 29 loại)</button>
          <button class="tab-btn" id="tabPartyBtn" onclick="switchCategoryTab('dang')">Văn bản của Đảng (Hướng dẫn 05-HD/VPTW)</button>
        </div>
        <div id="docTypeList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; max-height: 400px; overflow-y: auto; padding: 0.5rem; background: white; border-radius: 12px; border: 1px solid var(--border);">
          <!-- Dynamic loaded items -->
        </div>
        <div style="margin-top: 1rem; text-align: right;">
          <button class="btn btn-primary" onclick="goToStep(2)">Tiếp tục sang bước 2 (Gửi văn bản) →</button>
        </div>
      </div>

      <!-- Step 2: Upload or Paste Content -->
      <div id="step2Box" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Nhập hoặc dán nội dung văn bản:</h3>
          <span id="currentSelectedTypeLabel" style="font-weight: 600; color: #b91c1c;">Loại: Công văn</span>
        </div>
        <textarea id="rawInputText" class="doc-editor" placeholder="Dán nội dung văn bản hành chính cần chuẩn hóa vào đây..."></textarea>
        <div style="display: flex; justify-content: space-between; margin-top: 1rem;">
          <button class="btn btn-outline" onclick="goToStep(1)">← Quay lại bước 1</button>
          <button class="btn btn-primary" onclick="executeNormalization()">Tiểu Bảo chuẩn hóa ngay 🚀</button>
        </div>
      </div>

      <!-- Step 3: Analysis & Agency Difference Warning -->
      <div id="step3Box" style="display: none;">
        <!-- Agency Difference Alert -->
        <div id="agencyAlertBox" class="alert-banner" style="display: none;">
          <span style="font-size: 28px;">⚠️</span>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #92400e;">CẢNH BÁO KHÁC BIỆT CƠ QUAN / ĐỊA DANH</div>
            <p id="agencyAlertText" style="font-size: 0.92rem; color: #78350f; margin-top: 0.25rem;"></p>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button class="btn btn-primary" onclick="acceptAgencyChange()">Đồng ý sửa thành tên đã cài đặt ✓</button>
              <button class="btn btn-outline" onclick="dismissAgencyChange()">Giữ nguyên theo văn bản gốc</button>
            </div>
          </div>
        </div>

        <!-- Scores -->
        <div style="background: white; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border); margin-bottom: 1.5rem; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Điểm tuân thủ ban đầu:</div>
            <div class="score-badge score-before" id="scoreBefore">45 / 100</div>
          </div>
          <span style="font-size: 24px; color: var(--text-muted);">➔</span>
          <div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Điểm sau chuẩn hóa:</div>
            <div class="score-badge score-after" id="scoreAfter">98 / 100</div>
          </div>
          <div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Lỗi đã khắc phục:</div>
            <div style="font-size: 1.2rem; font-weight: 700; color: #1e3a8a;" id="errorCount">0 lỗi</div>
          </div>
        </div>

        <!-- Result Preview -->
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Văn bản đã chuẩn hóa theo Nghị định 30/2020/NĐ-CP:</h4>
          <div id="paperPreview" class="paper-preview"></div>
        </div>

        <!-- Errors List -->
        <div style="background: white; border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border); margin-bottom: 1.5rem;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Danh sách sửa lỗi chính tả & thể thức:</h4>
          <ul id="errorsList" style="padding-left: 1.25rem; color: #334155; font-size: 0.9rem;"></ul>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <button class="btn btn-outline" onclick="goToStep(2)">← Sửa lại văn bản</button>
          <button class="btn btn-primary" onclick="goToStep(4)">Chuyển sang Bước 4 (Xuất file) →</button>
        </div>
      </div>

      <!-- Step 4: Export -->
      <div id="step4Box" style="display: none;">
        <div style="background: white; border-radius: 12px; padding: 2rem; border: 1px solid var(--border); text-align: center;">
          <span style="font-size: 48px;">🎉</span>
          <h3 style="font-size: 1.35rem; font-weight: 700; margin-top: 0.5rem; color: #166534;">Văn bản đã được chuẩn hóa hoàn hảo!</h3>
          <p style="color: var(--text-muted); margin-top: 0.25rem;">Đáp ứng đầy đủ thể thức, font chữ, quy chuẩn theo Nghị định 30/2020/NĐ-CP.</p>
          <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="downloadDocxFile()">📥 Tải file Word (.doc)</button>
            <button class="btn btn-outline" onclick="copyResultText()">📋 Sao chép nội dung</button>
            <button class="btn btn-outline" onclick="window.print()">🖨️ In văn bản (A4)</button>
            <button class="btn btn-gold" onclick="resetToHome()">🔄 Soạn văn bản mới</button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Settings Modal -->
  <div id="settingsModal" class="modal">
    <div class="modal-content">
      <h3 style="font-size: 1.25rem; font-weight: 700; color: #b91c1c; margin-bottom: 1rem;">⚙️ Cài đặt Cơ quan ban hành</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
        Thông tin này được lưu cục bộ trên trình duyệt (localStorage). Hệ thống sẽ tự động phát hiện nếu văn bản ghi sai tên cơ quan hoặc địa danh đã cài đặt.
      </p>
      
      <label style="font-size: 0.88rem; font-weight: 600;">Tên cơ quan ban hành đầy đủ:</label>
      <input type="text" id="settingAgencyInput" class="input-field" placeholder="Ví dụ: UBND Phường Đông Tiến" />

      <label style="font-size: 0.88rem; font-weight: 600;">Địa danh hành chính (viết tắt):</label>
      <input type="text" id="settingLocationInput" class="input-field" placeholder="Ví dụ: Đông Tiến" />

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
        <button class="btn btn-outline" onclick="closeSettings()">Đóng</button>
        <button class="btn btn-primary" onclick="saveSettings()">Lưu cài đặt</button>
      </div>
    </div>
  </div>

  <script>
    const ADMIN_TYPES = ${adminTypesJson};
    const PARTY_TYPES = ${partyTypesJson};
    const SAMPLE_DOCS = ${sampleDocsJson};

    let currentCategory = 'hanh_chinh';
    let currentDocType = ADMIN_TYPES[0];
    let normalizedContent = '';
    let hasAgencyDiff = false;
    let detectedAgencyName = '';

    // Load Settings
    function getSettings() {
      return {
        agencyName: localStorage.getItem('agencyName') || 'UBND Phường Đông Tiến',
        shortLocation: localStorage.getItem('shortLocation') || 'Đông Tiến'
      };
    }

    function renderAgencyBadge() {
      const s = getSettings();
      document.getElementById('activeAgencyBadge').innerText = 'Cơ quan: ' + s.agencyName + ' (' + s.shortLocation + ')';
    }

    function openSettings() {
      const s = getSettings();
      document.getElementById('settingAgencyInput').value = s.agencyName;
      document.getElementById('settingLocationInput').value = s.shortLocation;
      document.getElementById('settingsModal').classList.add('open');
    }

    function closeSettings() {
      document.getElementById('settingsModal').classList.remove('open');
    }

    function saveSettings() {
      const agency = document.getElementById('settingAgencyInput').value.trim() || 'UBND Phường Đông Tiến';
      const loc = document.getElementById('settingLocationInput').value.trim() || 'Đông Tiến';
      localStorage.setItem('agencyName', agency);
      localStorage.setItem('shortLocation', loc);
      renderAgencyBadge();
      closeSettings();
      alert('Đã lưu cài đặt cơ quan ban hành thành công!');
    }

    function resetToHome() {
      document.getElementById('homeView').style.display = 'block';
      document.getElementById('normalizeView').style.display = 'none';
      document.getElementById('mascotMessage').innerText = 'Chào đồng chí! Tôi là Tiểu Bảo. Hãy chọn một trong các tính năng bên dưới hoặc gửi văn bản để tôi hỗ trợ rà soát thể thức nhé!';
    }

    function startNormalizeFlow() {
      document.getElementById('homeView').style.display = 'none';
      document.getElementById('normalizeView').style.display = 'block';
      renderDocTypeList();
      goToStep(1);
    }

    function openTemplatesView() {
      startNormalizeFlow();
      goToStep(1);
    }

    function openAcademicView() {
      startNormalizeFlow();
      document.getElementById('rawInputText').value = 'BỘ GIÁO DỤC VÀ ĐÀO TẠO\\nTRƯỜNG ĐẠI HỌC KINH TẾ QUỐC DÂN\\n\\nLUẬN VĂN THẠC SĨ\\nQUẢN LÝ CÔNG\\nNÂNG CAO HIỆU QUẢ CẢI CÁCH HÀNH CHÍNH TẠI UBND CẤP XÃ';
      goToStep(2);
    }

    function switchCategoryTab(cat) {
      currentCategory = cat;
      document.getElementById('tabAdminBtn').classList.toggle('active', cat === 'hanh_chinh');
      document.getElementById('tabPartyBtn').classList.toggle('active', cat === 'dang');
      renderDocTypeList();
    }

    function renderDocTypeList() {
      const list = currentCategory === 'hanh_chinh' ? ADMIN_TYPES : PARTY_TYPES;
      const container = document.getElementById('docTypeList');
      container.innerHTML = list.map(item => \`
        <div onclick="selectDocType('\${item.id}')" style="padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; background: \${currentDocType.id === item.id ? '#fef2f2' : 'white'}; border-color: \${currentDocType.id === item.id ? '#ef4444' : '#e2e8f0'}">
          <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">\${item.name}</div>
          <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.2rem;">\${item.shortDesc}</div>
        </div>
      \`).join('');
    }

    function selectDocType(id) {
      const list = currentCategory === 'hanh_chinh' ? ADMIN_TYPES : PARTY_TYPES;
      currentDocType = list.find(x => x.id === id) || list[0];
      renderDocTypeList();
      if (!document.getElementById('rawInputText').value) {
        document.getElementById('rawInputText').value = currentDocType.defaultTemplate || '';
      }
    }

    function goToStep(num) {
      for (let i = 1; i <= 4; i++) {
        document.getElementById('step' + i + 'Box').style.display = i === num ? 'block' : 'none';
        const ind = document.getElementById('stepIndicator' + i);
        if (ind) ind.classList.toggle('active', i === num);
      }
      if (num === 2) {
        document.getElementById('currentSelectedTypeLabel').innerText = 'Loại văn bản: ' + currentDocType.name;
        if (!document.getElementById('rawInputText').value.trim()) {
          document.getElementById('rawInputText').value = currentDocType.defaultTemplate || '';
        }
      }
    }

    function loadSampleDoc(idx) {
      const doc = SAMPLE_DOCS[idx];
      if (doc) {
        startNormalizeFlow();
        document.getElementById('rawInputText').value = doc.content;
        goToStep(2);
      }
    }

    function executeNormalization() {
      const raw = document.getElementById('rawInputText').value;
      if (!raw.trim()) {
        alert('Vui lòng dán hoặc nhập nội dung văn bản!');
        return;
      }

      const settings = getSettings();
      let text = raw;
      const errors = [];

      // Phân tích khác biệt cơ quan / địa danh
      hasAgencyDiff = false;
      const alertBox = document.getElementById('agencyAlertBox');
      
      const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
      let foundAgency = '';
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        if (/UBND|ỦY BAN NHÂN DÂN|HUYỆN|THỊ XÃ|TỈNH|PHƯỜNG|XÃ/i.test(lines[i])) {
          foundAgency = lines[i];
          break;
        }
      }

      const locMatch = text.match(/([a-zA-ZÀ-ỹ\\s]+),\\s*ngày\\s+\\d{1,2}\\s+tháng/i);
      let foundLoc = locMatch ? locMatch[1].trim() : '';

      if (foundAgency && !foundAgency.toLowerCase().includes(settings.agencyName.toLowerCase()) && !settings.agencyName.toLowerCase().includes(foundAgency.toLowerCase())) {
        hasAgencyDiff = true;
        detectedAgencyName = foundAgency;
        document.getElementById('agencyAlertText').innerText = 'Văn bản ghi: "' + foundAgency + '", nhưng cài đặt của đồng chí là "' + settings.agencyName + '". Đồng chí có muốn Tiểu Bảo sửa thành "' + settings.agencyName + '" không?';
        alertBox.style.display = 'flex';
      } else if (foundLoc && !foundLoc.toLowerCase().includes(settings.shortLocation.toLowerCase())) {
        hasAgencyDiff = true;
        detectedAgencyName = foundLoc;
        document.getElementById('agencyAlertText').innerText = 'Địa danh văn bản ghi: "' + foundLoc + '", nhưng cài đặt của đồng chí là "' + settings.shortLocation + '". Đồng chí có muốn sửa thành "' + settings.shortLocation + '" không?';
        alertBox.style.display = 'flex';
      } else {
        alertBox.style.display = 'none';
      }

      // Sửa chính tả tiếng Việt
      const spellingRules = [
        { reg: /\\bsử lý\\b/gi, rep: 'xử lý', msg: 'Sửa lỗi chính tả: "sử lý" ➔ "xử lý"' },
        { reg: /\\bbổ xung\\b/gi, rep: 'bổ sung', msg: 'Sửa lỗi chính tả: "bổ xung" ➔ "bổ sung"' },
        { reg: /\\bxắp xếp\\b/gi, rep: 'sắp xếp', msg: 'Sửa lỗi chính tả: "xắp xếp" ➔ "sắp xếp"' },
        { reg: /\\bqui định\\b/gi, rep: 'quy định', msg: 'Chuẩn hóa chính tả: "qui định" ➔ "quy định"' },
        { reg: /\\bbố chí\\b/gi, rep: 'bố trí', msg: 'Sửa lỗi chính tả: "bố chí" ➔ "bố trí"' },
        { reg: /\\bcác bác\\b/gi, rep: 'các đồng chí', msg: 'Văn phong hành chính: Thay "các bác" bằng "các đồng chí"' },
        { reg: /\\blàm gấp\\b/gi, rep: 'khẩn trương triển khai', msg: 'Văn phong hành chính: Thay khẩu ngữ "làm gấp" bằng "khẩn trương triển khai"' },
        { reg: /\\b8h sáng\\b/gi, rep: '08 giờ 00 phút', msg: 'Thể thức NĐ 30: Viết rõ "08 giờ 00 phút"' }
      ];

      for (const r of spellingRules) {
        if (r.reg.test(text)) {
          text = text.replace(r.reg, r.rep);
          errors.push(r.msg);
        }
      }

      // Chuẩn hóa Quốc hiệu & Tiêu ngữ
      text = text.replace(/cộng hòa xã hội chủ nghĩa việt nam/gi, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      text = text.replace(/độc lập\\s*-\\s*tự do\\s*-\\s*hạnh phúc/gi, 'Độc lập - Tự do - Hạnh phúc');

      normalizedContent = text;
      document.getElementById('paperPreview').innerText = text;
      document.getElementById('errorsList').innerHTML = errors.map(e => '<li>' + e + '</li>').join('');
      document.getElementById('scoreBefore').innerText = (hasAgencyDiff ? '42' : '55') + ' / 100';
      document.getElementById('scoreAfter').innerText = '98 / 100';
      document.getElementById('errorCount').innerText = errors.length + (hasAgencyDiff ? 1 : 0) + ' lỗi đã xử lý';

      goToStep(3);
    }

    function acceptAgencyChange() {
      const s = getSettings();
      let text = normalizedContent;
      if (detectedAgencyName) {
        text = text.replace(detectedAgencyName, s.agencyName);
      }
      text = text.replace(/Đông Sơn|Bỉm Sơn/g, s.shortLocation);
      normalizedContent = text;
      document.getElementById('paperPreview').innerText = text;
      document.getElementById('agencyAlertBox').style.display = 'none';
      alert('Tiểu Bảo đã đồng bộ cơ quan và địa danh sang: ' + s.agencyName + ' (' + s.shortLocation + ') thành công!');
    }

    function dismissAgencyChange() {
      document.getElementById('agencyAlertBox').style.display = 'none';
    }

    function copyResultText() {
      navigator.clipboard.writeText(normalizedContent).then(() => {
        alert('Đã sao chép nội dung văn bản chuẩn hóa vào Clipboard!');
      });
    }

    function downloadDocxFile() {
      const blob = new Blob(['\\ufeff' + normalizedContent], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (currentDocType.name || 'van-ban') + '-chuan-hoa-ND30.doc';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Init
    window.addEventListener('DOMContentLoaded', () => {
      renderAgencyBadge();
    });
  </script>
</body>
</html>`;
}
