# Object Detection Backend + Frontend

Project này gồm một backend FastAPI và một frontend React/Vite để upload ảnh hoặc video, chạy YOLO object detection, ước lượng bbox 3D và pose estimation.

Backend chạy mặc định tại `http://127.0.0.1:8000`.
Frontend chạy mặc định tại `http://localhost:5173`.

## 1. Yêu cầu phần mềm

Các bước dưới đây dùng PowerShell trên Windows. Nếu dùng macOS/Linux, lệnh gần tương tự nhưng phần cài SQL Server/ODBC và kích hoạt virtual environment sẽ khác.

Cần cài trước:

1. Git
   - Dùng để tải source code bằng `git clone`.

2. Python 64-bit
   - Khuyến nghị Python 3.14 để khớp môi trường đã kiểm tra trong project này.
   - Khi cài Python trên Windows, nhớ chọn `Add python.exe to PATH`.

3. Node.js
   - Khuyến nghị Node.js 20 LTS trở lên.
   - Project frontend đang dùng Vite và React.

4. SQL Server
   - Có thể dùng SQL Server Developer hoặc SQL Server Express.
   - Nên cài thêm SQL Server Management Studio hoặc Azure Data Studio để tạo database dễ hơn.

5. Microsoft ODBC Driver 17 for SQL Server
   - Backend dùng `pyodbc`, nên máy cần có ODBC driver cho SQL Server.
   - Nếu bạn cài ODBC Driver 18 thay vì 17, cần đổi tên driver trong biến `DATABASE_URL`.

6. Dung lượng trống
   - Nên có tối thiểu vài GB trống cho Python packages, Node packages, file upload, file output và model weights.

Kiểm tra sau khi cài:

```powershell
git --version
python --version
node --version
npm --version
```

Nếu Windows không nhận lệnh `python`, thử:

```powershell
py --version
```

## 2. Tải project về máy

Mở PowerShell tại thư mục bạn muốn lưu project, rồi chạy:

```powershell
git clone https://github.com/nhukhoalofi/Object-Detection.git ObjectDetection-BE
cd ObjectDetection-BE
```

Nếu không dùng Git, bạn có thể tải ZIP từ GitHub, giải nén, rồi mở PowerShell trong thư mục project đã giải nén. Cách dùng Git vẫn được khuyến nghị vì dễ cập nhật code hơn.

## 3. Cấu trúc project

```text
ObjectDetection-BE/
+-- app/                    # Backend FastAPI
|   +-- api/                # API routers
|   +-- ai/                 # YOLO inference
|   +-- models/             # SQLAlchemy models
|   +-- services/           # File service, video job service
+-- frontend/               # React + Vite frontend
+-- scripts/                # Script tạo bảng và seed model metadata
+-- weights/                # Model weights
+-- uploads/                # File người dùng upload, tự tạo khi chạy
+-- outputs/                # Kết quả detect, tự tạo khi chạy
+-- requirements.txt        # Python dependencies
+-- run.py                  # Entrypoint backend
```

Các model weight cần có:

```text
weights/bdd100k_best.pt
weights/best.pt
weights/model_metadata.json
```

Không đổi tên hoặc di chuyển các file `.pt` nếu bạn không cập nhật lại `.env` và dữ liệu trong database.

## 4. Chuẩn bị SQL Server

Backend cần database SQL Server tên `ObjectDetection3D`.

### 4.1. Tạo database bằng SSMS hoặc Azure Data Studio

Mở SQL Server Management Studio hoặc Azure Data Studio, connect vào SQL Server local bằng Windows Authentication, rồi chạy:

```sql
IF DB_ID(N'ObjectDetection3D') IS NULL
BEGIN
    CREATE DATABASE ObjectDetection3D;
END
GO
```

Tên server thường gặp:

```text
localhost
localhost\SQLEXPRESS
.\SQLEXPRESS
```

Nếu bạn cài SQL Server Express theo mặc định, server name thường là `localhost\SQLEXPRESS`.

### 4.2. Kiểm tra ODBC Driver

Chạy PowerShell:

```powershell
Get-OdbcDriver -Name "*SQL Server*" | Select-Object Name, Platform
```

Bạn cần thấy một driver tương tự:

```text
ODBC Driver 17 for SQL Server
```

Nếu máy chỉ có `ODBC Driver 18 for SQL Server`, dùng tên đó trong `DATABASE_URL`.

