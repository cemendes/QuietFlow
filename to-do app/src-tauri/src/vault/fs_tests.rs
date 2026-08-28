#[cfg(test)]
mod tests {
    use crate::vault::fs::*;
    use tempfile::tempdir;



    #[test]
    fn test_atomic_write_and_read() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.md");
        write_file_atomic(file_path.to_str().unwrap().to_string(), "# Hello".to_string()).unwrap();
        let content = read_file(file_path.to_str().unwrap().to_string()).unwrap();
        assert_eq!(content, "# Hello");
    }

    #[test]
    fn test_create_directory_and_scan_tree() {
        let dir = tempdir().unwrap();
        let sub_dir = dir.path().join("Work");
        create_directory(sub_dir.to_str().unwrap().to_string()).unwrap();

        let file_path = sub_dir.join("project.md");
        write_file_atomic(file_path.to_str().unwrap().to_string(), "# Project".to_string()).unwrap();

        let tree = init_vault(dir.path().to_str().unwrap().to_string()).unwrap();
        assert_eq!(tree.name, dir.path().file_name().unwrap().to_str().unwrap());
        assert!(tree.is_directory);
        assert_eq!(tree.children.len(), 1);
        
        let work_node = &tree.children[0];
        assert_eq!(work_node.name, "Work");
        assert!(work_node.is_directory);
        assert_eq!(work_node.children.len(), 1);
        assert_eq!(work_node.children[0].name, "project.md");
        assert!(!work_node.children[0].is_directory);
    }

    #[test]
    fn test_delete_entry() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("to_delete.md");
        write_file_atomic(file_path.to_str().unwrap().to_string(), "delete me".to_string()).unwrap();
        assert!(file_path.exists());

        delete_entry(file_path.to_str().unwrap().to_string()).unwrap();
        assert!(!file_path.exists());
    }

    #[test]
    fn test_atomic_write_creates_parent_directory_if_missing() {
        let dir = tempdir().unwrap();
        let nested_file = dir.path().join("Nested").join("Sub").join("note.md");
        write_file_atomic(nested_file.to_str().unwrap().to_string(), "# Deep Note".to_string()).unwrap();
        assert!(nested_file.exists());
        let content = read_file(nested_file.to_str().unwrap().to_string()).unwrap();
        assert_eq!(content, "# Deep Note");
    }

    #[test]
    fn test_scan_directory_ignores_hidden_files() {
        let dir = tempdir().unwrap();
        let hidden_file = dir.path().join(".DS_Store");
        let visible_file = dir.path().join("notes.md");
        
        std::fs::write(&hidden_file, "junk").unwrap();
        write_file_atomic(visible_file.to_str().unwrap().to_string(), "# Visible".to_string()).unwrap();

        let tree = init_vault(dir.path().to_str().unwrap().to_string()).unwrap();
        assert_eq!(tree.children.len(), 1);
        assert_eq!(tree.children[0].name, "notes.md");
    }
}
