import SwiftUI

/// Sort menu button for filtering notebooks by update time, name, creation date, or pinned status.
struct SortMenu: View {
    @Binding var sortOrder: LibraryViewModel.SortOrder

    var body: some View {
        Menu {
            ForEach(LibraryViewModel.SortOrder.allCases) { order in
                Button {
                    withAnimation(.easeInOut(duration: DesignTokens.animationNormal)) {
                        sortOrder = order
                    }
                } label: {
                    Label(order.label, systemImage: order.icon)
                }
                .disabled(sortOrder == order)
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down.circle")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(DesignTokens.accentLight)
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Sắp xếp sổ tay")
    }
}

#Preview {
    SortMenu(sortOrder: .constant(.lastUpdated))
        .padding()
}
