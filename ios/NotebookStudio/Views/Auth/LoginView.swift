import SwiftUI

/// Premium Login screen — Server URL, username, password, Remember me toggle (P7-1).
struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var serverURL: String = ""
    @State private var username: String = ""
    @State private var password: String = ""
    @AppStorage("remember_me") private var rememberMe: Bool = true

    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [
                    Color(hex: "#0F172A"),
                    Color(hex: "#1E293B"),
                    Color(hex: "#0F172A")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: DesignTokens.spacingXL) {
                    Spacer(minLength: 40)

                    // App branding
                    VStack(spacing: DesignTokens.spacingSM) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [DesignTokens.accentLight.opacity(0.3), Color.clear],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )
                                .frame(width: 90, height: 90)

                            Image(systemName: "book.pages.fill")
                                .font(.system(size: 48))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color(hex: "#818CF8"), DesignTokens.accentLight],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        }

                        Text("Notebook Studio")
                            .font(.jakartaSans(size: 28, weight: .bold))
                            .foregroundStyle(.white)

                        Text("Sổ tay ghi chép số cá nhân")
                            .font(.jakartaSans(size: DesignTokens.fontSizeCaption))
                            .foregroundStyle(.white.opacity(0.7))
                    }

                    // Form fields
                    VStack(spacing: DesignTokens.spacingMD) {
                        LoginTextField(
                            icon: "server.rack",
                            placeholder: "Địa chỉ máy chủ (vd: http://localhost:3000)",
                            text: $serverURL,
                            isSecure: false
                        )

                        LoginTextField(
                            icon: "person.fill",
                            placeholder: "Tên đăng nhập",
                            text: $username,
                            isSecure: false
                        )

                        LoginTextField(
                            icon: "lock.fill",
                            placeholder: "Mật khẩu",
                            text: $password,
                            isSecure: true
                        )

                        // Remember me toggle
                        Toggle(isOn: $rememberMe) {
                            HStack(spacing: 6) {
                                Image(systemName: rememberMe ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(rememberMe ? DesignTokens.accentLight : .white.opacity(0.5))
                                Text("Ghi nhớ đăng nhập")
                                    .font(.jakartaSans(size: 13))
                                    .foregroundStyle(.white.opacity(0.8))
                            }
                        }
                        .toggleStyle(.button)
                        .tint(.clear)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                    }
                    .padding(.horizontal, DesignTokens.spacingXL)

                    // Error message
                    if let error = authViewModel.error {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 12))
                            Text(error)
                                .font(.jakartaSans(size: DesignTokens.fontSizeCaption))
                        }
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, DesignTokens.spacingLG)
                    }

                    // Login button
                    Button {
                        Task {
                            await authViewModel.login(
                                serverURL: serverURL,
                                username: username,
                                password: password
                            )
                        }
                    } label: {
                        Group {
                            if authViewModel.isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Đăng nhập")
                                    .font(.jakartaSans(size: DesignTokens.fontSizeBody, weight: .bold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(
                            LinearGradient(
                                colors: [Color(hex: "#4F46E5"), Color(hex: "#7C3AED")],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
                        .shadow(color: Color(hex: "#4F46E5").opacity(0.4), radius: 10, y: 4)
                    }
                    .disabled(authViewModel.isLoading || username.isEmpty || password.isEmpty)
                    .opacity(username.isEmpty || password.isEmpty ? 0.6 : 1.0)
                    .padding(.horizontal, DesignTokens.spacingXL)

                    Spacer(minLength: 40)
                }
            }
        }
        .onAppear {
            if serverURL.isEmpty {
                if let saved = KeychainManager.getServerURL(), !saved.isEmpty {
                    serverURL = saved
                } else {
                    serverURL = "http://localhost:3000"
                }
            }
            if username.isEmpty {
                username = KeychainManager.getUsername() ?? ""
            }
        }
    }
}

/// Styled text field for the login screen.
struct LoginTextField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    let isSecure: Bool

    var body: some View {
        HStack(spacing: DesignTokens.spacingMD) {
            Image(systemName: icon)
                .foregroundStyle(DesignTokens.accentLight)
                .frame(width: 20)

            if isSecure {
                SecureField(placeholder, text: $text)
                    .textContentType(.password)
                    .font(.jakartaSans(size: 14))
            } else {
                TextField(placeholder, text: $text)
                    .textContentType(icon == "person.fill" ? .username : .URL)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .font(.jakartaSans(size: 14))
            }
        }
        .padding(DesignTokens.spacingLG)
        .background(Color.white.opacity(0.08))
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.radiusMD)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthViewModel())
}
