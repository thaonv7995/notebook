# Business Review — Notebook Studio

Ngày đánh giá: 29/09/2026  
Phạm vi: trải nghiệm sản phẩm desktop/mobile, luồng tạo–ghi–lưu, cấu trúc tính năng và khả năng đưa ra thị trường.

## Kết luận điều hành

Notebook Studio có một hướng sản phẩm đáng giữ: **sổ tay số có cấu trúc, cảm giác như giấy A4 thật, đồng thời xuất được bản in đẹp**. Ba template Cornell, Work Notes và Ruled tạo khác biệt rõ hơn một trình soạn thảo ghi chú chung chung.

Tuy nhiên, trạng thái hiện tại phù hợp với **prototype có độ hoàn thiện thị giác cao**, chưa phải MVP sẵn sàng phát hành rộng rãi. Lý do chính là sản phẩm chưa tạo được niềm tin cho dữ liệu người dùng:

- Dữ liệu chỉ lưu trong trình duyệt của một thiết bị.
- Một số trường báo “Đã lưu tự động” nhưng bị mất sau khi tải lại.
- Số trang và tiến độ trên bìa là số tĩnh, không phản ánh dữ liệu thật.
- Trải nghiệm mobile gần như không dùng được để đọc hoặc ghi.

Ưu tiên đúng lúc này là **độ tin cậy, khả năng dùng hằng ngày và định vị khách hàng**, không phải bổ sung thêm nhiều nút định dạng.

## Định vị sản phẩm nên theo đuổi

Không nên cạnh tranh trực diện với Notion, OneNote hay Google Docs ở “ghi chú đa năng”. Lợi thế hiện có nằm ở giao điểm:

> Ghi chú có cấu trúc + trải nghiệm trang giấy tập trung + xuất A4 đẹp.

Nhóm khách hàng đầu tiên phù hợp nhất:

1. Sinh viên và người tự học dùng Cornell Notes.
2. Knowledge worker cần meeting/project log có action items.
3. Người thích ghi chép tối giản nhưng muốn in hoặc lưu PDF đẹp.

Thông điệp giá trị đề xuất:

> “Biến ghi chép hằng ngày thành những cuốn sổ A4 có cấu trúc, dễ tập trung, dễ tìm lại và sẵn sàng để in.”

## Những phần đã hoàn thiện tốt

### 1. Trải nghiệm thị giác và bản sắc

- Tủ sổ, bìa sách và không gian mở sổ tạo cảm giác riêng, không giống một text editor thông thường.
- Bản desktop có chất lượng trình bày tốt; template A4 rõ ràng và có tính trình diễn cao.
- Chế độ một trang/hai trang, zoom, fit page/fit width và hiệu ứng lật trang củng cố đúng concept “sổ tay thật”.

### 2. Vertical slice của tác vụ cốt lõi

Các luồng chính đã có và phần lớn hoạt động:

- Tạo, mở, đổi tên và xóa sổ.
- Thêm/xóa trang, nhảy trang và đổi template theo trang.
- Ba template: Cornell, Work & Project, Ruled.
- Soạn thảo và định dạng: heading, list, todo, quote, code, màu chữ, highlight, undo/redo.
- Tự động lưu vào localStorage.
- Xuất Markdown, in/lưu PDF, sao lưu và khôi phục JSON.
- Tìm kiếm và lọc sổ theo metadata.

### 3. Khả năng demo và kiểm chứng ý tưởng

App đủ tốt để demo concept, phỏng vấn người dùng và kiểm tra mức độ hấp dẫn của trải nghiệm “digital paper”. Đây là tài sản quan trọng: có thể đưa cho người dùng thử ngay thay vì chỉ trình bày mockup.

## Những phần đang dang dở hoặc gây hiểu nhầm

### P0 — Ảnh hưởng trực tiếp đến niềm tin

#### Autosave chưa đáng tin cậy

Trong kiểm thử mẫu Work, thay đổi trường “Project / Objective” rồi tải lại làm giá trị quay về tên cũ, dù UI đã báo “Đã lưu tự động”. Action item trong cùng trang vẫn được lưu. Nguyên nhân là dữ liệu từ `.project-input` được ghi vào `page.topic`, trong khi giao diện Work đọc lại từ `page.project`.

Tác động business: chỉ cần mất một ghi chú công việc, người dùng sẽ ngừng tin tưởng toàn bộ sản phẩm.

