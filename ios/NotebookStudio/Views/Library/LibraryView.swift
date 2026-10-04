import SwiftUI

/// Library tab — displays all notebooks with search, filter, and pull-to-refresh.
struct LibraryView: View {
    @StateObject private var viewModel = LibraryViewModel()
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                if viewModel.isLoading && viewModel.notebooks.isEmpty {
                    // Initial loading state
                    LoadingSkeletonView()
                } else if viewModel.notebooks.isEmpty {
                    // Empty state
                    EmptyLibraryView()
                } else {
                    // Main content
                    ScrollView {
                        VStack(spacing: 0) {
                            // Category filter chips
                            CategoryChipsView(
                                categories: viewModel.availableCategories,
                                selectedCategory: $viewModel.selectedCategory
                            )
                            .padding(.top, DesignTokens.spacingSM)

                            // Notebook list
                            LazyVStack(spacing: DesignTokens.spacingSM) {
                                ForEach(viewModel.filteredNotebooks) { notebook in
                                    NavigationLink(value: notebook) {
                                        NotebookCardView(notebook: notebook)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, DesignTokens.spacingLG)
                            .padding(.top, DesignTokens.spacingSM)
                            .padding(.bottom, DesignTokens.spacingXXL)
                        }
                    }
                    .refreshable {
                        await viewModel.refresh()
                    }
                }

                // Offline banner
                if viewModel.isOffline {
                    VStack {
                        OfflineBannerView()
                        Spacer()
                    }
                }
            }
            .navigationTitle("Notebook Studio")
            .searchable(
                text: $viewModel.searchText,
                prompt: "Tìm sổ tay..."
            )
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    SortMenuButton(sortOrder: $viewModel.sortOrder)
                }
            }
            .navigationDestination(for: Notebook.self) { notebook in
                // TODO: Phase 5 — ReaderView(notebook: notebook)
                Text("Reader: \(notebook.title)")
            }
            .task {
                await viewModel.loadNotebooks()
            }
        }
    }
}

// MARK: - Sort Menu Button

struct SortMenuButton: View {
    @Binding var sortOrder: LibraryViewModel.SortOrder

    var body: some View {
        Menu {
            ForEach(LibraryViewModel.SortOrder.allCases) { order in
                Button {
                    withAnimation(.easeInOut(duration: DesignTokens.animationNormal)) {
                        sortOrder = order
                    }
                } label: {
                    Label(order.label, systemImage: order.icon)
                }
                .disabled(sortOrder == order)
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down.circle")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(DesignTokens.accentLight)
        }
    }
}

// MARK: - Empty State

struct EmptyLibraryView: View {
    var body: some View {
        VStack(spacing: DesignTokens.spacingLG) {
            Image(systemName: "books.vertical")
                .font(.system(size: 56))
                .foregroundStyle(DesignTokens.accentLight.opacity(0.6))

            Text("Chưa có sổ tay nào")
                .font(.jakartaSans(size: DesignTokens.fontSizeSectionHeader, weight: .semibold))

            Text("Kéo xuống để đồng bộ từ server\nhoặc tạo sổ tay mới trên web.")
                .font(.jakartaSans(size: DesignTokens.fontSizeCaption))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// MARK: - Offline Banner

struct OfflineBannerView: View {
    var body: some View {
        HStack(spacing: DesignTokens.spacingSM) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 12, weight: .semibold))
            Text("Ngoại tuyến — hiển thị bản lưu trữ")
                .font(.jakartaSans(size: DesignTokens.fontSizeBadge, weight: .medium))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, DesignTokens.spacingLG)
        .padding(.vertical, DesignTokens.spacingSM)
        .background(.orange.gradient, in: Capsule())
        .padding(.top, DesignTokens.spacingSM)
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}

// MARK: - Loading Skeleton

struct LoadingSkeletonView: View {
    @State private var shimmer = false

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.spacingSM) {
                // Category chips skeleton
                HStack(spacing: DesignTokens.spacingSM) {
                    ForEach(0..<4, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: DesignTokens.radiusXL)
                            .fill(.quaternary)
                            .frame(width: 72, height: 32)
                    }
                }
                .padding(.horizontal, DesignTokens.spacingLG)
                .padding(.top, DesignTokens.spacingSM)

                // Card skeletons
                ForEach(0..<5, id: \.self) { _ in
                    SkeletonCardView()
                }
                .padding(.horizontal, DesignTokens.spacingLG)
            }
        }
        .overlay {
            // Shimmer overlay
            LinearGradient(
                colors: [.clear, .white.opacity(0.15), .clear],
                startPoint: .leading,
                endPoint: .trailing
            )
            .rotationEffect(.degrees(30))
            .offset(x: shimmer ? 400 : -400)
            .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: false), value: shimmer)
        }
        .onAppear { shimmer = true }
        .allowsHitTesting(false)
    }
}

struct SkeletonCardView: View {
    var body: some View {
        HStack(spacing: DesignTokens.spacingMD) {
            RoundedRectangle(cornerRadius: DesignTokens.radiusSM)
                .fill(.quaternary)
                .frame(width: 56, height: 72)

            VStack(alignment: .leading, spacing: 6) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(.quaternary)
                    .frame(height: 14)
                    .frame(maxWidth: 180)
                RoundedRectangle(cornerRadius: 4)
                    .fill(.quaternary)
                    .frame(height: 12)
                    .frame(maxWidth: 120)
                RoundedRectangle(cornerRadius: 4)
                    .fill(.quaternary)
                    .frame(height: 10)
                    .frame(maxWidth: 80)
            }

            Spacer()
        }
        .padding(DesignTokens.spacingMD)
        .background(.background, in: RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
    }
}

#Preview {
    LibraryView()
        .environmentObject(AuthViewModel())
}
