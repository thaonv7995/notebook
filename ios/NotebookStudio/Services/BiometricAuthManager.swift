import LocalAuthentication
import SwiftUI

/// Manages Face ID / Touch ID biometric authentication for app protection (P8-5).
@MainActor
final class BiometricAuthManager: ObservableObject {
    static let shared = BiometricAuthManager()

    @AppStorage("biometric_lock_enabled") var isBiometricEnabled: Bool = false
    @Published var isUnlocked: Bool = true
    @Published var biometricType: LABiometryType = .none

    private init() {
        checkBiometricType()
        if isBiometricEnabled {
            isUnlocked = false
        }
    }

    /// Checks device biometric capability (Face ID, Touch ID, or Optic ID).
    func checkBiometricType() {
        let context = LAContext()
        var error: NSError?
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            biometricType = context.biometryType
        } else {
            biometricType = .none
        }
    }

    /// Name of biometric method for UI display.
    var biometricName: String {
        switch biometricType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return "Sinh trắc học"
        }
    }

    /// Icon name of biometric method.
    var biometricIcon: String {
        switch biometricType {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        default: return "lock.shield"
        }
    }

    /// Prompts user for biometric authentication.
    func authenticate() async -> Bool {
        guard isBiometricEnabled else {
            isUnlocked = true
            return true
        }

        let context = LAContext()
        context.localizedCancelTitle = "Đăng nhập bằng mật khẩu"

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            // Biometrics not available on device
            isUnlocked = true
            return true
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Xác thực để mở khóa Notebook Studio"
            )
            isUnlocked = success
            return success
        } catch {
            isUnlocked = false
            return false
        }
    }

    /// Relocks the app when entering background.
    func relock() {
        if isBiometricEnabled {
            isUnlocked = false
        }
    }
}
