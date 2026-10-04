import SwiftUI

/// Root content view — routes between Login and Main tabs based on auth state.
struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @ObservedObject private var biometricManager = BiometricAuthManager.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if authViewModel.isCheckingSession {
                // Splash / loading while checking saved session
                SplashView()
            } else if !authViewModel.isLoggedIn {
                LoginView()
            } else if biometricManager.isBiometricEnabled && !biometricManager.isUnlocked {
                BiometricLockView()
            } else {
                MainTabView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authViewModel.isLoggedIn)
        .animation(.easeInOut(duration: 0.2), value: authViewModel.isCheckingSession)
        .animation(.easeInOut(duration: 0.2), value: biometricManager.isUnlocked)
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                biometricManager.relock()
            }
        }
        .task {
            // Check saved session on app launch
            await authViewModel.checkSession()
        }
    }
}

/// Minimal splash screen shown during session validation.
struct SplashView: View {
    var body: some View {
        ZStack {
            DesignTokens.backgroundDark
                .ignoresSafeArea()

            VStack(spacing: DesignTokens.spacingLG) {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(DesignTokens.accentDark)

                ProgressView()
                    .tint(DesignTokens.accentDark)
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthViewModel())
}
