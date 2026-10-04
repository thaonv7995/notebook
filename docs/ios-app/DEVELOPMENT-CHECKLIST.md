# ✅ Notebook Studio iOS — Development Checklist

> Checklist chi tiết từng task cần làm để build app iOS, dựa trên project web hiện tại.
> Mỗi task có mô tả cụ thể + reference đến code/API hiện có.

---

## Phase 0: Khởi tạo Project 🏗️ `~1 ngày` ✅ DONE

- [x] **P0-1** Tạo Xcode project mới: SwiftUI, iOS 17+, tên "NotebookStudio" ✅
- [x] **P0-2** Cấu hình Bundle ID, Team, Signing & Capabilities ✅ `com.thaonv.notebookstudio`
- [x] **P0-3** Thêm Swift Packages: ✅
  - `Lottie` (animations) — v4.5.0
  - `KeychainAccess` (lưu JWT an toàn) — v4.2.2
- [x] **P0-4** Tạo cấu trúc folder ✅
  ```
  NotebookStudio/
  ├── App/                  # App entry, TabView
  ├── Models/               # Data models (Codable)
  ├── Services/             # Networking, Auth, Sync
  ├── Storage/              # SwiftData / local persistence
  ├── Views/
  │   ├── Library/          # Tab 1
  │   ├── Reader/           # Core reading view
  │   ├── Search/           # Tab 2
  │   ├── Favorites/        # Tab 3
  │   ├── Settings/         # Tab 4
  │   └── Components/       # Shared UI components
  ├── ViewModels/           # ObservableObject view models
  ├── Theme/                # Colors, fonts, design tokens
  ├── Extensions/           # Swift extensions
  └── Resources/            # Assets, Lottie files, fonts
  ```
- [x] **P0-5** Tạo `Theme/DesignTokens.swift` — Color palette + Typography scale ✅
  - Light: background `#f5f0eb`, paper `#faf5e8`, accent `#c9a84c`
  - Dark: background `#0d1117`, paper `#2a2520`, accent `#d4a849`
- [x] **P0-6** Import font "Plus Jakarta Sans" vào project ✅ (variable weight + italic)
- [x] **P0-7** Tạo `App/NotebookStudioApp.swift` với TabView 4 tabs cơ bản ✅

---

## Phase 1: Data Models 📦 `~2 ngày` ✅ DONE

