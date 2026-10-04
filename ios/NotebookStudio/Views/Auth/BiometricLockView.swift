import SwiftUI

/// Unlock screen presented when Face ID / Touch ID lock is active (P8-5).
struct BiometricLockView: View {
    @ObservedObject var biometricManager = BiometricAuthManager.shared

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#0F172A"), Color(hex: "#1E293B")],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: DesignTokens.spacingXL) {
                Spacer()

                Image(systemName: biometricManager.biometricIcon)
                    .font(.system(size: 72))
                    .foregroundStyle(DesignTokens.accentLight)
                    .padding(.bottom, DesignTokens.spacingSM)

                Text("Notebook Studio đã khóa")
                    .font(.jakartaSans(size: 22, weight: .bold))
                    .foregroundStyle(.white)

                Text("Xác thực bằng \(biometricManager.biometricName) để tiếp tục đọc và ghi chép.")
                    .font(.jakartaSans(size: 14))
                    .foregroundStyle(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DesignTokens.spacingXXL)

                Button {
                    Task {
                        _ = await biometricManager.authenticate()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: biometricManager.biometricIcon)
                        Text("Mở khóa với \(biometricManager.biometricName)")
                            .font(.jakartaSans(size: 15, weight: .semibold))
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 14)
                    .background(DesignTokens.accentLight, in: Capsule())
                    .foregroundStyle(.white)
                }
                .padding(.top, DesignTokens.spacingMD)

                Spacer()
            }
        }
        .task {
            _ = await biometricManager.authenticate()
        }
    }
}

#Preview {
    BiometricLockView()
}
