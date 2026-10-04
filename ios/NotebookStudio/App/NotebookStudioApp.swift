import SwiftUI

@main
struct NotebookStudioApp: App {
    @StateObject private var authViewModel = AuthViewModel()

    init() {
        FontService.shared.preloadChineseCalligraphyFonts()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
        }
    }
}