> Map 1:1 với JSON structure trong web app. Xem [`store.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/state/store.js) dòng 28-133.

- [x] **P1-1** Tạo `Models/Notebook.swift` ✅ — Codable + resilient decoding + computed properties (readingProgress, primaryTemplate)
- [x] **P1-2** Tạo `Models/Page.swift` ✅ — All 10 template fields + chartData (discovered from real data) + hasContent computed
- [x] **P1-3** Tạo `Models/PageTemplate.swift` ✅ — enum with displayName + iconName (SF Symbols)
- [x] **P1-4** Tạo `Models/ActionItem.swift` ✅ — + WorkStatus enum (TODO/WIP/DONE with labels)
- [x] **P1-5** Tạo `Models/Quadrants.swift` ✅ — + ChartData struct (3 columns, found in real db.json)
- [x] **P1-6** Tạo `Models/APIResponse.swift` ✅ — LoginResponse, NotebooksResponse, SyncResponse, SyncMetaResponse, APIErrorResponse, SyncRequest
- [x] **P1-7** Viết Unit Tests ✅ — 15 tests: decode all templates, missing fields, roundtrip, computed props, API responses


---

## Phase 2: Networking & Auth 🔐 `~3 ngày`

> Backend API: [`server/api.js`](file:///Users/thaonv/Desktop/Notebook%20Project/server/api.js), Auth: [`server/auth.js`](file:///Users/thaonv/Desktop/Notebook%20Project/server/auth.js)

- [x] **P2-1** Tạo `Services/APIConfig.swift` ✅:
  - Server URL persisted in UserDefaults, all endpoints enum with path + method
  - 3 timeout tiers (request 30s, sync 60s, ping 10s)
  - Common headers, auth header builder, URLSessionConfiguration

- [x] **P2-2** Tạo `Services/APIClient.swift` ✅ — URLSession wrapper:
  - Actor-isolated async/await, auto JWT Bearer header
  - 401 → `unauthorizedNotification` → auto logout
  - Typed `APIError` enum with Vietnamese messages + `isOffline`/`isAuthError` helpers

- [ ] **P2-3** Tạo `Services/AuthService.swift`:
  | Method | API Endpoint | Ghi chú |
  |:---|:---|:---|
  | `login(username, password)` | `POST /api/auth/login` | Nhận JWT từ response body (không dùng cookie trên iOS) |
  | `logout()` | `POST /api/auth/logout` | Xóa JWT local |
  | `checkSession()` | `GET /api/auth/me` | Verify JWT còn valid |
  | `changePassword(old, new)` | `POST /api/auth/change-password` | |

  > ⚠️ Web dùng httpOnly cookie, iOS cần **sửa backend** để trả JWT trong response body, hoặc đọc `Set-Cookie` header.

- [ ] **P2-4** Tạo `Services/KeychainManager.swift`:
  - Lưu JWT token vào Keychain (không UserDefaults!)
  - Lưu server URL
  - Clear on logout

- [ ] **P2-5** Tạo `Services/NotebookService.swift`:
  | Method | API Endpoint | Mục đích |
  |:---|:---|:---|
  | `fetchAll()` | `GET /api/notebooks` | Tải toàn bộ thư viện |
  | `getSyncMeta()` | `GET /api/notebooks/sync-meta` | Check server timestamp |
  | `sync(notebooks, lastSyncedAt)` | `PUT /api/notebooks/sync` | Smart merge sync |

- [ ] **P2-6** Tạo `ViewModels/AuthViewModel.swift`:
  - `@Published var isLoggedIn: Bool`
  - `@Published var isLoading: Bool`
  - `@Published var error: String?`
  - Auto-check session on app launch

- [ ] **P2-7** **[BACKEND]** Sửa [`auth.js`](file:///Users/thaonv/Desktop/Notebook%20Project/server/auth.js) — trả JWT trong response body cho mobile:
  ```javascript
  // Thêm vào login response:
  res.json({ ok: true, user: {...}, token: token });
  ```

---

## Phase 3: Local Storage & Offline 💾 `~2 ngày`

- [ ] **P3-1** Tạo `Storage/NotebookStore.swift` — SwiftData model:
  - `@Model class CachedNotebook` — mirror Notebook struct
  - `@Model class CachedPage` — mirror Page struct
  - Relationship: Notebook → Pages (cascade delete)

- [ ] **P3-2** Tạo `Storage/LocalStorageManager.swift`:
  - `saveNotebooks([Notebook])` → SwiftData
  - `loadNotebooks() -> [Notebook]`
  - `getNotebook(id) -> Notebook?`
  - `deleteAll()`

- [ ] **P3-3** Tạo `Services/SyncManager.swift` — Sync engine:
  - Mở app → Load local cache → Hiển thị ngay → Background fetch từ server
  - So sánh `lastSyncedAt` local vs server
  - Nếu server mới hơn → pull & merge
  - Lưu `lastSyncedAt` vào UserDefaults
  - Handle conflict: server wins (vì app chỉ đọc, không sửa nội dung)

- [ ] **P3-4** Tạo `Storage/ReadingProgressStore.swift`:
  - Lưu `lastPageIndex` per notebook locally
  - Sync reading position lên server qua `PUT /api/notebooks/sync`

- [ ] **P3-5** Tạo `Storage/BookmarkStore.swift`:
  - Lưu danh sách bookmarked page IDs locally
  - `struct Bookmark { notebookId, pageId, createdAt }`

- [ ] **P3-6** Network reachability monitor — `NWPathMonitor`:
  - Detect online/offline
  - Auto-sync khi có mạng trở lại

---

## Phase 4: UI — Library Tab 📚 `~3 ngày`

- [ ] **P4-1** Tạo `Views/Library/LibraryView.swift`:
  - NavigationStack với `.navigationTitle("Notebook Studio")`
  - `.searchable()` modifier cho search trong library
  - Pull-to-refresh (`refreshable`)

- [ ] **P4-2** Tạo `Views/Library/CategoryChipsView.swift`:
  - Horizontal ScrollView chips: "All", "Study", "Work", "Personal"
  - Extract unique categories từ notebooks
  - Chip active có accent gradient

- [ ] **P4-3** Tạo `Views/Library/NotebookCardView.swift`:
  - Layout ngang: Thumbnail | Title + Subtitle + Last opened
  - Progress ring (đọc đến trang mấy / tổng trang)
  - Parse `coverGradient` CSS → SwiftUI LinearGradient cho thumbnail
  - Swipe actions: Pin / Share / Delete

- [ ] **P4-4** Tạo `Views/Library/SortMenu.swift`:
  - Menu sort: Mới mở / Tên A-Z / Ngày tạo / Pinned first

- [ ] **P4-5** Tạo `ViewModels/LibraryViewModel.swift`:
  - `@Published var notebooks: [Notebook]`
  - `@Published var filteredNotebooks: [Notebook]`
  - `@Published var selectedCategory: String`
  - `@Published var sortOrder: SortOrder`
  - `@Published var searchText: String`
  - Filter + sort logic
  - Pull-to-refresh → SyncManager.sync()

- [ ] **P4-6** Empty state — Khi chưa có notebook hoặc chưa sync
- [ ] **P4-7** Loading skeleton animation khi đang tải

---

## Phase 5: UI — Reader View 📖 `~7 ngày` ⭐ CORE

> Đây là phần quan trọng nhất. Cần render nội dung HTML (rich-text) từ web thành SwiftUI native views.

### 5A: Reader Shell

- [ ] **P5-1** Tạo `Views/Reader/ReaderView.swift`:
  - Nhận `Notebook` → hiển thị trang theo `lastPageIndex`
  - Tap giữa → toggle chrome (top bar + bottom scrubber)
  - Tự động lưu `lastPageIndex` khi chuyển trang

- [ ] **P5-2** Tạo `Views/Reader/ReaderChromeView.swift` (Top bar):
  - ← Back button | Notebook title | "Trang 3/12"
  - Auto-hide sau 3s không tương tác
  - Semi-transparent background

- [ ] **P5-3** Tạo `Views/Reader/PageScrubberView.swift` (Bottom):
  - Slider từ trang 1 → N
  - Kéo → hiện preview số trang
  - Auto-hide cùng chrome

- [ ] **P5-4** Tạo `Views/Reader/PageNavigationView.swift`:
  - TabView với `.tabViewStyle(.page(indexDisplayMode: .never))`
  - Swipe trái/phải để lật trang
  - Custom transition animation (slide + fade)

- [ ] **P5-5** Haptic feedback — `UIImpactFeedbackGenerator(.light)` khi lật trang

### 5B: HTML → Native Rendering

> Nội dung trang lưu dạng **HTML string** (rich-text từ contentEditable trên web).
> Cần parse HTML → SwiftUI Text/AttributedString.

- [ ] **P5-6** Tạo `Services/HTMLParser.swift`:
  - Parse HTML tags: `<b>`, `<i>`, `<u>`, `<s>`, `<br>`, `<div>`, `<p>`
  - Parse `<h1>`, `<h2>`, `<h3>` → heading styles
  - Parse `<span style="color:...">` → text color
  - Parse `<span style="background-color:...">` → highlight
  - Parse `<ul>`, `<ol>`, `<li>` → list items
  - Parse `<code>`, `<pre>` → code blocks
  - Parse `<blockquote>` → quote style
  - Parse `<input type="checkbox">` → checkbox display
  - Parse `<img src="data:...">` → inline images
  - Output: `AttributedString` hoặc `[RichTextBlock]` enum

- [ ] **P5-7** Tạo `Views/Reader/RichTextView.swift`:
  - Nhận parsed content → render SwiftUI views
  - Hỗ trợ: bold, italic, underline, strikethrough, colors, headings, lists, code blocks
  - Scrollable nếu nội dung dài hơn màn hình

### 5C: Template Layouts (10 templates)

- [ ] **P5-8** Tạo `Views/Reader/Templates/CornellPageView.swift`:
  - Header: Subject/Topic | Date | No.
  - 2 cột: Cues & Questions (30%) | Notes (70%)
  - Footer: Summary & Synthesis
  - Nền giấy cream + border lines
  > Ref: [`templates/cornell.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/cornell.js)

