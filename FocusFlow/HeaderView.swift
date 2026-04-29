import SwiftUI

struct HeaderView: View {
    let title: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.textPrimary)
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
            Divider()
                .background(Color.borderGray)
        }
        .background(Color.surfaceBackground)
    }
}
