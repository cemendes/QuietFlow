#[cfg(test)]
pub mod tests {
    use std::fs;
    use tempfile::tempdir;
    use crate::vault::snapshots::{create_pre_write_snapshot_if_needed, list_snapshots, restore_snapshot};

    #[test]
    fn test_create_snapshot_and_list() {
        let dir = tempdir().unwrap();
        let vault_path = dir.path();
        let note_path = vault_path.join("today.md");

        let initial_content = "---\ntitle: Today\n---\n# Tasks\n- [ ] Task 1\n- [ ] Task 2\n";
        fs::write(&note_path, initial_content).unwrap();

        // 1. Create pre-write snapshot
        let snap = create_pre_write_snapshot_if_needed(vault_path, &note_path).unwrap();
        assert!(snap.is_some(), "Snapshot should be created for non-empty existing note");
        let meta = snap.unwrap();
        assert_eq!(meta.task_count, 2);
        assert_eq!(meta.file_name, "today.md");

        // 2. List snapshots
        let list = list_snapshots(vault_path, "today.md").unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, meta.id);
    }

    #[test]
    fn test_simulate_file_corruption_and_atomic_restore() {
        let dir = tempdir().unwrap();
        let vault_path = dir.path();
        let note_path = vault_path.join("Projects").join("work.md");
        fs::create_dir_all(note_path.parent().unwrap()).unwrap();

        let healthy_content = "---\ntitle: Work\n---\n# Tasks\n- [ ] Critical Project Milestone #ops @priority(high)\n- [x] Initial design doc\n";
        fs::write(&note_path, healthy_content).unwrap();

        // 1. Create backup snapshot
        let snap = create_pre_write_snapshot_if_needed(vault_path, &note_path).unwrap().unwrap();

        // 2. SIMULATE SUDDEN CORRUPTION (truncate file to 0 bytes or garbage on disk)
        fs::write(&note_path, "").unwrap();
        assert_eq!(fs::read_to_string(&note_path).unwrap(), "");

        // 3. Restore from snapshot
        restore_snapshot(vault_path, "Projects/work.md", &snap.id).unwrap();

        // 4. Assert full data recovery
        let restored_content = fs::read_to_string(&note_path).unwrap();
        assert_eq!(restored_content, healthy_content);
        assert!(restored_content.contains("Critical Project Milestone"));
    }
}