- [ ] **P5-9** Tạo `Views/Reader/Templates/WorkPageView.swift`:
  - Header: Project | Deadline | Status badge (TODO/WIP/DONE)
  - 2 cột: Notes/Discussions | Action Items checklist
  - Agenda section
  > Ref: [`templates/work.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/work.js)

- [ ] **P5-10** Tạo `Views/Reader/Templates/RuledPageView.swift`:
  - Full-width content area với dòng kẻ ngang nền
  - Scrollable rich-text
  > Ref: [`templates/ruled.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/ruled.js)

- [ ] **P5-11** Tạo `Views/Reader/Templates/VocabPageView.swift`:
  - Cards: Word | Meaning | Example | Review
  > Ref: [`templates/vocab.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/vocab.js)

- [ ] **P5-12** Tạo `Views/Reader/Templates/ChartingPageView.swift`:
  - 3 cột so sánh + Analysis section
  > Ref: [`templates/charting.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/charting.js)

- [ ] **P5-13** Tạo `Views/Reader/Templates/ReadingPageView.swift`:
  - Ideas | Quotes | Reflection sections
  > Ref: [`templates/reading.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/reading.js)

- [ ] **P5-14** Tạo `Views/Reader/Templates/DotGridPageView.swift`:
  - Dot grid background pattern + content overlay
  > Ref: [`templates/dotgrid.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/dotgrid.js)

