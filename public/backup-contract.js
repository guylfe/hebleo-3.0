// One byte contract for the downloaded JSON file and the restore HTTP body.
// Backups use compact JSON: whitespace in full retained workspaces can triple
// the file size. Source strings and every data field retain their exact value.
export const BACKUP_BYTE_LIMIT = 200000000;
export function serializeBackup(value,{limit=BACKUP_BYTE_LIMIT}={}) {
  const serialized=JSON.stringify(value);
  if(new TextEncoder().encode(serialized).byteLength>limit){
    const error=new Error('Backup exceeds the 200 MB restore limit. Export refused; all workspace data is retained.');
    error.code='BACKUP_TOO_LARGE';error.status=413;throw error;
  }
  return serialized;
}
