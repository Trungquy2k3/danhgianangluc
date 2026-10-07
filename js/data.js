/* =========================================================
   CẤU HÌNH & DỮ LIỆU DEMO
   Chỉ cần sửa file này để thay đổi dữ liệu gốc của hệ thống.
   Dữ liệu sau lần chạy đầu tiên sẽ được lưu vào localStorage.
   ========================================================= */

const APP_CONFIG = {

  companyName: 'Bùi Thế Trung Quý - ASIAN JSC',

  shortName: 'ASIAN HR',

  logoText: 'Q',

  // ==============================
  // THÔNG TIN ẢNH ADMIN
  // ==============================
  adminProfile: {
    name: 'Trung Quý',
    position: 'Administrator',
    avatar: 'images/admin/admin.jpg'
  },

  appTitle: 'Đánh giá năng lực nhân sự',

  allowUserResultView: true,

  showEvaluatorName: true,

  allowComments: true,

  adminCredentials: {
    username: 'trungquy',
    password: 'trung quy2025'
  },

  scoreScale: [
    { value: 1, label: 'Rất yếu', description: 'Chưa đáp ứng / chưa thực hiện được' },
    { value: 2, label: 'Yếu', description: 'Cần cải thiện nhiều' },
    { value: 3, label: 'Đạt', description: 'Đạt yêu cầu cơ bản' },
    { value: 4, label: 'Khá', description: 'Tốt và ổn định' },
    { value: 5, label: 'Tốt', description: 'Xuất sắc / chủ động' }
  ],

  scoreComposition: {
    self: 35,
    cross: 65
  },

  resultBands: [
    { min: 90, max: 100, label: 'Xuất sắc', className: 'excellent' },
    { min: 80, max: 89.99, label: 'Tốt', className: 'good' },
    { min: 65, max: 79.99, label: 'Đạt', className: 'pass' },
    { min: 50, max: 64.99, label: 'Cần cải thiện', className: 'improve' },
    { min: 0, max: 49.99, label: 'Chưa đạt', className: 'fail' }
  ],

  evaluationPermissions: {
    worker_to_worker: true,
    worker_to_technical: true,
    technical_to_worker: true,
    technical_to_technical: true
  },

  activePeriod: {
    id: '2026-10',
    name: 'Đánh giá năng lực tháng 10/2026',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'active'
  }

};

