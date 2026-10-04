import SwiftUI

/// Main 4-tab navigation — Library, Search, Favorites, Settings.
struct MainTabView: View {
    @State private var selectedTab: Tab = .library

    enum Tab: String {
        case library, search, favorites, settings
    }

    @AppStorage("app_color_scheme") private var colorSchemeRaw: String = "system"

    init() {
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithDefaultBackground()
        let accentUIColor = UIColor(red: 201.0/255.0, green: 168.0/255.0, blue: 76.0/255.0, alpha: 1.0)
        tabBarAppearance.stackedLayoutAppearance.selected.iconColor = accentUIColor
        tabBarAppearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: accentUIColor]
        tabBarAppearance.stackedLayoutAppearance.normal.iconColor = UIColor.secondaryLabel
        tabBarAppearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor.secondaryLabel]
        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
    }

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
