import os

# Base directory
base_dir = r"c:\Users\Abhay\OneDrive\Desktop\Programs\Projects\allAgent"

# Files to delete
files_to_delete = [
    r"backend\test_chat.py",
    r"backend\test_db.py",
    r"backend\SETUP.md",
    r"backend\.env",
    r"src\types\chat.ts",
    r"src\lib\translations.ts",
    r"src\types\global.d.ts"
]

# Process each file
results = []

for file_path in files_to_delete:
    full_path = os.path.join(base_dir, file_path)
    
    # Check if exists before deletion
    existed_before = os.path.exists(full_path)
    
    deletion_status = "DID NOT EXIST"
    
    if existed_before:
        try:
            os.remove(full_path)
            # Verify it was deleted
            if not os.path.exists(full_path):
                deletion_status = "DELETED"
            else:
                deletion_status = "FAILED"
        except Exception as e:
            deletion_status = f"FAILED ({str(e)})"
    
    results.append({
        'file_path': file_path,
        'existed_before': 'YES' if existed_before else 'NO',
        'deletion_status': deletion_status
    })

# Print results in table format
print("\n" + "="*100)
print(f"{'File Path':<50} {'Existed Before':<20} {'Deletion Status':<30}")
print("="*100)

for result in results:
    print(f"{result['file_path']:<50} {result['existed_before']:<20} {result['deletion_status']:<30}")

print("="*100 + "\n")

# Summary
deleted_count = sum(1 for r in results if r['deletion_status'] == 'DELETED')
not_existed_count = sum(1 for r in results if r['deletion_status'] == 'DID NOT EXIST')
failed_count = sum(1 for r in results if 'FAILED' in r['deletion_status'])

print(f"SUMMARY:")
print(f"  - Files deleted: {deleted_count}")
print(f"  - Files that did not exist: {not_existed_count}")
print(f"  - Files failed to delete: {failed_count}")
