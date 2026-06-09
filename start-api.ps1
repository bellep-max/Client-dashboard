$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/aeo_dashboard"
$env:SESSION_SECRET = "local_dev_secret_replace_in_production_abc123xyz"
$env:PORT = "3000"
$env:BASE_PATH = "/api"
$env:NODE_ENV = "development"

Set-Location "C:\DEV\Client-dashboard"
node --enable-source-maps .\artifacts\api-server\dist\index.mjs
