#!/usr/bin/env python3
import os
import zipfile
import sys

def package_project():
    print("==================================================================")
    print("      🌌 NEXORA CO-BUILDER PLATFORM - SECURE EXPORTER 🌌")
    print("==================================================================")
    print("Preparing secure workspace compression...")
    
    zip_name = "nexora_project.zip"
    
    # Files and folders to exclude to keep the ZIP lean and relevant
    excluded_dirs = {
        'node_modules', 'dist', '.git', '.github', '.next', 
        '.cache', 'temp', '__pycache__', '.upm'
    }
    excluded_files = {
        zip_name, '.DS_Store', 'package-lock.json', '.env'
    }

    included_count = 0
    total_lines = 0

    try:
        with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Walk current directory
            for root, dirs, files in os.walk('.'):
                # Filter directories in-place
                dirs[:] = [d for d in dirs if d not in excluded_dirs]
                
                for file in files:
                    if file in excluded_files:
                        continue
                        
                    file_path = os.path.join(root, file)
                    # Get relative path for the zip file archive
                    rel_path = os.path.relpath(file_path, '.')
                    
                    # Read lines to summarize stats
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.readlines())
                            total_lines += lines
                    except:
                        lines = 0
                        
                    zipf.write(file_path, rel_path)
                    print(f"📦 Paired & Packaged: {rel_path} ({lines} lines)")
                    included_count += 1
                    
        print("==================================================================")
        print("🎉 COMPILATION SUCCESSFUL!")
        print(f"📁 Export Archive:  {os.path.abspath(zip_name)}")
        print(f"🌐 Packaged Nodes: {included_count} modules")
        print(f"📊 Volume Metrics: {total_lines} total lines of code packed")
        print("==================================================================")
        print("To extract your workspace locally:")
        print("  1. Copy 'nexora_project.zip' to your destination directory.")
        print("  2. Unzip using standard tools or terminal command:")
        print(f"     unzip {zip_name}")
        print("==================================================================")

    except Exception as e:
        print(f"❌ Error occurred during compilation: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    package_project()
