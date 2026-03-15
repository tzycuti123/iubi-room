# IU BI - Listening Room

Ứng dụng nghe nhạc chung thời gian thực.

## Cách Deploy

### 1. Deploy Server (Backend) lên Render.com
- Đăng nhập vào [Render.com](https://render.com)
- Tạo **New Web Service**
- Kết nối với Repository của bạn (hoặc upload folder này)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- Copy URL mà Render cung cấp (ví dụ: `https://iubi-server.onrender.com`)

### 2. Deploy Frontend lên Vercel.com
- Đăng nhập vào [Vercel.com](https://vercel.com)
- Nhấn **Add New Project**
- Trong phần **Environment Variables**, thêm:
  - **Key**: `VITE_SOCKET_URL`
  - **Value**: [Link Server ở bước 1]
- Nhấn **Deploy**.

## Chạy dưới Local
1. `npm install`
2. `npm run dev`
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
