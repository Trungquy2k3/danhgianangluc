# EMPLOYEE EVALUATION SYSTEM — Frontend Demo

Hệ thống đánh giá năng lực nhân sự cho môi trường doanh nghiệp/sản xuất. Đây là phiên bản **frontend-only**: HTML5 + CSS3 + JavaScript + localStorage, dùng CDN cho Bootstrap, Font Awesome, Chart.js, SweetAlert2, SheetJS và jsPDF.

## 1. Chạy website

Mở trực tiếp:

```text
index.html
```

Website cũng có thể chạy qua một web server tĩnh đơn giản (khuyến nghị khi đưa lên GitHub Pages).

## 2. Đăng nhập demo

### Nhân viên
- Tìm tên / mã nhân viên / bộ phận / nhóm.
- Chọn nhân sự.
- PIN mặc định của dữ liệu demo: `1234`.

### Admin
- Username: `admin`
- Password: `admin123`

**Cảnh báo:** Đây chỉ là cơ chế demo frontend. Mật khẩu/PIN nằm trong JavaScript và dữ liệu nằm ở localStorage, không phù hợp cho production.

## 3. Nơi chỉnh dữ liệu gốc

File:

```text
js/data.js
```

Trong đó có các khu vực có comment rõ ràng:

- DANH SÁCH NHÂN SỰ
- TIÊU CHÍ & CÂU HỎI
- Cấu hình thang điểm
- Quyền đánh giá chéo
- Kỳ đánh giá

Sau khi website đã chạy và dữ liệu đã nằm trong localStorage, chỉnh `data.js` sẽ không tự ghi đè dữ liệu cũ. Dùng **Admin → Cài đặt → RESET DỮ LIỆU DEMO** để quay về dữ liệu gốc từ `data.js`.

## 4. Thêm nhân viên

Có 2 cách:

1. Sửa mảng `employees` trong `js/data.js` rồi reset dữ liệu demo.
2. Đăng nhập Admin → **Nhân sự** → **Thêm nhân sự**.

Form Admin có preview ảnh và có thể lưu ảnh mới dưới dạng Base64 trong localStorage.

## 5. Thay ảnh nhân viên

### Cách dùng file ảnh thật
Trong `js/data.js`:

```js
avatar: "images/employees/NV001.jpg"
```

Chỉ cần đặt file mới vào:

```text
images/employees/NV001.jpg
```

Website sẽ dùng đường dẫn đó. Có fallback chữ viết tắt nếu ảnh không tồn tại.

### Cách dùng ảnh tải từ Admin
Admin → Nhân sự → Sửa/Thêm → chọn ảnh. Ảnh được lưu Base64 vào localStorage.

## 6. Thay câu hỏi

Có thể sửa trực tiếp `evaluationCriteria` trong `js/data.js`, ví dụ:

```js
{
  id: "technical",
  name: "Trình độ kỹ thuật",
  weight: 20,
  questions: [
    {
      id: "tech_01",
      text: "Nắm được quy trình kỹ thuật?",
      weight: 1,
      active: true
    }
  ]
}
```

Hoặc dùng Admin → **Câu hỏi**.

## 7. Thay trọng số

Trọng số của từng tiêu chí nằm ở `weight`.

Ví dụ:

```js
weight: 20
```

Hệ thống tự tính tổng trọng số. Nếu khác `100%`, Admin sẽ được cảnh báo và người dùng không thể nộp bài đánh giá.

## 8. Thay quyền đánh giá chéo

Trong `APP_CONFIG.evaluationPermissions` hoặc Admin → **Quyền đánh giá**:

```js
worker_to_worker: true,
worker_to_technical: true,
technical_to_worker: true,
technical_to_technical: true
```

Ý nghĩa:

- Công nhân → Công nhân
- Công nhân → Kỹ thuật
- Kỹ thuật → Công nhân
- Kỹ thuật → Kỹ thuật

Admin có thể bật/tắt từng hướng.

## 9. Thang điểm

Nằm trong `APP_CONFIG.scoreScale`:

```text
1 — Rất yếu
2 — Yếu
3 — Đạt
4 — Khá
5 — Tốt
```

Có thể sửa label/description trong JavaScript.

## 10. Phân loại kết quả

Nằm trong `APP_CONFIG.resultBands`:

```text
90–100  Xuất sắc
80–89   Tốt
65–79   Đạt
50–64   Cần cải thiện
0–49    Chưa đạt
```

Có thể chỉnh ngưỡng trong JavaScript.

## 11. Kỳ đánh giá

Admin → **Kỳ đánh giá**.

Mỗi kỳ có:

- ID
- Tên
- Ngày bắt đầu
- Ngày kết thúc
- Trạng thái

Hệ thống không cho nộp khi kỳ không hoạt động hoặc đã hết hạn.

## 12. Backup / Restore

Admin → **Cài đặt**:

- `EXPORT DATA JSON`: tải toàn bộ dữ liệu.
- `IMPORT DATA JSON`: khôi phục dữ liệu từ file JSON.
- `RESET DỮ LIỆU DEMO`: trả về dữ liệu gốc.

Tên file backup dạng:

```text
evaluation_backup_YYYY-MM-DD.json
```

## 13. Xuất báo cáo

Admin → **Báo cáo**:

- Xuất Excel `.xlsx`
- In báo cáo
- Xuất PDF `.pdf`

## 14. GitHub Pages

Đưa nguyên thư mục lên một repository GitHub, chọn:

`Settings → Pages → Deploy from a branch → main / root`

Sau đó GitHub Pages sẽ phục vụ `index.html`.

## 15. Ghi chú bảo mật

Phiên bản này đúng theo yêu cầu frontend demo:

- localStorage
- PIN plaintext trong dữ liệu demo
- Admin credential trong JavaScript

Không dùng cơ chế này để bảo vệ dữ liệu thật của doanh nghiệp. Khi triển khai production nên chuyển sang backend như Node.js/Express + MySQL/PostgreSQL hoặc Supabase/Firebase, cùng Authentication và phân quyền phía server.

## 16. Cấu trúc thư mục

```text
employee-evaluation/
├── index.html
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── data.js
│   ├── storage.js
│   └── app.js
└── images/
    └── employees/
```
