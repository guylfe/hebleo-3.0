$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$appRoot='C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\3f5dff25-a1fa-4bda-b947-bd733b040b0a\hebleo-first2'
$stateRoot='C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated'
$database=Join-Path $stateRoot 'data\lexical-private-demo.sqlite'
$mediaRoot=Join-Path $stateRoot 'tmp\lexical-demo-media'
$build=Get-Content -LiteralPath (Join-Path $taskRoot 'preflight\build.json') -Raw|ConvertFrom-Json
$receipt=Get-Content -LiteralPath (Join-Path $taskRoot 'preflight\receipt.json') -Raw|ConvertFrom-Json
if(-not $receipt.applicationExportRestoreRehearsal -or -not $receipt.preservation.entireDraftExact){throw 'Rehearsal required.'}
foreach($name in @('candidate','schemas','affected-tests')){
 $log=Get-Content -LiteralPath (Join-Path $taskRoot ($name+'.log')) -Raw
 if($log -notmatch 'fail 0'){throw ('Required checks incomplete: '+$name)}
}
$old=Invoke-RestMethod 'http://127.0.0.1:63358/api/build'
if($old.revision -ne '5946342f3221c9c4d842e62ee11dabdbba4b559c' -or $old.runtimeSha256 -ne 'b8c7a3ddd0136b6d15fcbe9da3436592fe82719d1c41345f1ec2d7dd67f657e6'){throw 'Existing runtime changed.'}
$target=@(Get-NetTCPConnection -State Listen|Where-Object LocalPort -eq 63358)
if($target.Count -ne 1 -or $target[0].LocalAddress -ne '127.0.0.1' -or $target[0].OwningProcess -ne 8852){throw 'Existing listener changed.'}
$owner=Get-CimInstance Win32_Process -Filter 'ProcessId=8852'
foreach($expected in @($database,$appRoot,'start-preserved-demo.mjs',$old.revision)){if(-not $owner.CommandLine.Contains($expected)){throw 'Existing process changed.'}}
function Protected-Files {
 $paths=@((Join-Path $stateRoot '.env'),(Join-Path $stateRoot '.private\google-auth.bin'))
 if(Test-Path -LiteralPath $mediaRoot -PathType Container){$paths+=@(Get-ChildItem -LiteralPath $mediaRoot -File -Recurse|Select-Object -ExpandProperty FullName)}else{$paths+=$mediaRoot}
 return @($paths|Sort-Object|ForEach-Object {if(Test-Path -LiteralPath $_){[ordered]@{path=$_;sha256=(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash}}else{[ordered]@{path=$_;exists=$false}}})|ConvertTo-Json -Depth 5 -Compress
}
$protected=Protected-Files
$listeners=@(Get-NetTCPConnection -State Listen)
Stop-Process -Id 8852
Wait-Process -Id 8852 -Timeout 10 -ErrorAction SilentlyContinue
& 'C:\Program Files\nodejs\node.exe' (Join-Path $taskRoot 'prepare-update.mjs') apply $database (Join-Path $taskRoot 'installed') $build.revision $receipt.before.sha256 *> (Join-Path $taskRoot 'install-apply.log')
if($LASTEXITCODE -ne 0){throw 'Guarded update refused; preserve newer state and refresh rehearsal.'}
$env:HEBLEO_DEMO_FRESH_PROGRESS='0'
$launchArgs=@('--env-file-if-exists="'+(Join-Path $stateRoot '.env')+'"','"'+(Join-Path $appRoot 'scripts\start-preserved-demo.mjs')+'"','--revision',$build.revision,'--database','"'+$database+'"','--media-root','"'+$mediaRoot+'"','--vault-path','"'+(Join-Path $stateRoot '.private\google-auth.bin')+'"','--port','63358')
$process=Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $launchArgs -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'installed.stdout.log') -RedirectStandardError (Join-Path $taskRoot 'installed.stderr.log') -PassThru
$ready=$false
for($i=0;$i -lt 60;$i++){
 $process.Refresh();if($process.HasExited){throw 'New runtime exited; inspect logs.'}
 try{$actual=Invoke-RestMethod 'http://127.0.0.1:63358/api/build' -TimeoutSec 2;if($actual.revision -eq $build.revision -and $actual.runtimeSha256 -eq $build.runtimeSha256 -and $actual.preservationMode){$ready=$true;break}}catch{}
 Start-Sleep -Milliseconds 250
}
if(-not $ready){throw 'Exact new runtime not ready.'}
if((Protected-Files) -ne $protected){throw 'Protected configuration/media changed.'}
$after=@(Get-NetTCPConnection -State Listen)
$missing=@($listeners|Where-Object OwningProcess -ne 8852|Where-Object {$prior=$_;-not @($after|Where-Object {$_.LocalAddress -eq $prior.LocalAddress -and $_.LocalPort -eq $prior.LocalPort -and $_.OwningProcess -eq $prior.OwningProcess}).Count})
if($missing.Count){throw 'An unrelated listener changed.'}
$result=@{pid=$process.Id;previousPid=8852;port=63358;revision=$actual.revision;runtimeSha256=$actual.runtimeSha256;preservationMode=$actual.preservationMode;configVaultAndMediaExact=$true;unrelatedListenersMissing=$missing.Count;database=$database;checkout=$appRoot;installedAt=(Get-Date).ToUniversalTime().ToString('o')}
$result|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $taskRoot 'INSTALLED_PROCESS.json')
Write-Output ($result|ConvertTo-Json -Compress)