## 5. Tạo file cấu hình `.env`

Tạo file `.env` ở thư mục gốc project, cùng cấp với `run.py`.

Nội dung mẫu cho SQL Server local dùng Windows Authentication:

```env
APP_NAME=3D Object Detection Backend
APP_VERSION=1.0.0
ENV=development

DATABASE_URL=mssql+pyodbc://@localhost/ObjectDetection3D?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes

UPLOAD_DIR=uploads
OUTPUT_DIR=outputs
WEIGHTS_DIR=weights

DEFAULT_MODEL_PATH=weights/bdd100k_best.pt
DEFAULT_POSE_MODEL_PATH=weights/best.pt
DEFAULT_CONFIDENCE=0.25
DEFAULT_IOU=0.45

MAX_IMAGE_SIZE_MB=20
MAX_VIDEO_SIZE_MB=200

FRONTEND_ORIGIN=http://localhost:5173
```

Nếu SQL Server của bạn là `localhost\SQLEXPRESS`, đổi dòng `DATABASE_URL` thành:

```env
DATABASE_URL=mssql+pyodbc://@localhost\SQLEXPRESS/ObjectDetection3D?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes
```

Nếu dùng ODBC Driver 18:

```env
DATABASE_URL=mssql+pyodbc://@localhost/ObjectDetection3D?driver=ODBC+Driver+18+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes
```

Nếu frontend chạy ở port khác, ví dụ Vite tự chuyển sang `5174`, đổi:

```env
FRONTEND_ORIGIN=http://localhost:5174
```

Sau khi sửa `.env`, cần restart backend.

## 6. Cài backend Python

Đứng tại thư mục gốc project:

```powershell
cd ObjectDetection-BE
```

Tạo virtual environment:

```powershell
python -m venv venv
```

Nếu máy dùng Python Launcher, có thể dùng:

```powershell
py -3.14 -m venv venv
```

Kích hoạt virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

Khi kích hoạt thành công, prompt thường có tiền tố `(venv)`.

Nếu PowerShell báo lỗi không cho chạy script, chạy lệnh này một lần rồi kích hoạt lại:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Cập nhật công cụ cài package:

```powershell
python -m pip install --upgrade pip setuptools wheel
```

Cài dependencies:

```powershell
python -m pip install -r requirements.txt
```

Lưu ý:

- Bước này có thể mất nhiều thời gian vì project dùng `torch`, `opencv-python`, `ultralytics` và các thư viện xử lý ảnh/video.
- Nếu pip báo lỗi liên quan đến build tools, hãy cài Microsoft C++ Build Tools rồi chạy lại lệnh cài dependencies.
- Nếu muốn dùng GPU NVIDIA, cần cài driver/CUDA phù hợp và cài bản PyTorch hỗ trợ CUDA. Project vẫn chạy được bằng CPU, chỉ chậm hơn.

## 7. Tạo bảng và seed dữ liệu model

Đảm bảo SQL Server đang chạy và file `.env` đã đúng, sau đó chạy:

```powershell
python scripts/init_db.py
python scripts/seed_models.py
```

`init_db.py` tạo các bảng:

- `media_files`
- `model_versions`
- `detection_jobs`

`seed_models.py` thêm metadata cho:

- `bdd100k_detection_v1`: object detection model dùng `weights/bdd100k_best.pt`
- `human_pose_v1`: pose estimation model dùng `weights/best.pt`

## 8. Chạy backend

Trong terminal đang kích hoạt `(venv)`, chạy:

```powershell
python run.py
```

Backend sẽ chạy tại:

```text
http://127.0.0.1:8000
```

Kiểm tra backend:

```powershell
curl.exe http://127.0.0.1:8000/api/health
```

Nếu thành công, response có dạng:

```json
{
  "success": true,
  "message": "Backend is running",
  "data": {
    "status": "ok",
    "version": "1.0.0"
  }
}
```

Swagger UI của backend:

```text
http://127.0.0.1:8000/docs
```

## 9. Cài và chạy frontend

Mở một terminal PowerShell mới, đứng tại thư mục frontend:

```powershell
cd ObjectDetection-BE\frontend
```

Cài dependencies:

```powershell
npm install
```

Chạy frontend:

```powershell
npm run dev
```

Mở trình duyệt:

```text
http://localhost:5173
```

Frontend mặc định gọi API tại:

```text
http://localhost:8000/api
```

