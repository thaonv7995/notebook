# Notebook Studio — Features

Tài liệu này là nguồn duy nhất để theo dõi tính năng của dự án.

## Phạm vi sản phẩm

Notebook Studio là ứng dụng sổ tay dành cho sử dụng cá nhân. Người dùng có tài
khoản riêng và có thể mời người khác cùng xem hoặc chỉnh sửa một cuốn sổ.

Không thuộc phạm vi: billing, gói thuê bao, marketplace, quảng cáo, CRM, growth
analytics hoặc các chức năng bán hàng.

## Trạng thái

- `[x]` Đã có và đã kiểm tra.
- `[ ]` Chưa làm hoặc đang nằm trong kế hoạch.
- `[~]` Đã có một phần, cần hoàn thiện thêm.

## Thư viện sổ tay

- [x] Tạo và đổi tên sổ tay.
- [x] Ba mẫu trang: Cornell, Work Notes và Ruled Notebook.
- [x] Hiển thị số trang và vị trí mở gần nhất từ dữ liệu thật.
- [x] Tìm kiếm toàn văn trong tên sổ, nội dung trang và action items.
- [x] Lọc category động và sắp xếp thư viện.
- [x] Ghim và nhân bản sổ tay.
- [x] Thùng rác, khôi phục, xóa vĩnh viễn và hoàn tác thao tác xóa.
- [x] Ghi nhớ sổ và trang mở gần nhất.

## Soạn thảo và trình bày

- [x] Autosave trên thiết bị và thông báo trạng thái lưu.
- [x] Chế độ một trang hoặc hai trang.
- [x] Thêm, xóa, chuyển và nhảy nhanh tới trang.
- [x] Rich-text: heading, đậm, nghiêng, gạch chân, gạch ngang, màu chữ,
  highlight, badge, danh sách, checklist, quote, code block và đường phân cách.
- [x] Hoàn tác và làm lại.
- [x] Chọn font, cỡ chữ và khoảng cách dòng.
- [x] Zoom, Fit Page và Fit Width.
- [x] Action items và trạng thái TODO/WIP/DONE cho Work Notes.
- [x] Giao diện mobile một trang, không làm thay đổi zoom desktop.
- [x] Nhãn accessibility và thao tác bàn phím cho các điều khiển chính.

## Điều hướng, dữ liệu và offline

- [x] URL trực tiếp tới từng sổ và trang trên cùng thiết bị.
- [x] Hỗ trợ browser Back/Forward và sao chép deep-link local có nhãn rõ ràng.
- [x] Schema dữ liệu có version và migration dữ liệu cũ.
- [x] Kiểm tra lỗi lưu trữ và chuẩn hóa dữ liệu khi tải.
- [x] In/lưu PDF toàn bộ cuốn sổ, có lựa chọn thêm bìa A4.
- [x] PWA manifest, icon và application shell dùng offline.
- [x] Service Worker network-first để tránh giữ bản mã nguồn cũ.

## Tài khoản và cộng tác

- [ ] Đăng ký, đăng nhập, đăng xuất và khôi phục tài khoản.
- [ ] Đồng bộ thư viện và nội dung sổ tay qua backend.
- [ ] Mời thành viên bằng email hoặc liên kết riêng tư.
- [ ] Quyền `Owner`, `Editor` và `Viewer` trên từng cuốn sổ.
- [ ] Danh sách thành viên và thu hồi quyền truy cập.
- [ ] Autosave lên server với cảnh báo xung đột chỉnh sửa.
- [ ] Lịch sử phiên bản và khôi phục nội dung trên server.
- [ ] Hiển thị người đang cùng mở một cuốn sổ.
- [ ] Đồng bộ realtime sau khi luồng lưu/xung đột cơ bản ổn định.

## Bảo mật và riêng tư

- [ ] Chỉ thành viên được mời mới có quyền truy cập sổ dùng chung.
- [ ] Kiểm tra quyền ở backend cho mọi thao tác đọc/ghi.
- [ ] Thu hồi toàn bộ session khi đổi mật khẩu hoặc nghi ngờ lộ tài khoản.
- [ ] Cho phép tải dữ liệu cá nhân và xóa tài khoản.
- [ ] Nhật ký tối thiểu cho thao tác mời, đổi quyền và xóa nội dung.

## Thứ tự triển khai tiếp theo

1. Account và đồng bộ dữ liệu cá nhân.
2. Mời thành viên cùng quyền Owner/Editor/Viewer.
3. Kiểm soát xung đột và lịch sử phiên bản.
4. Presence và realtime collaboration.

Mọi tính năng mới phải được cập nhật trong file này cùng commit triển khai.
