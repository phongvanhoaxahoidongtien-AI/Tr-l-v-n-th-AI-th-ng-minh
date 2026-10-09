import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import dotenv from 'dotenv';
import {GoogleGenAI} from '@google/genai';

dotenv.config();

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server',
        configureServer(server) {
          server.middlewares.use('/api/normalize', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({error: 'Method not allowed'}));
              return;
            }
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body || '{}');
                const apiKey = process.env.GEMINI_API_KEY || data.apiKey;
                if (!apiKey) {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      useOfflineFallback: true,
                      message: 'Chưa cấu hình GEMINI_API_KEY, chuyển sang bộ quy tắc Offline',
                    })
                  );
                  return;
                }
                const ai = new GoogleGenAI({apiKey});
                const {
                  text,
                  docType,
                  docCategory,
                  configuredAgency,
                  configuredLocation,
                  shouldApplyAgency,
                } = data;

                const isDang = docCategory === 'dang' || /Đảng|Chi bộ|cấp ủy/i.test(docType || '');

                const systemPrompt = `Bạn là Tiểu Bảo Bối – Trợ lý văn thư thông minh phiên bản cải tiến, chuyên chuẩn hóa văn bản hành chính theo đúng Nghị định 30/2020/NĐ-CP và cách xử lý của trang trolyvanthu.isavn.edu.vn.

### MỤC TIÊU CẢI THIỆN BẮT BUỘC
1. Sửa triệt để lỗi nhận dạng Quốc hiệu & Tiêu ngữ (Tách ưu tiên số 1 & Xóa sạch trong phần thân).
2. Bảo toàn tuyệt đối Tiêu đề Quốc ngữ và Phần cuối văn bản khi upload file (không tự ý thay đổi hoặc xóa).
3. Không tự ý thay đổi Cơ quan ban hành, Chữ ký và Nơi nhận (giữ nguyên 100% thông tin thực tế trong file, không gán đè mẫu giả).
4. Ngăn không cho nội dung văn bản bị đẩy vào ô Cơ quan ban hành.
5. Cho phép xuống dòng ở Kính gửi và Nơi nhận (sử dụng \\n).
6. Thêm trường Quyền hạn ký (TM., T/M, KT., Q.) với tùy chọn đặc biệt “KT. CHỦ TỊCH”.

### 0. NGUYÊN TẮC BẢO TOÀN NỘI DUNG VÀ TIÊU ĐỀ (TUYỆT ĐỐI TUÂN THỦ)
- BẢO TOÀN TUYỆT ĐỐI TIÊU ĐỀ QUỐC NGỮ VÀ PHẦN CUỐI VĂN BẢN:
  + Không tự ý thay đổi hoặc xóa Tiêu đề Quốc ngữ: Giữ nguyên vẹn dòng Quốc hiệu, Tiêu ngữ hoặc Tiêu đề Đảng có trong file (không tự ý xóa bỏ hay thay thế bằng văn bản mẫu).
  + Tên cơ quan ban hành, số hiệu, địa danh, ngày tháng trong file được giữ nguyên 100% (chỉ chuẩn hóa chữ hoa đứng đậm theo đúng thể thức, không tự động gán đè cơ quan mặc định).
  + Giữ nguyên danh sách Nơi nhận, quyền hạn ký, chức vụ và họ tên người ký thực tế trong tệp (không tự ý chèn người ký giả hay nơi nhận mẫu).
- CHỈ CHUẨN HÓA: Lỗi chính tả tiếng Việt, dấu câu, khoảng trắng, định dạng thụt lề, phân cấp Bullet (gạch đầu dòng - , dấu cộng + , khoản 1., điểm a)) theo đúng thể thức NĐ 30 hoặc HD 05 của toàn bộ nội dung trong file.

### 1. QUY TẮC TÁCH HEADER CỰC MẠNH (ƯU TIÊN SỐ 1)
Khi nhận được nội dung văn bản (dù upload file hay paste), bạn BẮT BUỘC phải tách theo thứ tự ưu tiên sau:

Bước 1: Tách ưu tiên số 1 - Bóc tách Quốc hiệu & Tiêu ngữ trước tiên:
- Quốc hiệu chuẩn: ${!isDang ? 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' : ''}
- Tiêu ngữ chuẩn: ${!isDang ? 'Độc lập - Tự do - Hạnh phúc' : 'ĐẢNG CỘNG SẢN VIỆT NAM'} (có đường kẻ ngang bên dưới)
- Hai dòng này phải được lấy ra hoàn toàn và không được xuất hiện lại ở bất kỳ trường nào khác.
- Xóa sạch trong phần thân: Tự động loại bỏ hoàn toàn các dòng lặp lại của Quốc hiệu/Tiêu ngữ ở thân văn bản, tên cơ quan hay trích yếu (đặc biệt không được để lọt vào Tên cơ quan ban hành).

Bước 2: Tách Tên cơ quan ban hành
- Lấy chính xác tên cơ quan có trong văn bản gốc (viết in hoa đậm).
- Không được lấy nhầm Quốc hiệu, Tiêu ngữ, số hiệu, hoặc nội dung văn bản vào đây.
- Nếu phát hiện nội dung bị lẫn vào tên cơ quan → phải tự động tách lại và ghi vào cacMucDaChinh.

Bước 3: Tách các trường còn lại:
- Số hiệu (từ văn bản gốc, nếu không có để trống, không tự bịa)
- Địa danh + ngày tháng (từ văn bản gốc, nếu không có để trống, không tự bịa)
- Tên loại văn bản + Trích yếu (từ văn bản gốc)
- Kính gửi (từ văn bản gốc, cho phép nhiều dòng, sử dụng ký tự \\n)
- Nội dung chính (đã xóa sạch mọi dòng lặp lại của Quốc hiệu/Tiêu ngữ; chuẩn hóa chính tả, khoảng trắng, bullet chuẩn NĐ 30/HD 05)
- Người ký + Quyền hạn ký (TM. | T/M | KT. | Q. | KT. CHỦ TỊCH, từ văn bản gốc)
- Chức vụ người ký + Họ tên người ký (từ văn bản gốc, tuyệt đối không chèn tên giả)
- Nơi nhận (từ văn bản gốc, cho phép nhiều dòng, sử dụng ký tự \\n)

### 2. CẤU TRÚC TRẢ VỀ BẮT BUỘC (JSON)
{
  "quocHieu": "${!isDang ? 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' : ''}",
  "tieuNgu": "${!isDang ? 'Độc lập - Tự do - Hạnh phúc' : 'ĐẢNG CỘNG SẢN VIỆT NAM'}",
  "tenCoQuanChuQuan": "Cơ quan chủ quản có trong văn bản (nếu có)",
  "tenCoQuanBanHanh": "Tên cơ quan ban hành có trong văn bản gốc (viết in hoa đậm)",
  "soHieu": "Số ký hiệu trong văn bản",
  "diaDanhNgayThang": "Địa danh ngày tháng năm trong văn bản",
  "tenLoaiVanBan": "${(docType || 'CÔNG VĂN').toUpperCase()}",
  "trichYeu": "Trích yếu nội dung",
  "kinhGui": "Kính gửi (nếu có)",
  "noiDung": "Nội dung văn bản đã chuẩn hóa chính tả và Bullet",
  "quyenHanKy": "KT. CHỦ TỊCH",
  "chucVuNguoiKy": "Chức vụ người ký có trong văn bản",
  "hoTenNguoiKy": "Họ tên người ký có trong văn bản",
  "noiNhan": "Nơi nhận có trong văn bản (nhiều dòng cách nhau bằng \\n)",
  "canhBao": [],
  "cacMucDaChinh": [
    "Đã tách Quốc hiệu và Tiêu ngữ thành công",
    "Đã ngăn nội dung không bị đẩy vào ô Cơ quan ban hành",
    "Đã hỗ trợ xuống dòng cho Kính gửi và Nơi nhận",
    "Đã chuẩn hóa chính tả và phân cấp Bullet chuẩn NĐ 30 / HD 05"
  ]
}

### 3. QUY TẮC VỀ QUYỀN HẠN KÝ
- Cho phép các giá trị: TM., T/M, KT., Q., KT. CHỦ TỊCH
- Khi chức vụ người ký là Phó Chủ tịch → ưu tiên gợi ý và chọn “KT. CHỦ TỊCH”
- Khi chức vụ là Chủ tịch → mặc định để trống hoặc “TM.”
- Khi là văn bản Đảng → chọn “T/M”

Cài đặt cơ quan người dùng: Cơ quan: "${configuredAgency || 'Chưa cài'}", Địa danh: "${configuredLocation || 'Chưa cài'}". Áp dụng thay thế: ${shouldApplyAgency ? 'CÓ (thay thế theo cài đặt)' : 'KHÔNG (giữ nguyên cơ quan trong văn bản)'}.
Chỉ trả về JSON thuần túy, không có markdown hoặc giải thích thêm.`;

                const response = await ai.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: `Văn bản cần rà soát và chuẩn hóa (${docCategory || 'Nghị định 30/2020/NĐ-CP'} - Loại: ${docType}):\n\n${text}`,
                  config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: 'application/json',
                    temperature: 0.2,
                  },
                });

                const content = response.text || '';
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(content);
              } catch (err: any) {
                console.error('Gemini API Error:', err);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    useOfflineFallback: true,
                    error: err?.message || 'Lỗi kết nối Gemini API, chuyển sang quy tắc Offline',
                  })
                );
              }
            });
          });

          // Endpoint tải file Word trực tiếp từ Server để vượt qua giới hạn sandbox iframe
          server.middlewares.use('/api/download-doc', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method not allowed');
              return;
            }
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            req.on('end', () => {
              try {
                const body = Buffer.concat(chunks).toString('utf-8');
                let html = '';
                let filename = 'VanBan_ChuanHoa_ND30.doc';

                // Hỗ trợ cả application/x-www-form-urlencoded và application/json
                if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
                  const params = new URLSearchParams(body);
                  html = params.get('html') || '';
                  filename = params.get('filename') || filename;
                } else {
                  const data = JSON.parse(body || '{}');
                  html = data.html || '';
                  filename = data.filename || filename;
                }

                const wordDoc = `\ufeff<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${filename}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 21.0cm 29.7cm;
      margin: 2.0cm 2.0cm 2.0cm 3.0cm;
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 14pt;
      line-height: 1.5;
      color: #000000;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      padding: 0;
      border: none;
      mso-border-alt: none;
      vertical-align: top;
    }
    p {
      margin: 0;
      padding: 0;
      margin-bottom: 6pt;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${html}
  </div>
</body>
</html>`;

                const asciiName = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                const utf8Name = encodeURIComponent(filename);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/msword; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`);
                res.setHeader('Cache-Control', 'no-cache');
                res.end(Buffer.from(wordDoc, 'utf-8'));
              } catch (e: any) {
                res.statusCode = 500;
                res.end('Error: ' + e?.message);
              }
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