Nếu backend chạy ở URL khác, tạo file `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Sau khi sửa `frontend/.env`, cần restart frontend dev server.

## 10. Cách chạy project hằng ngày

Sau khi đã cài xong môi trường, mỗi lần mở lại project chỉ cần chạy 2 terminal.

Terminal 1 - backend:

```powershell
cd ObjectDetection-BE
.\venv\Scripts\Activate.ps1
python run.py
```

Terminal 2 - frontend:

```powershell
cd ObjectDetection-BE\frontend
npm run dev
```

Sau đó mở:

```text
http://localhost:5173
```

Dừng backend hoặc frontend bằng `Ctrl + C`.

## 11. Chức năng chính

Backend hiện có các API chính:

```text
GET  /api/health
GET  /api/models
POST /api/uploads/image
POST /api/uploads/video
POST /api/detections/image
POST /api/detections/video
GET  /api/jobs/{job_id}
GET  /api/jobs/{job_id}/result
```

File hỗ trợ:

- Ảnh: `.jpg`, `.jpeg`, `.png`
- Video: `.mp4`, `.avi`, `.mov`

Kết quả được lưu vào:

```text
outputs/images/
outputs/videos/
outputs/json/
```

File upload được lưu vào:

```text
uploads/images/
uploads/videos/
```

## 12. Lỗi thường gặp

### Backend báo thiếu `DATABASE_URL`

Nguyên nhân: chưa tạo file `.env` hoặc tạo sai vị trí.

Cách xử lý:

- Tạo `.env` ở thư mục gốc, cùng cấp với `run.py`.
- Đảm bảo có dòng `DATABASE_URL=...`.
- Restart backend.

### Lỗi không kết nối được SQL Server

Kiểm tra:

- SQL Server service đang chạy.
- Database `ObjectDetection3D` đã được tạo.
- Server name trong `DATABASE_URL` đúng, ví dụ `localhost` hoặc `localhost\SQLEXPRESS`.
- ODBC driver trong `DATABASE_URL` đúng với driver đã cài.

Nếu dùng Windows Authentication, hãy chạy terminal bằng user Windows có quyền truy cập database.

### Lỗi `ODBC Driver 17 for SQL Server not found`

Máy chưa cài driver hoặc driver có tên khác.

Chạy:

```powershell
Get-OdbcDriver -Name "*SQL Server*" | Select-Object Name, Platform
```

Nếu thấy `ODBC Driver 18 for SQL Server`, đổi `driver=ODBC+Driver+17+for+SQL+Server` thành `driver=ODBC+Driver+18+for+SQL+Server` trong `.env`.

### Lỗi `No module named app`

Bạn đang chạy lệnh không đúng thư mục.

Cách xử lý:

```powershell
cd ObjectDetection-BE
.\venv\Scripts\Activate.ps1
python run.py
```

Không chạy `run.py` từ bên trong thư mục `app`.

### Frontend không gọi được backend

Kiểm tra:

- Backend đang chạy tại `http://127.0.0.1:8000`.
- Frontend đang chạy tại `http://localhost:5173`.
- Trong `.env`, `FRONTEND_ORIGIN` đúng với URL frontend.
- Nếu frontend đổi port, cập nhật `FRONTEND_ORIGIN` và restart backend.

### Detect lỗi vì không thấy model weight

Kiểm tra các file:

```powershell
Test-Path weights\bdd100k_best.pt
Test-Path weights\best.pt
```

Cả hai lệnh nên trả về `True`.

Nếu thiếu file, tải lại project bằng Git hoặc đặt đúng file model vào thư mục `weights/`.

### Video detect xong nhưng trình duyệt không phát được video

Backend dùng FFmpeg để chuyển video output sang MP4 tương thích trình duyệt. Package `imageio-ffmpeg` đã nằm trong `requirements.txt`, nhưng nếu vẫn lỗi, hãy cài FFmpeg hệ thống và thêm vào `PATH`, rồi restart backend.

## 13. Ghi chú phát triển

- Không commit file `.env`, `venv/`, `frontend/node_modules/`, `uploads/`, `outputs/`.
- Khi đổi model weight, cập nhật cả `.env` và dữ liệu trong bảng `model_versions`.
- Khi cài thêm package Python, cập nhật `requirements.txt`.
- Khi cài thêm package frontend, cập nhật `frontend/package.json` và `frontend/package-lock.json`.
