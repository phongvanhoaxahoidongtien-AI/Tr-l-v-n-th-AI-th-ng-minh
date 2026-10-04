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

                const systemPrompt = `Bạn là Tiểu Bảo – Trợ lý văn thư chuyên nghiệp.
Nhiệm vụ: Chuẩn hóa văn bản theo Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW.

Quy tắc:
- Áp đúng thể thức theo loại văn bản được chọn (${docType || 'Văn bản hành chính'}).
- Kiểm tra và sửa lỗi chính tả tiếng Việt.
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