#### Số trang và progress không phản ánh dữ liệu thật

Các bìa mẫu hiển thị 48, 36 và 60 trang nhưng mỗi sổ thực tế chỉ có 2 trang. `pagesCount`, `currentProgress` và `progressPct` là dữ liệu hard-code, không được cập nhật khi thêm/xóa trang.

Tác động business: dashboard trông đẹp nhưng tạo cảm giác dữ liệu giả; người dùng không biết trạng thái thật của sổ.

#### Dữ liệu chỉ nằm trên một browser

Toàn bộ thư viện được lưu bằng localStorage. Không có tài khoản thật, đồng bộ, lịch sử phiên bản hay cơ chế khôi phục ngoài việc người dùng tự tải JSON.

Tác động business: chưa thể dùng cho dữ liệu quan trọng, chưa thể chuyển thiết bị, và khó tạo retention đa nền tảng.

#### Import chưa có kiểm tra schema

JSON chỉ cần có thuộc tính `notebooks` là được chấp nhận và thay thế trạng thái hiện tại. Chưa có preview, migration, xác nhận phạm vi hoặc rollback.

Tác động business: một file lỗi có thể làm hỏng/thay thế toàn bộ thư viện.

### P1 — Cản trở sử dụng hằng ngày

#### Mobile chưa phải trải nghiệm ghi chú

Ở viewport 390×844:

- Nút tạo sổ và tài khoản biến mất khỏi header.
- Search co lại thành một ô biểu tượng rất khó hiểu.
- Hai trang A4 bị xếp dọc và thu nhỏ khoảng 40%; chữ gần như không đọc hoặc chạm chính xác được.
- Toolbar dài bị cắt; các chức năng phía sau không có cơ chế khám phá rõ ràng.

Mobile nên mặc định một trang, kích thước chữ đọc được, toolbar rút gọn và cho phép cuộn nội dung tự nhiên.

#### Tìm kiếm quá nông

Search chỉ tìm trong tên sổ, tác giả và category; không tìm nội dung trang, topic, action item hay ngày. Với một sản phẩm ghi chú, “tìm lại” là giá trị cốt lõi và sẽ quan trọng hơn hiệu ứng lật trang sau vài tuần sử dụng.

#### Taxonomy không nhất quán

Người dùng có thể nhập category tự do khi tạo sổ, nhưng bộ lọc chỉ có ba category cố định: Học tập, Công việc, Ghi chép. Một category mới sẽ không có cách lọc trực tiếp.

#### Quản lý nội dung còn thiếu

Chưa có:

- Sắp xếp theo cập nhật gần nhất, tên hoặc ngày tạo.
- Ghim/yêu thích thật (mọi bìa đều có ngôi sao trang trí).
- Archive/trash và undo sau khi xóa.
- Duplicate sổ/trang.
- Di chuyển hoặc sắp xếp lại trang.
- Recent notebooks và mở lại đúng trang đang làm dở.

#### Trạng thái người dùng gây hiểu nhầm

Badge “admin” và author `@thaonv795` được hard-code nhưng không có đăng nhập/tài khoản. Nếu đây là app cá nhân thì nên bỏ; nếu là SaaS thì phải biến thành chức năng thật.

### P2 — Thiếu để phát hành như sản phẩm thương mại

- Chưa có onboarding hoặc hướng dẫn “first value”.
- Chưa có analytics để biết người dùng tạo sổ, ghi nội dung, quay lại hay xuất PDF.
- Chưa có backend, auth, sync, quota, privacy policy và data deletion flow.
- Chưa có chia sẻ read-only hoặc collaboration.
- Chưa có test tự động cho persistence, template conversion, import/export và responsive layout.
- Chưa có manifest/PWA thực sự; service worker hiện chỉ dọn legacy worker.

## Đề xuất roadmap

### Giai đoạn 1 — Trustworthy local MVP (1–2 tuần)

Mục tiêu: mọi dữ liệu hiển thị đều thật và không mất ngoài ý muốn.

- Sửa toàn bộ mapping save/load của ba template, bắt đầu với `project`.
- Chỉ báo “Đã lưu” sau khi serialize thành công; hiển thị lỗi rõ ràng nếu quota/storage thất bại.
- Bỏ các trường progress tĩnh; derive số trang, trang hiện tại và tiến độ từ state.
- Thêm schema version, validation, preview và rollback cho import JSON.
- Thêm trash/restore thay vì xóa vĩnh viễn ngay.
- Viết test cho create → edit → reload → export/import.

