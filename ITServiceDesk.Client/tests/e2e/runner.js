import { spawn, execSync } from 'child_process';
// import http from 'http';

const SQL_CONTAINER_NAME = 'itservicedesk-e2e-sql';
const API_PORT = 5200;
const FRONTEND_PORT = 4173;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanup(apiPid, previewPid) {
  console.log('Cleaning up processes and containers...');
  try {
    if (process.platform === 'win32') {
      if (apiPid) execSync(`taskkill /pid ${apiPid} /T /F 2>nul`);
      if (previewPid) execSync(`taskkill /pid ${previewPid} /T /F 2>nul`);
    } else {
      if (apiPid) execSync(`kill -9 ${apiPid} 2>nul`);
      if (previewPid) execSync(`kill -9 ${previewPid} 2>nul`);
    }
  } catch {
    // Ignore errors during cleanup
  }
  
  try {
    execSync(`docker rm -f ${SQL_CONTAINER_NAME} 2>nul`);
  } catch {
    // Ignore container removal error
  }
}

async function checkApiReadiness() {
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://localhost:${API_PORT}/api/Auth/login`, { method: 'GET' });
      // We expect 405 Method Not Allowed or 400 Bad Request, but getting any response means API is up
      if (res.status !== 0) {
        console.log(`API is ready (Status: ${res.status}).`);
        return true;
      }
    } catch {
      // API not ready yet
    }
    await sleep(1000);
  }
  return false;
}

async function checkFrontendReadiness() {
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://localhost:${FRONTEND_PORT}/`);
      if (res.status === 200) {
        console.log('Frontend is ready.');
        return true;
      }
    } catch {
      // Frontend not ready yet
    }
    await sleep(1000);
  }
  return false;
}

async function run() {
  // 1. Initial cleanup
  cleanup();
  
  try {
    // 2. Start SQL Server
    console.log('Starting SQL Server container...');
    execSync(`docker run -d --name ${SQL_CONTAINER_NAME} -p 1433:1433 -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Test!E2E!Password123" mcr.microsoft.com/mssql/server:2022-latest`, { stdio: 'inherit' });
    
    // Connection string
    const connectionString = 'Server=localhost,1433;Database=ITServiceDesk_E2E;User Id=sa;Password=Test!E2E!Password123;TrustServerCertificate=true;';
    
    // 3. Build API (prevents stale binary execution)
    console.log('Building API...');
    execSync(`dotnet build ../ITServiceDesk.API -c Release --nologo -v q`, {
      stdio: 'inherit'
    });
    console.log('API build succeeded.');

    // 4. Run E2ESetup to migrate and seed DB
    console.log('Running E2ESetup to migrate and seed DB...');
    execSync(`dotnet run --project ../tests/ITServiceDesk.E2ESetup`, {
      env: { ...process.env, ConnectionStrings__DefaultConnection: connectionString },
      stdio: 'inherit'
    });
    
    // 5. Start API (using pre-built binary)
    console.log('Starting API...');
    const apiProcess = spawn('dotnet', ['run', '--project', '../ITServiceDesk.API', '--no-launch-profile', '--urls', `http://localhost:${API_PORT}`, '--no-build', '-c', 'Release'], {
      env: { ...process.env, ConnectionStrings__DefaultConnection: connectionString, JWT_SECRET: 'E2ESuperSecretKey123!_LongEnoughKeyForJWT_256Bits', ASPNETCORE_ENVIRONMENT: 'E2E' },
      stdio: 'inherit',
      shell: true
    });
    
    const isApiReady = await checkApiReadiness();
    if (!isApiReady) {
      throw new Error('API failed to start in time.');
    }
    
    // 6. Build and Start Frontend
    console.log('Building Frontend...');
    execSync(`npm run build`, {
      env: { ...process.env, VITE_API_URL: `http://localhost:${API_PORT}` },
      stdio: 'inherit',
      shell: true
    });
    
    console.log('Starting Frontend Preview...');
    const frontendProcess = spawn('npm', ['run', 'preview', '--', '--port', FRONTEND_PORT], {
      stdio: 'inherit',
      shell: true
    });
    
    const isFrontendReady = await checkFrontendReadiness();
    if (!isFrontendReady) {
      throw new Error('Frontend failed to start in time.');
    }
    
    const e2eProcess = spawn('npx', ['playwright', 'test'], { stdio: 'inherit', shell: true });
    
    e2eProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Playwright tests finished successfully.');
        process.exitCode = 0;
      } else {
        console.error(`E2E run failed with code ${code}`);
        process.exitCode = 1;
      }
      cleanup(apiProcess?.pid, frontendProcess?.pid);
    });
    
  } catch (error) {
    console.error('E2E run failed:', error.message);
    process.exitCode = 1;
    cleanup();
  }
}

run();
