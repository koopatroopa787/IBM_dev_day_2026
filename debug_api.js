const fs = require('fs');
fs.writeFileSync('debug_log.txt', 'Script started\n');
function log(msg) {
    console.log(msg);
    fs.appendFileSync('debug_log.txt', msg + '\n');
}


const CONFIG = {
    // 🚨 SECURITY: Please rotate this key after you finish debugging!
    IAM_API_KEY: "kDJQtSxFlOfifFxwYTBwQd4c9CEHvxpsBgdD3br109dC",
    SERVICE_URL: "https://api.ca-tor.watson-orchestrate.cloud.ibm.com/instances/0eb31d76-997c-4c97-ba32-f0a0ef56e2d2/v1/orchestrate/runs",
    AGENT_ID: "5f4ace24-c16e-42e1-9df2-ce949f96683f"
};

// Dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

let tokenCache = { token: null, expiry: 0 };

async function getAuthToken() {
    if (tokenCache.token && Date.now() < tokenCache.expiry) {
        return tokenCache.token;
    }
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
    params.append('apikey', CONFIG.IAM_API_KEY);
    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Auth failed: ${JSON.stringify(data)}`);
    }
    tokenCache.token = data.access_token;
    tokenCache.expiry = Date.now() + (data.expires_in - 300) * 1000;
    return data.access_token;
}

async function run() {
    const message = "High latency detected in payment service";
    log(`Sending message: "${message}"`);

    try {
        const token = await getAuthToken();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // 1. Start Run
        log("1. Starting Orchestration...");
        const runResponse = await fetch(CONFIG.SERVICE_URL, {
            method: 'POST', headers: headers,
            body: JSON.stringify({ agent_id: CONFIG.AGENT_ID, message: { role: 'user', content: message } })
        });
        const runData = await runResponse.json();

        if (!runResponse.ok) {
            log("Run start failed:", runData);
            return;
        }

        // 2. Poll Loop
        if (runData.run_id && runData.thread_id) {
            log(`2. Run ID: ${runData.run_id}. Waiting for completion...`);
            let status = 'processing';
            let elapsed = 0;

            while (status !== 'completed' && elapsed < 120000) {
                await new Promise(r => setTimeout(r, 3000));
                elapsed += 3000;
                const statusResp = await fetch(`${CONFIG.SERVICE_URL}/${runData.run_id}`, { headers });
                const statusData = await statusResp.json();
                status = statusData.status;
                log(`   [${elapsed / 1000}s] Status: ${status}...`);
                if (['failed', 'cancelled', 'expired'].includes(status)) throw new Error(`Run ended with: ${status}`);
            }
            log(`\n   Run Completed in ${elapsed / 1000} seconds.`);

            // 3. Fetch History
            const msgResponse = await fetch(CONFIG.SERVICE_URL.replace('/runs', `/threads/${runData.thread_id}/messages`), { method: 'GET', headers: headers });
            const msgData = await msgResponse.json();

            // Write to file
            const outputFile = 'api_response_dump.json';
            fs.writeFileSync(outputFile, JSON.stringify(msgData, null, 2));
            log(`Full response dumped to ${outputFile}`);
        } else {
            log("Did not receive run_id/thread_id", runData);
        }
    } catch (error) {
        log(`\nError:`, error.message);
    }
}

run();