Tiêu chí thoát giai đoạn: không mất dữ liệu qua reload trong tất cả template; số liệu trên library khớp 100% với nội dung thật.

### Giai đoạn 2 — Usable daily notebook (2–4 tuần)

Mục tiêu: người dùng có thể dùng app mỗi ngày trên laptop và điện thoại.

- Thiết kế mobile-first cho reader/editor: mặc định 1 trang, toolbar rút gọn, cỡ chữ/chạm đạt chuẩn.
- Full-text search trong nội dung trang và action items.
- Recent, sort, pin, archive và reorder page.
- Category/tag thống nhất: hoặc controlled list, hoặc tạo filter động từ dữ liệu.
- Mở lại đúng sổ/trang/cursor gần nhất.
- Onboarding ngắn theo từng use case: Study, Meeting, Free notes.

Tiêu chí thoát giai đoạn: một người dùng mới tự tạo sổ, ghi 200+ ký tự, tìm lại và xuất PDF mà không cần hướng dẫn trực tiếp.

### Giai đoạn 3 — Launchable product (4–8 tuần)

Mục tiêu: giảm rủi ro dữ liệu và đo được product-market fit.

- Tài khoản, cloud sync, conflict handling và version history cơ bản.
- Mã hóa khi truyền/lưu, privacy controls, export/delete account.
- Product analytics với event tối thiểu và không thu nội dung ghi chú.
- Chia sẻ read-only bằng link; collaboration thời gian thực chỉ làm sau khi có nhu cầu rõ.
- Offline/PWA thực sự nếu người dùng mục tiêu cần dùng trong lớp học/họp.

### Giai đoạn 4 — Growth và monetization

Chỉ nên làm sau khi retention chứng minh người dùng quay lại:

- Template packs chuyên biệt: exam prep, meeting, research, coaching, project planning.
- Custom template builder.
- Branding/export nâng cao cho creator, giáo viên và đội nhóm.
- Thư viện template cộng đồng hoặc marketplace ở giai đoạn sau.

## Bộ chỉ số nên đo

### Activation

- Tỷ lệ tạo sổ đầu tiên.
- Tỷ lệ ghi ít nhất 200 ký tự hoặc hoàn thành một action item.
- Thời gian từ mở app đến “first meaningful note”.

### Retention

- D1, D7 và W4 retention.
- Số ngày ghi chú mỗi tuần.
- Số sổ được mở lại sau ngày tạo.

### Value realization

- Tỷ lệ tìm kiếm thành công rồi mở một trang.
- Tỷ lệ export PDF/Markdown/backup.
- Số action item được đánh dấu hoàn thành.

### Guardrail

- Autosave failure rate.
- Import failure/corruption rate.
- Tỷ lệ session mobile bỏ cuộc trước khi nhập nội dung.

## Quyết định sản phẩm đề xuất

Nếu chỉ chọn ba việc tiếp theo, nên chọn:

1. **Làm persistence đáng tin tuyệt đối** — sửa save mapping và số liệu giả.
2. **Làm mobile one-page thực sự dùng được** — không cố giữ trải nghiệm hai trang trên màn hình nhỏ.
3. **Xây full-text search + recent notebooks** — giúp app có giá trị tăng dần theo thời gian sử dụng.

Không nên ưu tiên ngay: thêm template thứ tư, collaboration realtime, AI writing hoặc marketplace. Các tính năng đó không bù được việc người dùng chưa tin dữ liệu và chưa thể dùng app thuận tiện mỗi ngày.

## Bằng chứng kỹ thuật chính

- State chỉ lưu localStorage: `app.js` dòng 287–317.
- Autosave báo thành công sau khi persist nhưng không xác minh round-trip: `app.js` dòng 406–427.
- Mapping `.project-input` vào `page.topic`: `app.js` dòng 354–362.
- Số trang/progress mẫu hard-code: `app.js` dòng 23–33, 62–71 và 114–123.
- Search chỉ dùng title/author/category: `app.js` dòng 430–446.
- Category tạo tự do nhưng filter cố định: `index.html` và `app.js` dòng 2203–2207.
- Responsive dưới 1024px xếp hai trang theo cột thay vì chuyển sang editor mobile: `app.css` dòng 2062–2078.
- Export/backup/restore đã có: `app.js` dòng 1793–1866.

