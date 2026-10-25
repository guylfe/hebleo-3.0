param([ValidateSet('rehearse','apply')][string]$Mode='rehearse')
$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$appRoot=Join-Path $taskRoot 'hebleo-keyboard-runtime'
$folder=Join-Path $taskRoot 'hebleo-native-verification\.private\keyboard-install-59f5018'
$stateRoot='C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated'
$previousRoot='C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\5308955e-b6c5-4326-be9d-f29dedb237ef\hebleo-first20'
$previousRevision='2053b8ffd3ef26de0781715609806cc7721fa1b8'
$previousHash='dc9fba405653a629f21306ee6529b3585ded140e45a9ab280d71b9b8311f1102'
$database=Join-Path $stateRoot 'data\lexical-private-demo.sqlite'
$identity=Get-Content -LiteralPath (Join-Path $taskRoot 'KEYBOARD_BUILD_FINAL.json') -Raw | ConvertFrom-Json
$env:HEBLEO_DEMO_FRESH_PROGRESS='0'
Copy-Item -LiteralPath (Join-Path $taskRoot 'KEYBOARD_BUILD_FINAL.json') -Destination (Join-Path $folder 'BUILD.json')
Set-Location -LiteralPath $taskRoot
function Assert-State {
 & 'C:\Program Files\nodejs\node.exe' verify-keyboard-install.mjs assert $appRoot $folder $database
 if($LASTEXITCODE -ne 0){throw 'Live state changed; inspect without overwriting.'}
}
function Start-Preserved([string]$Checkout,[string]$Build,[string]$DB,[int]$Port,[string]$Name){
 $arguments=@('--env-file-if-exists="'+(Join-Path $stateRoot '.env')+'"','"'+(Join-Path $Checkout 'scripts\start-preserved-demo.mjs')+'"','--revision',$Build,'--database','"'+$DB+'"','--media-root','"'+(Join-Path $stateRoot 'tmp\lexical-demo-media')+'"','--vault-path','"'+(Join-Path $stateRoot '.private\google-auth.bin')+'"','--port',$Port)
 return Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $arguments -WorkingDirectory $Checkout -WindowStyle Hidden -RedirectStandardOutput (Join-Path $folder ($Name+'.stdout.log')) -RedirectStandardError (Join-Path $folder ($Name+'.stderr.log')) -PassThru
}
function Wait-Ready([object]$Process,[int]$Port){
 for($attempt=0;$attempt -lt 30;$attempt++){
  if($Process.HasExited){throw 'Candidate process exited; inspect retained logs.'}
  try{$build=Invoke-RestMethod -Uri ('http://127.0.0.1:'+ $Port +'/api/build') -TimeoutSec 2;if($build.revision -eq $identity.revision -and $build.runtimeSha256 -eq $identity.runtimeSha256 -and $build.preservationMode){return}}catch{}
  Start-Sleep -Milliseconds 300
 }
 throw 'Exact candidate not ready.'
}
Assert-State
if($Mode -eq 'rehearse'){
 $rehearsalDB=Join-Path $folder 'restore-rehearsal.sqlite'
 $test=Start-Preserved $appRoot $identity.revision $rehearsalDB 63882 'rehearsal'
 try{
  Wait-Ready $test 63882
  & 'C:\Program Files\nodejs\node.exe' verify-keyboard-install.mjs verify $appRoot $folder $rehearsalDB 63882
  if($LASTEXITCODE -ne 0){throw 'Startup rehearsal failed.'}
 }finally{
  $owner=Get-CimInstance Win32_Process -Filter ('ProcessId='+$test.Id)
  if($owner -and $owner.CommandLine.Contains($appRoot) -and $owner.CommandLine.Contains($rehearsalDB)){Stop-Process -Id $test.Id}
 }
 Assert-State
 Write-Output 'Exact-source startup rehearsal and destination verification passed; live untouched.'
 exit
}
$rehearsal=Get-Content -LiteralPath (Join-Path $folder 'DESTINATION-63882.json') -Raw | ConvertFrom-Json
if($rehearsal.revision -ne $identity.revision -or $rehearsal.runtimeSha256 -ne $identity.runtimeSha256 -or -not $rehearsal.entireDatabasePreserved){throw 'Exact rehearsal receipt required.'}
$live=Invoke-RestMethod 'http://127.0.0.1:63358/api/build'
if($live.revision -ne $previousRevision -or $live.runtimeSha256 -ne $previousHash -or -not $live.preservationMode){throw 'Live build changed; do not stop it.'}
$listeners=@(Get-NetTCPConnection -State Listen)
$target=@($listeners | Where-Object LocalPort -eq 63358)
if($target.Count -ne 1 -or $target[0].OwningProcess -ne 8300 -or $target[0].LocalAddress -ne '127.0.0.1'){throw 'Live listener changed.'}
if(@($listeners | Where-Object OwningProcess -eq 8300).Count -ne 1){throw 'Live process has another listener.'}
$old=Get-CimInstance Win32_Process -Filter 'ProcessId=8300'
foreach($expected in @($previousRoot,$previousRevision,$database,'start-preserved-demo.mjs')){if(-not $old.CommandLine.Contains($expected)){throw 'Live process command changed.'}}
$listeners | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $folder 'listeners-before.json')
Assert-State
Stop-Process -Id 8300
Wait-Process -Id 8300 -Timeout 10 -ErrorAction SilentlyContinue
# No import, reset, reseed, migration or database restore occurs in this change.
$new=Start-Preserved $appRoot $identity.revision $database 63358 'installed'
Wait-Ready $new 63358
& 'C:\Program Files\nodejs\node.exe' verify-keyboard-install.mjs verify $appRoot $folder $database 63358
if($LASTEXITCODE -ne 0){throw 'Destination verification failed; preserve database and backups for inspection.'}
$after=@(Get-NetTCPConnection -State Listen)
$current=@($after | Where-Object LocalPort -eq 63358)
if($current.Count -ne 1 -or $current[0].OwningProcess -ne $new.Id){throw 'Installed listener owner differs.'}
$owner=Get-CimInstance Win32_Process -Filter ('ProcessId='+$new.Id)
foreach($expected in @($appRoot,$identity.revision,$database,'start-preserved-demo.mjs')){if(-not $owner.CommandLine.Contains($expected)){throw 'Installed process command differs.'}}
$unrelated=@($listeners | Where-Object OwningProcess -ne 8300)
$missing=@($unrelated | Where-Object { $oldListener=$_; -not @($after | Where-Object {$_.LocalAddress -eq $oldListener.LocalAddress -and $_.LocalPort -eq $oldListener.LocalPort -and $_.OwningProcess -eq $oldListener.OwningProcess}).Count })
if($missing.Count){throw 'Unrelated listener changed; inspect receipts.'}
$after | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $folder 'listeners-after.json')
$receipt=@{installedAt=(Get-Date).ToUniversalTime().ToString('o');revision=$identity.revision;runtimeSha256=$identity.runtimeSha256;backendSha256=$identity.backendSha256;previousRevision=$previousRevision;previousPid=8300;pid=$new.Id;checkout=$appRoot;database=$database;port=63358;preservationMode=$true;unrelatedListenersPreserved=$unrelated.Count;backupFolder=$folder;nativeTestedRevision='242faf5c5849665a9d6552fb0a60b9415f1fc3ca';nativeFinalRevisionTested=$false}
$receipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $folder 'PROCESS_INSTALL.json')
Write-Output ($receipt | ConvertTo-Json -Compress)
