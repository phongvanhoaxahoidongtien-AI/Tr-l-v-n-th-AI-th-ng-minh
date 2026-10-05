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

                const systemPrompt = `Bạn là Tiểu Bảo Bối – Trợ lý văn thư thông minh 1.0 chuyên nghiệp.
Nhiệm vụ: Chuẩn hóa văn bản theo Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW.

Quy tắc quan trọng:
- Áp đúng thể thức theo loại văn bản được chọn (${docType || 'Văn bản hành chính'}).
- QUỐC HIỆU VÀ TIÊU NGỮ:
  + Nếu là văn bản hành chính theo Nghị định 30 (Công văn, Quyết định, Tờ trình, Kế hoạch, Báo cáo...): Tiêu đề Quốc ngữ BẮT BUỘC PHẢI LÀ:
    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
    Độc lập - Tự do - Hạnh phúc
    TUYỆT ĐỐI KHÔNG ĐƯỢC để là 'ĐẢNG CỘNG SẢN VIỆT NAM' kể cả khi nội dung có nhắc đến Chi bộ hay Bí thư.
  + Chỉ khi loại văn bản là Văn bản Đảng theo Hướng dẫn 05-HD/VPTW mới dùng tiêu đề: ĐẢNG CỘNG SẢN VIỆT NAM.
- Kiểm tra và sửa lỗi chính tả tiếng Việt, dấu câu, căn lề.
- Kiểm tra văn phong hành chính.
- Cài đặt cơ quan ban hành hiện tại của người dùng:
  + Tên cơ quan ban hành đã cài đặt: "${configuredAgency || 'Chưa cài đặt'}"
  + Địa danh đã cài đặt: "${configuredLocation || 'Chưa cài đặt'}"
  + Người dùng đồng ý thay thế tên cơ quan/địa danh sang đã cài đặt: ${shouldApplyAgency ? 'CÓ (hãy thay thế)' : 'CHƯA (nếu phát hiện khác biệt thì cảnh báo rõ ràng và chỉ đề xuất, chưa thay đổi nếu chưa đồng ý)'}
- Nếu người dùng đã cài đặt sẵn cơ quan ban hành, hãy so sánh với nội dung văn bản. Nếu phát hiện khác biệt về tên cơ quan hoặc địa danh, hãy báo cáo rõ ràng và chỉ sửa khi được người dùng đồng ý.
- Trả về kết quả dưới dạng JSON có cấu trúc:
{
  "diemTruoc": number,
  "diemSau": number,
  "soLoi": number,
  "danhSachLoi": ["lỗi 1", "lỗi 2"],
  "canhBaoCoQuan": "nội dung cảnh báo nếu có khác biệt về cơ quan/địa danh" hoặc null,
  "noiDungChuanHoa": "toàn bộ nội dung đã chuẩn hóa",
  "goiY": ["gợi ý 1", "gợi ý 2"]
}`;

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

