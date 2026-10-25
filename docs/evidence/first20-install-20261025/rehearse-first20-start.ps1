$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$appRoot=Join-Path $taskRoot 'hebleo-first20'
$stateRoot='C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated'
$folder=Join-Path $appRoot '.private\first20-install-preflight-2053b8f'
$database=Join-Path $folder 'rehearsal.sqlite'
$identity=Get-Content -LiteralPath (Join-Path $taskRoot 'FIRST20_BUILD_2053b8f.json') -Raw | ConvertFrom-Json
if(@(Get-NetTCPConnection -State Listen | Where-Object LocalPort -eq 63880).Count -ne 0){throw 'Rehearsal port63880 is occupied.'}
$env:HEBLEO_DEMO_FRESH_PROGRESS='0'
$arguments=@('--env-file-if-exists="'+(Join-Path $stateRoot '.env')+'"','"'+(Join-Path $appRoot 'scripts\start-preserved-demo.mjs')+'"','--revision',$identity.revision,'--database','"'+$database+'"','--media-root','"'+(Join-Path $stateRoot 'tmp\lexical-demo-media')+'"','--vault-path','"'+(Join-Path $stateRoot '.private\google-auth.bin')+'"','--port','63880')
$rehearsalProcess=Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $arguments -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $folder 'startup.stdout.log') -RedirectStandardError (Join-Path $folder 'startup.stderr.log') -PassThru
try{
 $ready=$false
 for($attempt=0;$attempt -lt 30;$attempt++){
  if($rehearsalProcess.HasExited){throw 'Candidate rehearsal process exited.'}
  try{$build=Invoke-RestMethod -Uri 'http://127.0.0.1:63880/api/build' -TimeoutSec 2;if($build.revision -eq $identity.revision -and $build.runtimeSha256 -eq $identity.runtimeSha256){$ready=$true;break}}catch{}
  Start-Sleep -Milliseconds 300
 }
 if(-not $ready){throw 'Candidate rehearsal did not become ready.'}
 Set-Location -LiteralPath $taskRoot
 & 'C:\Program Files\nodejs\node.exe' verify-first20-install.mjs $folder $database 63880
 if($LASTEXITCODE -ne 0){throw 'Candidate rehearsal destination checks failed.'}
}finally{
 if(-not $rehearsalProcess.HasExited){Stop-Process -Id $rehearsalProcess.Id;Wait-Process -Id $rehearsalProcess.Id -Timeout 10 -ErrorAction SilentlyContinue}
}
