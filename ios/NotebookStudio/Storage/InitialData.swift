import Foundation

/// Provides bundled starter notebooks for initial launch or offline preview.
enum InitialData {
    /// Loads starter notebooks from `starter_notebooks.json` in the app bundle.
    static var starterNotebooks: [Notebook] {
        guard let url = Bundle.main.url(forResource: "starter_notebooks", withExtension: "json") else {
            return []
        }
        do {
            let data = try Data(contentsOf: url)
            let notebooks = try JSONDecoder().decode([Notebook].self, from: data)
            return notebooks
        } catch {
            #if DEBUG
            print("⚠️ Failed to decode starter_notebooks.json: \(error)")
            #endif
            return []
        }
    }
}
