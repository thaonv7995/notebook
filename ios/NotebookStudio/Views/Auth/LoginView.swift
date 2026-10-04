import SwiftUI

/// Login screen — Server URL, username, password.
struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var serverURL: String = ""
    @State private var username: String = ""
    @State private var password: String = ""

    var body: some View {
        ZStack {
            DesignTokens.backgroundDark
                .ignoresSafeArea()

            VStack(spacing: DesignTokens.spacingXL) {
                Spacer()

                // App branding
                VStack(spacing: DesignTokens.spacingSM) {
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(DesignTokens.accentDark)

                    Text("Notebook Studio")
                        .font(.system(size: DesignTokens.fontSizeAppTitle, weight: .bold, design: .serif))
                        .foregroundStyle(DesignTokens.textPrimaryDark)

                    Text("Sổ tay ghi chép số cá nhân")
                        .font(.system(size: DesignTokens.fontSizeCaption))
                        .foregroundStyle(DesignTokens.textSecondaryDark)
                }

                // Form fields
                VStack(spacing: DesignTokens.spacingMD) {
                    LoginTextField(
                        icon: "server.rack",
                        placeholder: "Server URL",
                        text: $serverURL,
                        isSecure: false
                    )

                    LoginTextField(
                        icon: "person.fill",
                        placeholder: "Username",
                        text: $username,
                        isSecure: false
                    )

                    LoginTextField(
                        icon: "lock.fill",
                        placeholder: "Password",
                        text: $password,
                        isSecure: true
                    )
                }
                .padding(.horizontal, DesignTokens.spacingXL)

                // Error message
                if let error = authViewModel.error {
                    Text(error)
                        .font(.system(size: DesignTokens.fontSizeCaption))
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
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
                                .font(.system(size: DesignTokens.fontSizeBody, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(
                        LinearGradient(
                            colors: [DesignTokens.accentDark, DesignTokens.accentLight],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
                }
                .disabled(authViewModel.isLoading || username.isEmpty || password.isEmpty)
                .opacity(username.isEmpty || password.isEmpty ? 0.6 : 1.0)
                .padding(.horizontal, DesignTokens.spacingXL)

                Spacer()
                Spacer()
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
                .foregroundStyle(DesignTokens.textSecondaryDark)
                .frame(width: 20)

            if isSecure {
                SecureField(placeholder, text: $text)
                    .textContentType(.password)
            } else {
                TextField(placeholder, text: $text)
                    .textContentType(icon == "person.fill" ? .username : .URL)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
            }
        }
        .padding(DesignTokens.spacingLG)
        .background(DesignTokens.surfaceDark)
        .foregroundStyle(DesignTokens.textPrimaryDark)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.radiusMD))
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthViewModel())
}
