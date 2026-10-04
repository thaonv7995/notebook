import SwiftUI

/// Placeholder AuthViewModel — will be fully implemented in Phase 2.
@MainActor
class AuthViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var username: String = ""

    func login(serverURL: String, username: String, password: String) async {
        isLoading = true
        error = nil
        // TODO: P2-3 — Implement real login via AuthService
        // Simulate for now
        try? await Task.sleep(for: .seconds(1))
        self.username = username
        self.isLoggedIn = true
        isLoading = false
    }

    func logout() {
        isLoggedIn = false
        username = ""
        // TODO: P2-4 — Clear Keychain JWT
    }

    func checkSession() async {
        // TODO: P2-6 — Auto-check JWT validity on launch
    }
}
