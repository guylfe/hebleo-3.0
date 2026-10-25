$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$appRoot=Join-Path $taskRoot 'hebleo-first20'
$stateRoot='C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated'
$previousRoot='C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\739ab40b-82dd-45cb-8825-6e570b3642d7\hebleo-actions'
$previousRevision='ba3ad389a6af9807f8eb90e7c34b8723cb1ffc80'
$previousHash='72326559688bfd64c7ade423ce917d192ec4f829f7dcc5c1ba85fe4fb1f2efcf'
$database=Join-Path $stateRoot 'data\lexical-private-demo.sqlite'
$mediaRoot=Join-Path $stateRoot 'tmp\lexical-demo-media'
$vaultPath=Join-Path $stateRoot '.private\google-auth.bin'
$envPath=Join-Path $stateRoot '.env'
$identity=Get-Content -LiteralPath (Join-Path $taskRoot 'FIRST20_BUILD_2053b8f.json') -Raw | ConvertFrom-Json
$preflight=Get-Content -LiteralPath (Join-Path $appRoot '.private\first20-install-preflight-2053b8f\receipt.json') -Raw | ConvertFrom-Json
$rehearsal=Get-Content -LiteralPath (Join-Path $appRoot '.private\first20-install-preflight-2053b8f\destination.json') -Raw | ConvertFrom-Json
if($rehearsal.revision -ne $identity.revision -or $rehearsal.runtimeSha256 -ne $identity.runtimeSha256 -or -not $rehearsal.protectedTablesPreserved){throw 'Exact-byte startup rehearsal required.'}
$folder=Join-Path $appRoot '.private\first20-install-2053b8f'
if(Test-Path -LiteralPath $folder){throw 'Installation folder already exists; preserve it and inspect instead of overwriting.'}
$live=Invoke-RestMethod -Uri 'http://127.0.0.1:63358/api/build' -TimeoutSec 10
if($live.revision -ne $previousRevision -or $live.runtimeSha256 -ne $previousHash -or -not $live.preservationMode){throw 'Live runtime changed.'}
$listeners=@(Get-NetTCPConnection -State Listen)
$target=@($listeners | Where-Object LocalPort -eq 63358)
if($target.Count -ne 1 -or $target[0].OwningProcess -ne 46656 -or $target[0].LocalAddress -ne '127.0.0.1'){throw 'Owner listener changed.'}
if(@($listeners | Where-Object OwningProcess -eq 46656).Count -ne 1){throw 'Owner process has another listener.'}
$old=Get-CimInstance Win32_Process -Filter 'ProcessId=46656'
foreach($expected in @($previousRoot,$previousRevision,$database,'start-preserved-demo.mjs')){if(-not $old.CommandLine.Contains($expected)){throw 'Owner process command differs.'}}
Set-Location -LiteralPath $taskRoot
& 'C:\Program Files\nodejs\node.exe' check-first20-install-state.mjs
if($LASTEXITCODE -ne 0){throw 'Candidate/owner identity changed.'}
New-Item -ItemType Directory -Path $folder | Out-Null
$listeners | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $folder 'listeners-before.json')
$env:HEBLEO_DEMO_FRESH_PROGRESS='0'
function Start-Preserved([string]$Checkout,[string]$Build,[string]$LogName){
 $arguments=@('--env-file-if-exists="'+$envPath+'"','"'+(Join-Path $Checkout 'scripts\start-preserved-demo.mjs')+'"','--revision',$Build,'--database','"'+$database+'"','--media-root','"'+$mediaRoot+'"','--vault-path','"'+$vaultPath+'"','--port','63358')
 return Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $arguments -WorkingDirectory $Checkout -WindowStyle Hidden -RedirectStandardOutput (Join-Path $folder ($LogName+'.stdout.log')) -RedirectStandardError (Join-Path $folder ($LogName+'.stderr.log')) -PassThru
}
$new=$null
try{
 Stop-Process -Id 46656
 Wait-Process -Id 46656 -Timeout 10 -ErrorAction SilentlyContinue
 Set-Location -LiteralPath $appRoot
 & 'C:\Program Files\nodejs\node.exe' scripts/prepare-text-install.mjs --database $database --output $folder --pack docs/curriculum/first20-20261025/content.json --media-root $mediaRoot --preserve $envPath --preserve $vaultPath --preserve $mediaRoot --preserve (Join-Path $stateRoot 'uploads') --apply --expected-sha $preflight.before.sha256
 if($LASTEXITCODE -ne 0){throw 'Preservation apply failed.'}
 $new=Start-Preserved $appRoot $identity.revision 'first20'
 $ready=$false
 for($attempt=0;$attempt -lt 30;$attempt++){
  if($new.HasExited){throw 'New process exited.'}
  try{$build=Invoke-RestMethod -Uri 'http://127.0.0.1:63358/api/build' -TimeoutSec 2;if($build.revision -eq $identity.revision -and $build.runtimeSha256 -eq $identity.runtimeSha256 -and $build.preservationMode){$ready=$true;break}}catch{}
  Start-Sleep -Milliseconds 300
 }
 if(-not $ready){throw 'Reviewed runtime did not become ready.'}
 Set-Location -LiteralPath $taskRoot
 & 'C:\Program Files\nodejs\node.exe' verify-first20-install.mjs $folder $database 63358
 if($LASTEXITCODE -ne 0){throw 'Installed destination/preservation verification failed.'}
 $current=@(Get-NetTCPConnection -State Listen | Where-Object LocalPort -eq 63358)
 if($current.Count -ne 1 -or $current[0].OwningProcess -ne $new.Id){throw 'New listener ownership differs.'}
 $newOwner=Get-CimInstance Win32_Process -Filter ('ProcessId='+$new.Id)
 foreach($expected in @($appRoot,$identity.revision,$database,'start-preserved-demo.mjs')){if(-not $newOwner.CommandLine.Contains($expected)){throw 'Installed command line differs.'}}
 $receipt=@{revision=$identity.revision;runtimeSha256=$identity.runtimeSha256;previousRevision=$previousRevision;previousPid=46656;pid=$new.Id;checkout=$appRoot;database=$database;port=63358;preservationMode=$true;backupFolder=$folder;startedAt=(Get-Date).ToUniversalTime().ToString('o');nativeVerified=$false}
 $receipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskRoot 'FIRST20_PROCESS_INSTALL.json')
 Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $folder 'listeners-after.json')
 Write-Output ('Installed '+$identity.revision+'; process '+$new.Id+'; preservation receipt '+$folder)
}catch{
 $failure=$_
 # Never downgrade reader8 or restore an old database over possible subsequent activity.
 # Restart reader7 only when its entire original logical snapshot is still unchanged.
 Set-Location -LiteralPath $taskRoot
 & 'C:\Program Files\nodejs\node.exe' check-first20-install-state.mjs 1> (Join-Path $folder 'failure-state.txt') 2>&1
 if($LASTEXITCODE -eq 0 -and (-not $new -or $new.HasExited)){
  $rollback=Start-Preserved $previousRoot $previousRevision 'unchanged-state-restart'
  Write-Output ('Original state unchanged; restarted its original code process '+$rollback.Id)
 }else{
  Write-Output 'Preserved migrated database and every backup. No automatic downgrade or old-data restore was attempted; inspect the failure before continuing.'
 }
 throw $failure
}
