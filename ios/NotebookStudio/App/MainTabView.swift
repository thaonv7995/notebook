import SwiftUI

/// Main 4-tab navigation — Library, Search, Favorites, Settings.
struct MainTabView: View {
    @State private var selectedTab: Tab = .library

    enum Tab: String {
        case library, search, favorites, settings
    }

    @AppStorage("app_color_scheme") private var colorSchemeRaw: String = "system"

    init() {
        // Tab Bar Dark Slate Appearance (#0f172a)
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor(red: 15.0/255.0, green: 23.0/255.0, blue: 42.0/255.0, alpha: 1.0)
        tabBarAppearance.shadowColor = UIColor.white.withAlphaComponent(0.08)

        let activeColor = UIColor(red: 56.0/255.0, green: 189.0/255.0, blue: 248.0/255.0, alpha: 1.0) // #38bdf8 (Sky Blue)
        let inactiveColor = UIColor(red: 148.0/255.0, green: 163.0/255.0, blue: 184.0/255.0, alpha: 1.0) // #94a3b8 (Slate 400)

        tabBarAppearance.stackedLayoutAppearance.selected.iconColor = activeColor
        tabBarAppearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: activeColor,
            .font: UIFont.systemFont(ofSize: 10, weight: .bold)
        ]
        tabBarAppearance.stackedLayoutAppearance.normal.iconColor = inactiveColor
        tabBarAppearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: inactiveColor,
            .font: UIFont.systemFont(ofSize: 10, weight: .medium)
        ]

        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance

        // Navigation Bar Dark Slate Appearance (#0f172a)
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = UIColor(red: 15.0/255.0, green: 23.0/255.0, blue: 42.0/255.0, alpha: 1.0)
        navAppearance.shadowColor = UIColor.white.withAlphaComponent(0.08)
        navAppearance.titleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
        ]
        navAppearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: UIFont.systemFont(ofSize: 28, weight: .bold)
        ]

        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().compactAppearance = navAppearance
        UINavigationBar.appearance().tintColor = activeColor
    }

    private var selectedColorScheme: ColorScheme? {
        switch colorSchemeRaw {
        case "light": return .light
        case "dark": return .dark
        default: return .dark // Default to dark studio theme
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
        .tint(Color(hex: "38bdf8"))
        .preferredColorScheme(selectedColorScheme)
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthViewModel())
}
