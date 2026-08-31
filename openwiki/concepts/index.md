# Files

- [Markdown Parsing & Serialization Engine](markdown-engine.md) - Core Markdown parsing and serialization engine responsible for YAML frontmatter extraction, inline metadata tag parsing, subtask hierarchy, inline comments, and non-destructive document mutations.
- [Snapshot Versioning & Data Recovery](snapshot-versioning.md) - QuietFlow local pre-write safety snapshot system, tracking document revisions, rate-limiting backup frequency, detecting file corruption, and providing 1-click snapshot restoration.
- [Reactive State Management & Vault Store](state-management.md) - Comprehensive explanation of QuietFlow's centralized reactive vault state management using useSyncExternalStore, change notification pattern, self-write timestamp tracking, and active file/filter synchronization.
