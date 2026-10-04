import Foundation
import Network
import Combine

/// Monitors network connectivity using NWPathMonitor.
///
/// Publishes connection status changes and triggers auto-sync
/// when the device comes back online.
@MainActor
class NetworkMonitor: ObservableObject {

    // MARK: - Singleton

    static let shared = NetworkMonitor()

    // MARK: - Published

    @Published private(set) var isConnected: Bool = true
    @Published private(set) var connectionType: ConnectionType = .unknown

    enum ConnectionType {
        case wifi, cellular, wired, unknown
    }

    // MARK: - Private

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.thaonv.notebookstudio.networkmonitor")
    private var wasDisconnected = false

    // MARK: - Init

    private init() {
        startMonitoring()
    }

    deinit {
        monitor.cancel()
    }

    // MARK: - Start/Stop

    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self else { return }

                let connected = path.status == .satisfied
                let previouslyConnected = self.isConnected

                self.isConnected = connected
                self.connectionType = self.getConnectionType(path)

                // Auto-sync when coming back online
                if connected && !previouslyConnected && self.wasDisconnected {
                    self.handleReconnection()
                }

                if !connected {
                    self.wasDisconnected = true
                }
            }
        }
        monitor.start(queue: queue)
    }

    // MARK: - Connection Type

    private func getConnectionType(_ path: NWPath) -> ConnectionType {
        if path.usesInterfaceType(.wifi) { return .wifi }
        if path.usesInterfaceType(.cellular) { return .cellular }
        if path.usesInterfaceType(.wiredEthernet) { return .wired }
        return .unknown
    }

    // MARK: - Reconnection Handler

    private func handleReconnection() {
        #if DEBUG
        print("📶 Network reconnected — triggering auto-sync")
        #endif

        // Trigger background sync
        Task {
            _ = await SyncManager.shared.syncNotebooks()
        }
    }

    // MARK: - Display

    /// Human-readable connection status.
    var statusText: String {
        if !isConnected { return "Ngoại tuyến" }
        switch connectionType {
        case .wifi:     return "Wi-Fi"
        case .cellular: return "Di động"
        case .wired:    return "Có dây"
        case .unknown:  return "Đã kết nối"
        }
    }

    /// SF Symbol for current connection state.
    var statusIcon: String {
        if !isConnected { return "wifi.slash" }
        switch connectionType {
        case .wifi:     return "wifi"
        case .cellular: return "antenna.radiowaves.left.and.right"
        case .wired:    return "cable.connector"
        case .unknown:  return "network"
        }
    }
}
