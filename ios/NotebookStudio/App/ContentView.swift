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

/// Premium splash screen shown during session validation.
struct SplashView: View {
    @State private var isAnimating: Bool = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#090D1A"), Color(hex: "#04060A")],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            // Ambient background glow
            Circle()
                .fill(Color(hex: "#F59E0B").opacity(0.12))
                .frame(width: 260, height: 260)
                .blur(radius: 60)
                .scaleEffect(isAnimating ? 1.15 : 0.95)

            VStack(spacing: DesignTokens.spacingXL) {
                // App Icon with glow and squircle mask
                Image("LaunchIcon")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 108, height: 108)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .stroke(Color.white.opacity(0.15), lineWidth: 1)
                    )
                    .shadow(color: Color(hex: "#F59E0B").opacity(0.35), radius: 25, y: 8)
                    .scaleEffect(isAnimating ? 1.0 : 0.92)

                VStack(spacing: DesignTokens.spacingSM) {
                    Text("Notebook Studio")
                        .font(.jakartaSans(size: 26, weight: .bold))
                        .foregroundStyle(.white)

                    Text("Sổ tay tri thức & Đọc sách cá nhân")
                        .font(.jakartaSans(size: 13))
                        .foregroundStyle(Color.white.opacity(0.6))
                }

                ProgressView()
                    .tint(DesignTokens.accentDark)
                    .padding(.top, DesignTokens.spacingMD)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthViewModel())
}
