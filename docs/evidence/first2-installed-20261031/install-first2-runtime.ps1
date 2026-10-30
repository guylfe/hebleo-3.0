param([ValidateSet('rehearse','apply')][string]$Mode='rehearse')
$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$appRoot=Join-Path $taskRoot 'hebleo-first2'
$stateRoot='C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated'
$database=Join-Path $stateRoot 'data\lexical-private-demo.sqlite'
$build=Get-Content -LiteralPath (Join-Path $taskRoot 'FIRST2_BUILD.json') -Raw | ConvertFrom-Json
$receipt=Get-Content -LiteralPath (Join-Path $taskRoot 'install-preflight\receipt.json') -Raw | ConvertFrom-Json
$env:HEBLEO_DEMO_FRESH_PROGRESS='0'
Set-Location -LiteralPath $appRoot
function Start-Candidate([string]$DB,[int]$Port,[string]$Name){
 $args=@('--env-file-if-exists="'+(Join-Path $stateRoot '.env')+'"','"'+(Join-Path $appRoot 'scripts\start-preserved-demo.mjs')+'"','--revision',$build.revision,'--database','"'+$DB+'"','--media-root','"'+(Join-Path $stateRoot 'tmp\lexical-demo-media')+'"','--vault-path','"'+(Join-Path $stateRoot '.private\google-auth.bin')+'"','--port',$Port)
 return Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $args -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot ($Name+'.stdout.log')) -RedirectStandardError (Join-Path $taskRoot ($Name+'.stderr.log')) -PassThru
}
function Ready([object]$Process,[int]$Port){
 for($attempt=0;$attempt -lt 40;$attempt++){
  if($Process.HasExited){throw 'Candidate exited; inspect logs.'}
  try{$actual=Invoke-RestMethod ('http://127.0.0.1:'+ $Port +'/api/build') -TimeoutSec 2;if($actual.revision -eq $build.revision -and $actual.runtimeSha256 -eq $build.runtimeSha256 -and $actual.preservationMode){return}}catch{}
  Start-Sleep -Milliseconds 300
 }
 throw 'Exact candidate is not ready.'
}
if(-not $receipt.exportRestoreRehearsal -or -not $receipt.preservation.allPriorRevisionsExact){throw 'Preflight receipt missing.'}
if($Mode -eq 'rehearse'){
 $p=Start-Candidate (Join-Path $taskRoot 'install-preflight\rehearsal.sqlite') 63885 'first2-start-rehearsal'
 try{Ready $p 63885;@{pid=$p.Id;port=63885;revision=$build.revision;runtimeSha256=$build.runtimeSha256;ready=$true}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskRoot 'FIRST2_START_REHEARSAL.json')}finally{if(-not $p.HasExited){Stop-Process -Id $p.Id}}
 Write-Output 'Exact-build preservation startup rehearsal passed.'
 exit
}
$start=Get-Content -LiteralPath (Join-Path $taskRoot 'FIRST2_START_REHEARSAL.json') -Raw|ConvertFrom-Json
if(-not $start.ready -or $start.runtimeSha256 -ne $build.runtimeSha256){throw 'Exact startup rehearsal required.'}
$old=Invoke-RestMethod 'http://127.0.0.1:63358/api/build'
if($old.revision -ne '83abf400467f2206e9a88356bdf8352ff7add2bf' -or $old.runtimeSha256 -ne '6f1c7576c8f4345da4cbd3fd92e29f18dd879d44cd169cd8b9875b3c85dd25ec'){throw 'Live build changed.'}
$target=@(Get-NetTCPConnection -State Listen|Where-Object LocalPort -eq 63358)
if($target.Count -ne 1 -or $target[0].LocalAddress -ne '127.0.0.1' -or $target[0].OwningProcess -ne 22424){throw 'Live listener changed.'}
$owner=Get-CimInstance Win32_Process -Filter 'ProcessId=22424'
foreach($expected in @($database,'start-preserved-demo.mjs','hebleo-studio-picker-runtime',$old.revision)){if(-not $owner.CommandLine.Contains($expected)){throw 'Live command changed.'}}
$listeners=@(Get-NetTCPConnection -State Listen);$listeners|Select-Object LocalAddress,LocalPort,OwningProcess|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskRoot 'listeners-before-first2.json')
$preserve=@((Join-Path $stateRoot '.env'),(Join-Path $stateRoot '.private\google-auth.bin'))
$hashes=@{};foreach($path in $preserve){if(Test-Path -LiteralPath $path){$hashes[$path]=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash}}
# Final database check is repeated inside the installer after stopping only its verified owner.
Stop-Process -Id 22424
Wait-Process -Id 22424 -Timeout 10 -ErrorAction SilentlyContinue
& 'C:\Program Files\nodejs\node.exe' scripts/install-first2.mjs --database $database --output (Join-Path $taskRoot 'installed') --pack content/first2/lessons.json --build $build.runtimeSha256 --media-root (Join-Path $taskRoot 'first2-media') --apply --expected-sha $receipt.before.sha256 *> (Join-Path $taskRoot 'install-apply.log')
if($LASTEXITCODE -ne 0){throw 'Installation refused/failed; retain original backup and inspect.'}
$p=Start-Candidate $database 63358 'first2-installed'
Ready $p 63358
foreach($path in $hashes.Keys){if((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $hashes[$path]){throw 'Configuration changed.'}}
$after=@(Get-NetTCPConnection -State Listen)
$missing=@($listeners|Where-Object OwningProcess -ne 22424|Where-Object {$prior=$_;-not @($after|Where-Object {$_.LocalAddress -eq $prior.LocalAddress -and $_.LocalPort -eq $prior.LocalPort -and $_.OwningProcess -eq $prior.OwningProcess}).Count})
if($missing.Count){throw 'An unrelated listener changed; inspect receipts.'}
$result=@{installedAt=(Get-Date).ToUniversalTime().ToString('o');pid=$p.Id;previousPid=22424;port=63358;revision=$build.revision;runtimeSha256=$build.runtimeSha256;database=$database;checkout=$appRoot;configAndVaultPreserved=$true;unrelatedListenersPreserved=$true;receipt=(Join-Path $taskRoot 'installed\receipt.json')}
$result|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskRoot 'FIRST2_PROCESS_INSTALL.json')
Write-Output ($result|ConvertTo-Json -Compress)
