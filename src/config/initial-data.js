/**
 * Initial Library Data
 * Built-in notebook templates: Cornell, Work, Normal (Ruled), Freeform
 */

export const INITIAL_LIBRARY_DATA = {
  activeNotebookId: 'nb-cornell-study',
  activePageIndex: 0,
  pageMode: '2-page',
  zoomLevel: 1.0,
  toolbarCollapsed: false,
  toolbarAdvanced: false,
  fontSize: 16,
  fontFamily: 'sans',
  lineHeight: '28',
  notebooks: [
    {
      id: 'nb-cornell-study',
      title: 'Cornell Notes • Study Journal',
      author: 'Notebook Studio',
      category: 'Học tập',
      lang: 'EN · VI',
      coverGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      coverTextColor: '#ffffff',
      pages: [
        {
          id: 'p-cornell-1',
          lang: 'VI',
          title: 'HỆ THỐNG PHÂN TÁN & SCALABILITY',
          topic: 'System Design: Scalability & Caching Strategy',
          date: '29/09/2026',
          no: '01',
          template: 'cornell',
          cues: '• Scalability (Ngang vs Dọc)\n• Caching Strategy (Cache-aside)\n• Cache Eviction (LRU/LFU)\n• SPOF & High Availability\n• Database Sharding Keys',
          notes: '1. Scale Ngang (Horizontal Scaling):\n   - Thêm server vào stateless tier qua Load Balancer (Round Robin, Least Connection).\n   - Tách biệt Web Tier và Data Tier để scale độc lập.\n\n2. Caching Tier (Redis / Memcached):\n   - Cache-Aside (Lazy Loading): Ứng dụng đọc cache trước, miss thì query DB rồi nạp vào cache.\n   - Write-Through: Ghi dữ liệu đồng thời vào cache và database để đảm bảo tính nhất quán.\n\n3. Cache Eviction Policy:\n   - LRU (Least Recently Used), LFU (Least Frequently Used), TTL (Time-To-Live).\n\n4. Xử lý Single Point of Failure (SPOF):\n   - Cấu hình Multi-AZ replication, tự động failover giữa Master-Slave.',
          summary: 'Hệ thống mở rộng quy mô lớn cần tầng web stateless, cache đa tầng (CDN + Redis) và database replication để đạt độ khả dụng cao (99.99% SLA).'
        },
        {
          id: 'p-cornell-2',
          lang: 'EN',
          title: 'DATA STRUCTURES: TREES & GRAPHS',
          topic: 'Data Structures & Algorithms: Graphs & Trees',
          date: '30/09/2026',
          no: '02',
          template: 'cornell',
          cues: '• DFS vs BFS Complexity\n• Dijkstra Algorithm\n• Balanced Binary Search Tree\n• Red-Black vs AVL Properties',
          notes: '1. Graph Traversals:\n   - BFS uses a Queue, finding shortest path in unweighted graphs with O(V + E) complexity.\n   - DFS uses a Stack / recursion, ideal for topological sort and cycle detection.\n\n2. Shortest Path:\n   - Dijkstra algorithm uses Min-Heap (Priority Queue) with O((V + E) log V).\n\n3. Balanced BST:\n   - AVL enforces strict height balance (diff <= 1), faster lookups.\n   - Red-Black trees require fewer rotations on insert/delete, ideal for standard libraries.',
          summary: 'Choosing the right graph traversal and tree balancing algorithm is essential for optimal network routing and hierarchical data querying.'
        }
      ]
    },
    {
      id: 'nb-work-project',
      title: 'Work & Project Log • Meeting Notes',
      author: 'Notebook Studio',
      category: 'Công việc',
      lang: 'EN · VI',
      coverGradient: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
      coverTextColor: '#ffffff',
      pages: [
        {
          id: 'p-work-1',
          lang: 'VI',
          title: 'KẾ HOẠCH PHÁT TRIỂN NOTEBOOK STUDIO',
          project: 'Notebook Studio: Redesign & Vector Templates',
          date: '29/09/2026',
          deadline: '02/10/2026',
          status: 'WIP',
          template: 'work',
          agenda: '1. Đánh giá giao diện và format trang A4\n2. Tích hợp mẫu Cornell, Work, Ruled\n3. Sửa lỗi ngắt dòng và tràn lề tự động\n4. Phê duyệt bản phát hành v5',
          discussions: '• Đã hoàn thiện ba mẫu trang Cornell, Work Notes và Ruled Notebook.\n• Tất cả đường kẻ hairline vector 7.5mm được giữ nguyên độ nét tuyệt đối.\n• Tích hợp tương tác checkbox thời gian thực cho danh sách Action items.\n• Sửa triệt để lỗi tràn chữ theo chiều ngang bằng thuộc tính CSS word-break và auto-wrap.',
          actions: [
            { checked: true, text: 'Hoàn thiện cấu trúc vector cho ba mẫu trang' },
            { checked: true, text: 'Tích hợp 3 template vào hệ thống chuyển đổi trang' },
            { checked: false, text: 'Kiểm tra chế độ 1 trang & 2 trang song song' },
            { checked: false, text: 'Xác thực tính năng lưu trữ dữ liệu template vào localStorage' },
            { checked: false, text: 'Kiểm tra bản dùng cá nhân trên các thiết bị' }
          ]
        },
        {
          id: 'p-work-2',
          lang: 'EN',
          title: 'SPRINT 15 ARCHITECTURE REVIEW',
          project: 'Sprint 15 Planning & Microservices Architecture',
          date: '03/10/2026',
          deadline: '07/10/2026',
          status: 'TODO',
          template: 'work',
          agenda: '1. Backlog Refinement\n2. Story Points Estimation\n3. Database Migration Strategy',
          discussions: '• Discuss microservice decoupling for the checkout module.\n• Standardize Kafka event schemas across engineering teams.\n• Target 95% test coverage for core domain services.\n• Setup Prometheus alerts for API p99 latency spikes.',
          actions: [
            { checked: false, text: 'Draft architecture RFC document for Tech Lead review' },
            { checked: false, text: 'Set up staging database replica cluster' },
            { checked: false, text: 'Review security compliance with DevSecOps team' },
            { checked: false, text: 'Organize internal tech talk on distributed tracing' },
            { checked: false, text: 'Finalize Sprint 15 task assignments in Jira' }
          ]
        }
      ]
    },
    {
      id: 'nb-ruled-classic',
      title: 'Ruled Notebook',
      author: 'Notebook Studio',
      category: 'Ghi chép',
      lang: 'EN · VI',
      coverGradient: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
      coverTextColor: '#ffffff',
      pages: [
        {
          id: 'p-ruled-1',
          lang: 'VI',
          title: 'NHẬT KÝ CHIẾN LƯỢC SẢN PHẨM',
          topic: 'Nhật Ký Chiến Lược & Tư Duy Phát Triển Sản Phẩm',
          date: '29/09/2026',
          no: '01',
          template: 'ruled',
          content: 'Một sản phẩm xuất sắc không chỉ nằm ở tính năng, mà nằm ở trải nghiệm cảm xúc mà nó mang lại cho người dùng.\n\nKhi người dùng mở một cuốn sổ số, họ phải cảm nhận được sự tỉ mỉ của từng nét gáy sách, độ mịn của mặt giấy ngà, và sự thanh lịch của những đường kẻ ngang vector.\n\nSự tĩnh lặng của không gian viết giúp tâm trí tập trung vào những suy nghĩ sâu sắc nhất. Không có sự xao nhãng của các thông báo hay giao diện lộn xộn.\n\nMỗi trang giấy là một không gian sáng tạo vô tận.'
        },
        {
          id: 'p-ruled-2',
          lang: 'EN',
          title: 'DAILY REFLECTIONS & IDEATION',
          topic: 'Product Ideation & Creative Reflections',
          date: '30/09/2026',
          no: '02',
          template: 'ruled',
          content: 'True productivity is not about doing more things in less time, but about doing the right things with undivided attention.\n\nA digital notebook should feel as tactile and responsive as real paper, while empowering the author with instant search, auto-saving, and effortless page reorganization.\n\nSimplicity is the ultimate sophistication.'
        }
      ]
    },
    {
      id: 'nb-freeform-notes',
      title: 'Sổ Ghi Chú Tự Do • Freeform Notes',
      author: 'Thao NV',
      category: 'Ghi chép',
      lang: 'VN · EN',
      coverGradient: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
      coverTextColor: '#ffffff',
      pages: [
        {
          id: 'p-free-1',
          lang: 'VI',
          title: 'GHI CHÉP VĂN BẢN TỰ DO',
          template: 'ruled',
          content: '# GHI CHÉP TỰ DO\n\nTrang ghi chép tự do dành cho văn bản, tài liệu và các suy nghĩ cá nhân.\n\n- Hỗ trợ đầy đủ định dạng **Markdown**, danh sách gạch đầu dòng.\n- Đổi màu chữ, màu dạ quang và viền pill badge.\n- Tự động ngắt dòng và tự động lưu dữ liệu.'
        },
        {
          id: 'p-free-2',
          lang: 'EN',
          title: 'FREEFORM DIGITAL NOTES',
          template: 'ruled',
          content: '# DIGITAL NOTEBOOK\n\nYour digital notebook for freeform writing, documentation, and ideation.\n\n- Write freely with automatic line wrapping.\n- Seamless 1-Page and 2-Page open book spreads.'
        }
      ]
    }
  ]
};
