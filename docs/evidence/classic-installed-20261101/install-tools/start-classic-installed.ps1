param([ValidatePattern('^[a-z0-9-]+$')][string]$LogTag='classic-installed')
$ErrorActionPreference='Stop'
$projectRoot=Join-Path $PSScriptRoot 'hebleo-editor'
$installedRoot='C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e/hebleo-consolidated'
if(Get-NetTCPConnection -LocalPort 63358 -State Listen -ErrorAction SilentlyContinue){throw 'Port63358 already occupied'}
$applied=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'installed-classic-editor-20261101/APPLIED.json') -Raw|ConvertFrom-Json
$revision=(& git -c ('safe.directory='+$projectRoot.Replace('\','/')) -C $projectRoot rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $revision -ne $applied.identity.revision){throw 'Exact reviewed commit required'}
foreach($file in $applied.identity.files.PSObject.Properties){if((Get-FileHash -LiteralPath (Join-Path $projectRoot $file.Name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.Value){throw ('Reviewed bytes changed: '+$file.Name)}}
$arguments=@('--env-file-if-exists='+$installedRoot+'/.env','scripts/start-preserved-demo.mjs','--revision',$revision,'--database',$installedRoot+'/data/lexical-private-demo.sqlite','--media-root',$installedRoot+'/tmp/lexical-demo-media','--vault-path',$installedRoot+'/.private/google-auth.bin','--port','63358')
$process=Start-Process -FilePath (Get-Command node).Source -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot ($LogTag+'.log')) -RedirectStandardError (Join-Path $PSScriptRoot ($LogTag+'.err'))
$result=[pscustomobject]@{pid=$process.Id;port=63358;revision=$revision;stdout=(Join-Path $PSScriptRoot ($LogTag+'.log'))}
$result|ConvertTo-Json -Compress|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'installed-classic-editor-20261101/PROCESS.json') -Encoding utf8
$result|ConvertTo-Json -Compress
