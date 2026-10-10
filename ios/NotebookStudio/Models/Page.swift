import Foundation

/// A single page within a notebook.
/// Contains fields for all 10 template types; unused fields are nil.
///
/// Field mapping from web app JSON (all stored as HTML strings from contentEditable):
/// - Cornell: cues, notes, summary, content
/// - Work: project, deadline, status, agenda, discussions, actions
/// - Ruled/DotGrid/Grid/Blank: content
/// - Vocab: vocabWord, vocabMeaning, vocabExample, vocabReview
/// - Charting: chartData (3 columns)
/// - Reading: content (ideas, quotes, reflection — stored in content)
/// - Eisenhower/Quadrant: quadrants (q1-q4)
struct Page: Codable, Identifiable, Equatable {
    let id: String
    var template: PageTemplate

    // MARK: - Common fields
    var title: String?
    var topic: String?
    var date: String?
    var no: String?
    var lang: String?
    var phase: String?         // "I", "II", "III", "IV", "V", "VI"
    var updatedAt: String?

    // MARK: - Cornell fields
    var cues: String?          // HTML — left column (keywords/questions)
    var notes: String?         // HTML — right column (main notes)
    var summary: String?       // HTML — bottom section

    // MARK: - Work fields
    var project: String?
    var deadline: String?
    var status: String?        // "TODO", "WIP", "DONE"
    var agenda: String?        // HTML
    var discussions: String?   // HTML
    var actions: [ActionItem]? // Checklist items

    // MARK: - Generic content (Ruled, DotGrid, Grid, Blank, Reading)
    var content: String?       // HTML

    // MARK: - Vocab fields
    var vocabWord: String?     // HTML
    var vocabMeaning: String?  // HTML
    var vocabExample: String?  // HTML
    var vocabReview: String?   // HTML

    // MARK: - Charting fields (3-column comparison)
    var chartData: ChartData?

    // MARK: - Eisenhower Quadrant fields
    var quadrants: Quadrants?

    // MARK: - Resilient Decoding

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)

        id = try c.decode(String.self, forKey: .id)

        // Template with fallback to .ruled
        if let templateStr = try c.decodeIfPresent(String.self, forKey: .template),
           let t = PageTemplate(rawValue: templateStr) {
            template = t
        } else {
            template = .ruled
        }

        // Common
        title = try c.decodeIfPresent(String.self, forKey: .title)
        topic = try c.decodeIfPresent(String.self, forKey: .topic)
        date = try c.decodeIfPresent(String.self, forKey: .date)
        no = try c.decodeIfPresent(String.self, forKey: .no)
        lang = try c.decodeIfPresent(String.self, forKey: .lang)
        phase = try c.decodeIfPresent(String.self, forKey: .phase)
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt)

        // Cornell
        cues = try c.decodeIfPresent(String.self, forKey: .cues)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        summary = try c.decodeIfPresent(String.self, forKey: .summary)

        // Work
        project = try c.decodeIfPresent(String.self, forKey: .project)
        deadline = try c.decodeIfPresent(String.self, forKey: .deadline)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        agenda = try c.decodeIfPresent(String.self, forKey: .agenda)
        discussions = try c.decodeIfPresent(String.self, forKey: .discussions)
        actions = try c.decodeIfPresent([ActionItem].self, forKey: .actions)

        // Generic
        content = try c.decodeIfPresent(String.self, forKey: .content)

        // Vocab
        vocabWord = try c.decodeIfPresent(String.self, forKey: .vocabWord)
        vocabMeaning = try c.decodeIfPresent(String.self, forKey: .vocabMeaning)
        vocabExample = try c.decodeIfPresent(String.self, forKey: .vocabExample)
        vocabReview = try c.decodeIfPresent(String.self, forKey: .vocabReview)

        // Charting
        chartData = try c.decodeIfPresent(ChartData.self, forKey: .chartData)

        // Quadrant
        quadrants = try c.decodeIfPresent(Quadrants.self, forKey: .quadrants)
    }

    // MARK: - Programmatic init

    init(
        id: String,
        template: PageTemplate = .ruled,
        title: String? = nil,
        topic: String? = nil,
        date: String? = nil,
        no: String? = nil,
        lang: String? = "VI",
        phase: String? = nil,
        updatedAt: String? = nil,
        cues: String? = nil,
        notes: String? = nil,
        summary: String? = nil,
        project: String? = nil,
        deadline: String? = nil,
        status: String? = nil,
        agenda: String? = nil,
        discussions: String? = nil,
        actions: [ActionItem]? = nil,
        content: String? = nil,
        vocabWord: String? = nil,
        vocabMeaning: String? = nil,
        vocabExample: String? = nil,
        vocabReview: String? = nil,
        chartData: ChartData? = nil,
        quadrants: Quadrants? = nil
    ) {
        self.id = id
        self.template = template
        self.title = title
        self.topic = topic
        self.date = date
        self.no = no
        self.lang = lang
        self.phase = phase
        self.updatedAt = updatedAt
        self.cues = cues
        self.notes = notes
        self.summary = summary
        self.project = project
        self.deadline = deadline
        self.status = status
        self.agenda = agenda
        self.discussions = discussions
        self.actions = actions
        self.content = content
        self.vocabWord = vocabWord
        self.vocabMeaning = vocabMeaning
        self.vocabExample = vocabExample
        self.vocabReview = vocabReview
        self.chartData = chartData
        self.quadrants = quadrants
    }

    // MARK: - Computed

    /// Display label for the page number (e.g. "01", "02").
    var pageNumber: String { no ?? "—" }

    /// The work status as a displayable enum.
    var workStatus: WorkStatus? {
        guard let status else { return nil }
        return WorkStatus(rawValue: status)
    }

    /// Whether this page has any meaningful content.
    var hasContent: Bool {
        let fields = [content, cues, notes, summary, agenda, discussions,
                      vocabWord, vocabMeaning, vocabExample, vocabReview]
        return fields.contains { $0 != nil && !($0?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true) }
            || !(actions?.isEmpty ?? true)
            || chartData != nil
            || quadrants != nil
    }

    static func == (lhs: Page, rhs: Page) -> Bool {
        lhs.id == rhs.id && lhs.updatedAt == rhs.updatedAt
    }
}