- [ ] **P5-15** Tạo `Views/Reader/Templates/GridPageView.swift`:
  - Square grid background + content overlay
  > Ref: [`templates/grid.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/grid.js)

- [ ] **P5-16** Tạo `Views/Reader/Templates/BlankPageView.swift`:
  - Clean white/cream surface + content
  > Ref: [`templates/blank.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/blank.js)

- [ ] **P5-17** Tạo `Views/Reader/Templates/EisenhowerPageView.swift`:
  - 4 quadrants: Do | Schedule | Delegate | Eliminate
  > Ref: [`templates/quadrant.js`](file:///Users/thaonv/Desktop/Notebook%20Project/src/templates/quadrant.js)

- [ ] **P5-18** Tạo `Views/Reader/Templates/TemplateRouter.swift`:
  - Switch `page.template` → đúng View
  - Fallback về RuledPageView

### 5D: Reading Experience

- [ ] **P5-19** Paper tone theming — áp dụng nền giấy theo setting:
  - Cream (`#faf5e8`), White (`#ffffff`), Dark (`#2a2520`)
  - Lấy từ notebook hoặc global setting

- [ ] **P5-20** Font settings cho reader:
  - Chọn font family (Jakarta Sans, Serif, Mono)
  - Chọn cỡ chữ (slider 14-24pt)
  - Chọn line height

- [ ] **P5-21** Pinch-to-zoom trên trang — `MagnificationGesture`
- [ ] **P5-22** Bookmark button trên mỗi trang — toggle + haptic
- [ ] **P5-23** Table of Contents drawer — list tất cả trang, tap nhảy đến trang

---

## Phase 6: UI — Search & Favorites & Settings 🔍⭐⚙️ `~4 ngày`

### Search Tab

- [ ] **P6-1** Tạo `Views/Search/SearchView.swift`:
  - iOS native `.searchable()` search bar
  - Recent searches chips (lưu UserDefaults)
  - Quick Access: horizontal scroll 5 trang đọc gần nhất

- [ ] **P6-2** Tạo `Services/SearchEngine.swift`:
  - Full-text search trong: notebook title, page topic/title, cues, notes, summary, content, actions
  - Strip HTML tags trước khi search
  - Return results với snippet + keyword highlight

- [ ] **P6-3** Tạo `Views/Search/SearchResultView.swift`:
  - Mỗi result: Notebook name → Page number → Snippet với highlight
  - Tap → mở ReaderView ở đúng trang đó

### Favorites Tab

- [ ] **P6-4** Tạo `Views/Favorites/FavoritesView.swift`:
  - Section 1: Pinned Notebooks (từ `isPinned`)
  - Section 2: Bookmarked Pages

- [ ] **P6-5** Tạo `Views/Favorites/BookmarkedPageCard.swift`:
  - Preview snippet nội dung trang
  - Notebook name + page number
  - Swipe to unbookmark

### Settings Tab

- [ ] **P6-6** Tạo `Views/Settings/SettingsView.swift` — Form-based layout:
  - Account section: Username display, Change password, Logout
  - Server section: Server URL, Connection status, Last synced, Manual sync button
  - Reading section: Default font, font size slider, line height picker
  - Appearance section: Color scheme (Light/Dark/System), Paper tone
  - Offline section: Cached notebooks count, Clear cache button
  - About section: App version, Build number

- [ ] **P6-7** Tạo `ViewModels/SettingsViewModel.swift`:
  - Persist settings trong `@AppStorage`
  - Sync settings (font, paper tone) ảnh hưởng ReaderView

---

## Phase 7: Login & Onboarding 🔑 `~2 ngày`

- [ ] **P7-1** Tạo `Views/Auth/LoginView.swift`:
  - Server URL input field
  - Username + Password fields
  - Login button với loading state
  - Error message display
  - "Remember me" toggle
  - Clean, premium design matching app theme

- [ ] **P7-2** Root navigation logic:
  ```swift
  @main struct NotebookStudioApp: App {
      var body: some Scene {
          WindowGroup {
              if authVM.isLoggedIn {
                  MainTabView()
              } else {
                  LoginView()
              }
          }
      }
  }
  ```

- [ ] **P7-3** Auto-login: Check Keychain JWT → verify → skip login nếu còn valid
- [ ] **P7-4** Session expired handling: 401 → clear & redirect to LoginView

---

## Phase 8: Polish & Platform Features ✨ `~4 ngày`

### Animations & Haptics

- [ ] **P8-1** Page turn animation — custom transition:
  ```swift
  .transition(.asymmetric(
      insertion: .move(edge: .trailing).combined(with: .opacity),
      removal: .move(edge: .leading).combined(with: .opacity)
  ))
  ```
- [ ] **P8-2** Card press effect — `.scaleEffect(isPressed ? 0.97 : 1.0)`
- [ ] **P8-3** Pull-to-refresh Lottie animation (notebook opening)
- [ ] **P8-4** Skeleton loading shimmer cho Library cards

### iOS Platform Integration

- [ ] **P8-5** **Face ID / Touch ID** — Khóa app:
  ```swift
  import LocalAuthentication
  let context = LAContext()
  context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, ...)
  ```

- [ ] **P8-6** **iOS Widget** — WidgetKit:
  - Small widget: Notebook đang đọc + trang hiện tại
  - Tap → mở app vào đúng notebook đó
  - `@AppStorage` shared via App Group

- [ ] **P8-7** **Spotlight Search** — Core Spotlight:
  - Index notebook titles + page topics
  - `CSSearchableItem` cho mỗi notebook
  - Tap search result → deep link vào notebook

- [ ] **P8-8** **Share Sheet** — Chia sẻ trang:
  - Render trang thành UIImage → UIActivityViewController
  - Share as PDF option

- [ ] **P8-9** **Dynamic Type** — Hỗ trợ iOS accessibility text sizes:
  ```swift
  .font(.body) // Tự scale theo Dynamic Type
  @ScaledMetric var customSize: CGFloat = 16
  ```

- [ ] **P8-10** **Orientation support** — Landscape reading mode cho iPad

### Quick Note (Tính năng nhẹ)

- [ ] **P8-11** Tạo `Views/Reader/QuickNoteSheet.swift`:
  - Bottom sheet với TextEditor đơn giản
  - Thêm note ngắn vào cuối nội dung trang
  - Sync note mới lên server

---

## Phase 9: Testing & Release 🚀 `~3 ngày`

- [ ] **P9-1** Unit tests: Models Codable decode/encode
- [ ] **P9-2** Unit tests: HTMLParser đúng output
- [ ] **P9-3** Unit tests: SearchEngine tìm đúng kết quả
- [ ] **P9-4** Unit tests: SyncManager merge logic
- [ ] **P9-5** UI tests: Login flow
- [ ] **P9-6** UI tests: Library → Reader navigation
- [ ] **P9-7** UI tests: Page swipe navigation
- [ ] **P9-8** Test offline mode: Airplane mode → vẫn đọc được cache
- [ ] **P9-9** Test sync conflict: Đọc trên 2 thiết bị → sync đúng
- [ ] **P9-10** Performance test: Library với 50+ notebooks
- [ ] **P9-11** Memory test: Reader với notebook 100+ trang
- [ ] **P9-12** Tạo App Store screenshots (6.7", 6.1", iPad)
- [ ] **P9-13** Viết App Store description + keywords
- [ ] **P9-14** App icon design (notebook icon style)
- [ ] **P9-15** TestFlight beta → test thực tế
- [ ] **P9-16** Submit App Store Review

---

## ⚠️ Backend Changes Cần Làm Trước

Một số thay đổi nhỏ cần sửa trên server web để hỗ trợ iOS:

| # | File | Thay đổi | Lý do |
|:---|:---|:---|:---|
| 1 | [`auth.js`](file:///Users/thaonv/Desktop/Notebook%20Project/server/auth.js) L88 | Thêm `token` vào login response JSON | iOS không dùng httpOnly cookie, cần JWT trong body |
| 2 | [`auth.js`](file:///Users/thaonv/Desktop/Notebook%20Project/server/auth.js) L48 | Đã hỗ trợ `Bearer` header ✅ | Không cần sửa |
| 3 | [`api.js`](file:///Users/thaonv/Desktop/Notebook%20Project/server/api.js) | Không cần sửa ✅ | Tất cả endpoints đã hoạt động |
| 4 | [`index.js`](file:///Users/thaonv/Desktop/Notebook%20Project/server/index.js) | Thêm CORS header cho iOS | Nếu test từ simulator |

---

## 📊 Tổng kết thời gian ước lượng

| Phase | Nội dung | Thời gian |
|:---|:---|:---|
| Phase 0 | Khởi tạo project | 1 ngày |
| Phase 1 | Data Models | 2 ngày |
| Phase 2 | Networking & Auth | 3 ngày |
| Phase 3 | Local Storage & Offline | 2 ngày |
| Phase 4 | UI — Library Tab | 3 ngày |
| **Phase 5** | **UI — Reader View (Core)** | **7 ngày** |
| Phase 6 | UI — Search, Favorites, Settings | 4 ngày |
| Phase 7 | Login & Onboarding | 2 ngày |
| Phase 8 | Polish & Platform Features | 4 ngày |
| Phase 9 | Testing & Release | 3 ngày |
| | **TỔNG** | **~31 ngày (~6 tuần)** |

> Ước lượng cho **1 developer full-time**. Phase 5 (Reader) là nặng nhất vì cần render 10 template layouts + parse HTML rich-text.
