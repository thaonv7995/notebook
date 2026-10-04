import SwiftUI

/// Main 4-tab navigation — Library, Search, Favorites, Settings.
struct MainTabView: View {
    @State private var selectedTab: Tab = .library

    enum Tab: String {
        case library, search, favorites, settings
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            LibraryView()
                .tabItem {
                    Label("Library", systemImage: "books.vertical.fill")
                }
                .tag(Tab.library)

            SearchView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }
                .tag(Tab.search)

            FavoritesView()
                .tabItem {
                    Label("Favorites", systemImage: "star.fill")
                }
                .tag(Tab.favorites)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(Tab.settings)
        }
        .tint(DesignTokens.accent)
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthViewModel())
}
