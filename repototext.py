import os
import pyperclip  # Ensure you have this installed: pip install pyperclip

# Preset files or directories you frequently exclude
PRESET_EXCLUDES = [
    "node_modules",
    ".git",
    ".DS_Store",
    "dist",
    "__pycache__"
    "README.md",
]

def get_user_input(prompt, options, presets=[]):
    """Utility function to display options and collect user input with presets."""
    print(prompt)
    print(f"Preset excludes: {' '.join(presets)}")
    for idx, option in enumerate(options):
        print(f"{idx + 1}. {option}")
    selected_indexes = input("\nEnter the numbers of the items to exclude (space-separated), or press Enter to include all: ")
    
    if selected_indexes:
        try:
            selected_indexes = [int(i) - 1 for i in selected_indexes.split()]
            return presets + [options[i] for i in selected_indexes if 0 <= i < len(options)]
        except ValueError:
            print("Invalid input. Proceeding with all items included.")
            return presets
    return presets

def scan_directory(folder_path):
    """Recursively scan a directory and list all files and folders."""
    all_files = []
    all_dirs = []
    
    for root, dirs, files in os.walk(folder_path):
        # Append directories with their full paths
        all_dirs.extend([os.path.join(root, d) for d in dirs])
        # Append files with their full paths
        all_files.extend([os.path.join(root, f) for f in files])

    return all_files, all_dirs

def repo_to_text(folder_path, output_file, copy_to_clipboard=True):
    # Step 1: Scan the folder for files and directories
    all_files, all_dirs = scan_directory(folder_path)
    
    # Step 2: Let user exclude files and directories, with presets included
    if all_files:
        excluded_files = get_user_input("\nSelect files to exclude:", all_files, PRESET_EXCLUDES)
    else:
        excluded_files = PRESET_EXCLUDES

    if all_dirs:
        excluded_dirs = get_user_input("\nSelect directories to exclude:", all_dirs, PRESET_EXCLUDES)
    else:
        excluded_dirs = PRESET_EXCLUDES

    saved_files = []

    # Step 3: Write the content of the remaining files to the output text file
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for file_path in all_files:
            # Skip the excluded files or files in excluded directories
            if any([file_path.startswith(d) for d in excluded_dirs]) or file_path in excluded_files:
                continue

            try:
                # Write the file path as a "comment"
                outfile.write(f"\n{file_path}\n\n")
                # Write the file content
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
                    outfile.write("\n")
                saved_files.append(file_path)
            except Exception as e:
                # If there's an error reading the file, log it
                outfile.write(f"Error reading file: {file_path}\n")
                outfile.write(f"Error: {e}\n\n")

    # Output which files were saved
    print("\nThe following files were saved:")
    for file in saved_files:
        print(file)

    # Step 4: Copy output to clipboard if the flag is true
    if copy_to_clipboard:
        with open(output_file, 'r', encoding='utf-8') as f:
            content = f.read()
            pyperclip.copy(content)
            print("\nThe output has been copied to the clipboard.")


# Example usage
repo_to_text(".obsidian\plugins\obsidian-chronos\src", "repo_content.txt")
