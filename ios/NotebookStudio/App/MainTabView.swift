import SwiftUI

/// Main 4-tab navigation — Library, Search, Favorites, Settings.
struct MainTabView: View {
    @State private var selectedTab: Tab = .library

    enum Tab: String {
        case library, search, favorites, settings
    }

    @AppStorage("app_color_scheme") private var colorSchemeRaw: String = "system"

    private var selectedColorScheme: ColorScheme? {
        switch colorSchemeRaw {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            LibraryView()
                .tabItem {
                    Label("Thư viện", systemImage: "books.vertical.fill")
                }
                .tag(Tab.library)

            SearchView()
                .tabItem {
                    Label("Tìm kiếm", systemImage: "magnifyingglass")
                }
                .tag(Tab.search)

            FavoritesView()
                .tabItem {
                    Label("Yêu thích", systemImage: "star.fill")
                }
                .tag(Tab.favorites)

            SettingsView()
                .tabItem {
                    Label("Cài đặt", systemImage: "gearshape.fill")
                }
                .tag(Tab.settings)
        }
        .tint(DesignTokens.accent)
        .preferredColorScheme(selectedColorScheme)
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthViewModel())
}