// ==============================
// DANH SÁCH NHÂN SỰ
// ==============================
const employees = [
  ['NV001', 'Bùi Thế Lừng', 'Kỹ Thuật', '-', 'Giám đốc', '-', '2024-03-18'],
  ['NV002', 'Đặng Trung Hiếu', 'Kỹ Thuật', '-', 'Kỹ sư điện', 'Kỹ Thuật', '2023-07-11'],
  ['NV003', 'Bùi Thế Trung Quý', 'Kỹ Thuật', '-', 'Kỹ sư điện', 'Kỹ Thuật', '2024-01-05'],
  ['NV004', 'Bùi Thùy Dương', 'Kỹ Thuật', '-', 'Kế Toán', 'Kỹ Thuật', '2024-01-05'],
  ['NV005', 'Hoàng Thị Thu Dịu', 'Kỹ Thuật', '-', 'Kế Toán', 'Kế toán', '2024-01-05'],
  ['NV006', 'Đoàn Văn Điều', 'Kỹ Thuật', '-', 'Kỹ sư điện', 'Kỹ Thuật', '2024-01-05'],
  ['NV007', 'Nguyễn Văn Đức', 'Kỹ Thuật', '-', 'Kỹ sư điện', 'Kỹ Thuật', '2024-01-05'],
  ['NV008', 'Lê Văn Hải', 'Kỹ Thuật', '-', 'Kỹ sư điện', 'Kỹ Thuật', '2024-01-05'],
  ['NV009', 'Vũ Trọng Thương', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV010', 'Cao Văn Gạo', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV011', 'Ngô Xuân Hiếu', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV012', 'Trần Văn Xinh', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV013', 'Nguyễn Văn Khương', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV014', 'Vũ Văn Hạnh', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV015', 'Lương Thị Hoài Thương', 'Thủ kho', '-', 'Thủ Kho', 'Khác', '-'],
  ['NV016', 'Bùi Thanh Quang', 'Kỹ thuật', '-', 'Kỹ thuật', 'Kỹ thuật', '-'],
  ['NV017', 'Trần Văn Lượng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV018', 'Nguyễn Tiến Vang', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV019', 'Võ Văn Phước', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV020', 'Tráng Văn Châu', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV021', 'Nguyễn Thị Nghĩa', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV022', 'Nguyễn Thanh Trung', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV023', 'Nguyễn Việt Hoàng', 'Công nhân', '-', 'Kỹ sư điện', 'Kỹ thuật', '-'],
  ['NV024', 'Hà Thị Kim Ngân', 'Kế toán', '-', 'Kế Toán', 'Khác', '-'],
  ['NV025', 'Phạm Thị Vân Anh', 'Kế toán', '-', 'Kế Toán', 'Khác', '-'],
  ['NV026', 'Lê Tấn Phát', 'Đấu nối', '-', 'Công nhân', 'Kỹ Thuật', '-'],
  ['NV027', 'Lê Văn Vinh', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV028', 'Nguyễn Bá Hưng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV029', 'Dương Văn Mạnh', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV030', 'Phạm Văn Tuấn', 'Đấu nối', '-', 'Công nhân', 'Kỹ Thuật', '-'],
  ['NV031', 'Lê Hữu Huy', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV032', 'Nguyễn Đình Duy', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV033', 'Đỗ Thị Nhớ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV034', 'Đỗ Thị Mãi', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV035', 'Đinh Thanh Thảo', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV036', 'Cao Thành Văn', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV037', 'Bế Văn Hùng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV038', 'Triệu Tiến An', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV039', 'Nguyễn Văn Sơn', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV040', 'Bàn Phúc Vy', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV041', 'Nguyễn Văn Quân', 'Thợ Hàn', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV042', 'Nguyễn Minh Hoàng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV043', 'NGuyễn Văn Duy', 'Thợ điện', '-', 'Công nhân', 'Thợ điện', '-'],
  ['NV044', 'Nguyễn Thanh Tùng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV045', 'Linh Thị Sơn', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV046', 'Đặng Thị Thanh', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV047', 'Lê Thanh Hải', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV048', 'Đoàn Văn Cường', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV049', 'Trương Văn Lợi', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV050', 'Trương Thị Hồng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV051', 'Nguyễn Ngọc Hoàng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV052', 'Nguyễn Văn Tú', 'Thợ điện', '-', 'Kỹ thuật', 'Thợ điện', '-'],
  ['NV053', 'Bàn Thị Thủy', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV054', 'Đỗ Thanh Hải', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV055', 'Triệu Tiến Quý', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV056', 'Vũ Văn Định', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV057', 'Phạm Văn Dũng', 'Thợ điện', '-', 'Công nhân', 'Thợ điện', '-'],
  ['NV058', 'Bàn Thị Lan', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV059', 'Trương Ngọc Thanh', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV060', 'Nguyễn Văn Phi', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV061', 'Đỗ Văn Vinh', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV062', 'Nguyễn Thị Hương', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV063', 'Triệu Quý Quảng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV064', 'Phạm Văn Hoạch', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV065', 'Trương Thị Hợi', 'Thợ điện', '-', 'Công nhân', 'Thợ điện', '-'],
  ['NV066', 'Phạm Văn Hợp', 'Thợ điện', '-', 'Công nhân', 'Thợ điện', '-'],
  ['NV067', 'Triệu Thị Bình', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV068', 'Trần Thanh Quân', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV069', 'Lê Văn Chiến', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV070', 'Nguyễn Tuấn Khang', 'Kỹ thuật', '-', 'Công nhân', 'Kỹ thuật', '-'],
  ['NV071', 'Đinh Mạnh Huỳnh', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV072', 'Nguyễn Tiến Dũng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV073', 'Triệu Thị Hồng', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV074', 'Vũ Văn Tân', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV075', 'Đồng Văn Cường', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV076', ' Lý Tài Tình ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV077', ' Nguyễn Bình Hưng ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV078', ' Hoàng Mạnh Tùng ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV079', ' Triệu Thị Thúy ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV080', ' Lê Doãn Ninh ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV081', ' Vũ Anh Thư ', 'Thợ điện', '-', 'Công nhân', 'Thợ điện', '-'],
  ['NV082', ' Đặng Văn Đức ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV083', ' Nguyễn Đức Anh ', 'Thủ kho', '-', 'Công nhân', 'Thủ kho', '-'],
  ['NV084', ' Đặng Văn Duy ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV085', ' Lý Thị Hương ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV086', ' Đoàn Minh Tuấn ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV087', ' Nguyễn Văn Quý ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV088', ' Rơ Châm Hil ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV089', ' Rơ Châm Púi ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV090', ' Vũ Thị Oanh ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV091', ' Bùi Thế Long ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV092', ' Ninh Đức Nghĩa ', 'Kỹ thuật', '-', 'Kỹ Thuật', 'Kỹ sư điện', '-'],
  ['NV093', ' Nguyễn Thị Thinh ', 'Thủ Kho', '-', 'Công nhân', 'Thủ kho', '-'],
  ['NV094', ' Puih Hyil ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV095', ' Đặng Minh Ân ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV096', ' Trương Thị Mai ', 'Thủ Kho', '-', 'Công nhân', 'Thủ kho', '-'],
  ['NV097', ' Đoàn Phi Long ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV098', ' Trương Thị Cúc ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV099', ' Rơ Châm Phĩu ', 'Công nhân', '-', 'Công nhân', 'Công nhân', '-'],
  ['NV100', ' Phạm Thu Hường ', 'Thủ Kho', '-', 'Công nhân', 'Thủ kho', '-'],
].map(([id,name,department,team,position,group,joinDate]) => ({
  id, name, department, team, position, group, joinDate,
  avatar: `images/employees/${id}.jpg`,
  pin: '1234',
  status: 'active'
}));

// ==============================
// TIÊU CHÍ & CÂU HỎI
// ==============================
const evaluationCriteria = [
  { id:'technical', name:'Trình độ kỹ thuật', icon:'fa-solid fa-gears', description:'Kiến thức và thực hành chuyên môn', weight:20, order:1,
    questions:[
      {id:'tech_01', text:'Nắm được quy trình vận hành máy móc / thiết bị liên quan.', weight:1, active:true},
      {id:'tech_02', text:'Thực hiện đúng quy trình kỹ thuật và hướng dẫn công việc.', weight:1, active:true},
      {id:'tech_03', text:'Có thể xử lý các lỗi kỹ thuật cơ bản trong phạm vi công việc.', weight:1, active:true},
      {id:'tech_04', text:'Chủ động tìm hiểu, cập nhật kiến thức kỹ thuật mới.', weight:1, active:true}
    ]},
  { id:'teamwork', name:'Khả năng làm việc nhóm', icon:'fa-solid fa-people-group', description:'Phối hợp và hỗ trợ đồng đội', weight:10, order:2,
    questions:[
      {id:'team_01', text:'Phối hợp tốt với đồng nghiệp để hoàn thành công việc.', weight:1, active:true},
      {id:'team_02', text:'Sẵn sàng hỗ trợ đồng đội khi cần thiết.', weight:1, active:true},
      {id:'team_03', text:'Chia sẻ thông tin cần thiết với các bên liên quan.', weight:1, active:true}
    ]},
  { id:'health', name:'Sức khỏe / thể lực', icon:'fa-solid fa-heart-pulse', description:'Khả năng duy trì thể lực cần thiết cho công việc', weight:5, order:3,
    questions:[
      {id:'health_01', text:'Duy trì thể lực phù hợp với yêu cầu công việc.', weight:1, active:true},
      {id:'health_02', text:'Có ý thức giữ gìn sức khỏe để đảm bảo ngày công.', weight:1, active:true}
    ]},
  { id:'thinking', name:'Tư duy', icon:'fa-solid fa-brain', description:'Tư duy logic, phân tích và chủ động', weight:5, order:4,
    questions:[
      {id:'think_01', text:'Phân tích vấn đề trước khi đưa ra cách xử lý.', weight:1, active:true},
      {id:'think_02', text:'Có khả năng suy luận và đưa ra giải pháp hợp lý.', weight:1, active:true},
      {id:'think_03', text:'Chủ động đặt câu hỏi khi chưa rõ yêu cầu.', weight:1, active:true}
    ]},
  { id:'discipline', name:'Kỷ luật', icon:'fa-solid fa-scale-balanced', description:'Tuân thủ nội quy và quy trình', weight:10, order:5,
    questions:[
      {id:'discipline_01', text:'Đi làm và nghỉ đúng quy định.', weight:1, active:true},
      {id:'discipline_02', text:'Tuân thủ nội quy, quy trình và hướng dẫn của công ty.', weight:1, active:true},
      {id:'discipline_03', text:'Giữ gìn trật tự và tác phong tại nơi làm việc.', weight:1, active:true}
    ]},
  { id:'responsibility', name:'Trách nhiệm', icon:'fa-solid fa-shield-heart', description:'Tinh thần chịu trách nhiệm với công việc', weight:10, order:6,
    questions:[
      {id:'resp_01', text:'Hoàn thành nhiệm vụ đã được giao.', weight:1, active:true},
      {id:'resp_02', text:'Chủ động báo cáo khi có vướng mắc hoặc rủi ro.', weight:1, active:true},
      {id:'resp_03', text:'Có trách nhiệm với kết quả công việc của mình.', weight:1, active:true}
    ]},
  { id:'learning', name:'Khả năng học hỏi', icon:'fa-solid fa-book-open-reader', description:'Khả năng tiếp thu và phát triển', weight:5, order:7,
    questions:[
      {id:'learn_01', text:'Tiếp thu nhanh hướng dẫn, đào tạo mới.', weight:1, active:true},
      {id:'learn_02', text:'Biết rút kinh nghiệm sau mỗi công việc.', weight:1, active:true}
    ]},
  { id:'communication', name:'Giao tiếp', icon:'fa-solid fa-comments', description:'Trao đổi rõ ràng và phù hợp', weight:5, order:8,
    questions:[
      {id:'comm_01', text:'Trao đổi công việc rõ ràng, đúng trọng tâm.', weight:1, active:true},
      {id:'comm_02', text:'Lắng nghe và phản hồi phù hợp với đồng nghiệp.', weight:1, active:true}
    ]},
  { id:'problem', name:'Giải quyết vấn đề', icon:'fa-solid fa-lightbulb', description:'Xử lý sự cố và tìm giải pháp', weight:5, order:9,
    questions:[
      {id:'problem_01', text:'Xác định được nguyên nhân chính của vấn đề.', weight:1, active:true},
      {id:'problem_02', text:'Đề xuất phương án xử lý khả thi.', weight:1, active:true},
      {id:'problem_03', text:'Theo dõi kết quả sau khi xử lý.', weight:1, active:true}
    ]},
  { id:'safety', name:'An toàn lao động', icon:'fa-solid fa-helmet-safety', description:'Ý thức và tuân thủ an toàn', weight:8, order:10,
    questions:[
      {id:'safe_01', text:'Tuân thủ đầy đủ quy định an toàn lao động.', weight:1, active:true},
      {id:'safe_02', text:'Sử dụng PPE / trang bị bảo hộ đúng quy định.', weight:1, active:true},
      {id:'safe_03', text:'Chủ động nhắc nhở và báo cáo nguy cơ mất an toàn.', weight:1, active:true}
    ]},
  { id:'style', name:'Tác phong làm việc', icon:'fa-solid fa-user-tie', description:'Tính chuyên nghiệp và thái độ làm việc', weight:3, order:11,
    questions:[
      {id:'style_01', text:'Giữ tác phong chuyên nghiệp trong giờ làm việc.', weight:1, active:true},
      {id:'style_02', text:'Tuân thủ đồng phục và yêu cầu về hình ảnh cá nhân.', weight:1, active:true}
    ]},
  { id:'ownership', name:'Ý thức công việc', icon:'fa-solid fa-person-chalkboard', description:'Chủ động và có tinh thần sở hữu công việc', weight:2, order:12,
    questions:[
      {id:'own_01', text:'Chủ động sắp xếp công việc theo mức độ ưu tiên.', weight:1, active:true},
      {id:'own_02', text:'Không đùn đẩy trách nhiệm khi phát sinh vấn đề.', weight:1, active:true}
    ]},
  { id:'adaptability', name:'Khả năng thích nghi', icon:'fa-solid fa-arrows-rotate', description:'Linh hoạt trước thay đổi', weight:2, order:13,
    questions:[
      {id:'adapt_01', text:'Thích nghi với thay đổi về quy trình / kế hoạch.', weight:1, active:true},
      {id:'adapt_02', text:'Giữ được hiệu quả công việc khi có thay đổi đột xuất.', weight:1, active:true}
    ]},
  { id:'quality', name:'Chất lượng công việc', icon:'fa-solid fa-award', description:'Độ chính xác và chất lượng đầu ra', weight:5, order:14,
    questions:[
      {id:'quality_01', text:'Kết quả công việc đạt yêu cầu chất lượng.', weight:1, active:true},
      {id:'quality_02', text:'Ít phát sinh lỗi phải làm lại.', weight:1, active:true},
      {id:'quality_03', text:'Biết tự kiểm tra trước khi bàn giao.', weight:1, active:true}
    ]},
  { id:'performance', name:'Tiến độ / Hiệu suất', icon:'fa-solid fa-gauge-high', description:'Khả năng hoàn thành công việc đúng tiến độ', weight:5, order:15,
    questions:[
      {id:'perf_01', text:'Hoàn thành công việc đúng tiến độ cam kết.', weight:1, active:true},
      {id:'perf_02', text:'Duy trì năng suất phù hợp với yêu cầu công việc.', weight:1, active:true},
      {id:'perf_03', text:'Biết ưu tiên công việc quan trọng để tránh trễ hạn.', weight:1, active:true}
    ]}
];

const defaultSeedScores = [
  {periodId:'2026-10',evaluatorId:'NV001', targetId:'NV002', type:'cross', date:'2026-10-02T08:30:00', note:'Phối hợp tốt, cần chủ động hơn khi có sự cố.', scores:{technical:4,teamwork:5,health:4,thinking:4,discipline:5,responsibility:4,learning:4,communication:4,problem:3,safety:5,style:4,ownership:4,adaptability:4,quality:5,performance:4}},
  {periodId:'2026-10',evaluatorId:'NV002', targetId:'NV001', type:'cross', date:'2026-10-02T10:10:00', note:'Tinh thần trách nhiệm tốt và hỗ trợ đồng đội.', scores:{technical:4,teamwork:5,health:4,thinking:4,discipline:4,responsibility:5,learning:4,communication:5,problem:4,safety:5,style:4,ownership:4,adaptability:4,quality:4,performance:4}},
  {periodId:'2026-10',evaluatorId:'KT001', targetId:'NV001', type:'cross', date:'2026-10-03T09:20:00', note:'Tuân thủ an toàn tốt, thao tác ổn định.', scores:{technical:4,teamwork:4,health:5,thinking:4,discipline:5,responsibility:4,learning:4,communication:4,problem:4,safety:5,style:4,ownership:4,adaptability:4,quality:4,performance:4}},
  {periodId:'2026-10',evaluatorId:'NV003', targetId:'KT001', type:'cross', date:'2026-10-03T13:30:00', note:'Giải thích kỹ thuật dễ hiểu, phản hồi nhanh.', scores:{technical:5,teamwork:5,health:4,thinking:5,discipline:5,responsibility:5,learning:5,communication:5,problem:5,safety:5,style:5,ownership:4,adaptability:5,quality:5,performance:5}},
  {periodId:'2026-10',evaluatorId:'KT002', targetId:'KT003', type:'cross', date:'2026-10-03T15:15:00', note:'Chuyên môn tốt, cần chia sẻ kinh nghiệm nhiều hơn.', scores:{technical:5,teamwork:4,health:4,thinking:5,discipline:5,responsibility:4,learning:5,communication:4,problem:5,safety:5,style:4,ownership:4,adaptability:5,quality:5,performance:5}}
];

function buildInitialData() {
  return {
    employees: structuredClone(employees),
    criteria: structuredClone(evaluationCriteria),
    periods: [structuredClone(APP_CONFIG.activePeriod)],
    evaluations: structuredClone(defaultSeedScores),
    selfEvaluations: [],
    permissions: structuredClone(APP_CONFIG.evaluationPermissions),
    settings: {
      companyName: APP_CONFIG.companyName,
      allowUserResultView: APP_CONFIG.allowUserResultView,
      showEvaluatorName: APP_CONFIG.showEvaluatorName,
      allowComments: APP_CONFIG.allowComments,
      theme: 'light'
    }
  };
}
