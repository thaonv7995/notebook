import SwiftUI

/// Root content view — routes between Login and Main tabs based on auth state.
struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        Group {
            if authViewModel.isLoggedIn {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authViewModel.isLoggedIn)
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthViewModel())
}
